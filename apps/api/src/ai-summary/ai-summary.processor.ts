import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse: (buffer: Buffer) => Promise<{ text: string }> = require('pdf-parse');
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from '../prisma/prisma.service';
import { SummaryStatus, STORAGE_BUCKETS, AI_SUMMARY, QUEUE_NAMES } from '@unihub/shared';
import { AiSummaryJobData } from './ai-summary.service';

// Character-based chunk size: ~4 chars per token
const CHARS_PER_CHUNK = AI_SUMMARY.CHUNK_SIZE_TOKENS * 4;

// Backoff delays (ms): 1 min → 5 min → 15 min
function backoffStrategy(attemptsMade: number): number {
  const delays = [60_000, 300_000, 900_000];
  return delays[Math.min(attemptsMade, delays.length - 1)];
}

@Processor(QUEUE_NAMES.AI_SUMMARY, {
  settings: { backoffStrategy },
})
export class AiSummaryProcessor extends WorkerHost {
  private readonly logger = new Logger(AiSummaryProcessor.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    super();
  }

  private supabase() {
    return createClient(
      this.config.get<string>('SUPABASE_URL', ''),
      this.config.get<string>(
        'SUPABASE_SERVICE_ROLE_KEY',
        this.config.get<string>('SUPABASE_ANON_KEY', ''),
      ),
    );
  }

  async process(job: Job<AiSummaryJobData>): Promise<void> {
    const { documentId, workshopId, filePath } = job.data;
    this.logger.log(`Processing AI summary for workshop ${workshopId}, document ${documentId}`);

    await this.prisma.workshopDocument.update({
      where: { id: documentId },
      data: { uploadStatus: 'PROCESSING' },
    });

    try {
      // Filter 1: Extract text from PDF
      const rawText = await this.extractText(filePath);

      // Filter 2: Clean text
      const cleanedText = this.cleanText(rawText);

      // Filter 3: Chunk text
      const chunks = this.chunkText(cleanedText);
      this.logger.log(`Workshop ${workshopId}: ${chunks.length} chunk(s) to summarise`);

      // Filter 4: Call AI model
      const summary = await this.callAi(chunks);

      // Filter 5: Validate output
      this.validateOutput(summary);

      // Task 10.9: Save ai_summary and set status = AI_GENERATED
      await this.prisma.$transaction([
        this.prisma.workshop.update({
          where: { id: workshopId },
          data: { aiSummary: summary, summaryStatus: SummaryStatus.AI_GENERATED },
        }),
        this.prisma.workshopDocument.update({
          where: { id: documentId },
          data: { uploadStatus: 'DONE' },
        }),
      ]);

      this.logger.log(`AI summary saved for workshop ${workshopId}`);
    } catch (err: any) {
      // On final exhaustion, BullMQ calls process one last time before marking failed.
      // We handle persistent failure in the onFailed hook via attemptsMade vs maxAttempts.
      this.logger.error(`AI summary failed for workshop ${workshopId}: ${err.message}`);
      throw err; // Re-throw so BullMQ retries with backoff
    }
  }

  // Task 10.10: Called by BullMQ after all retries are exhausted
  @OnWorkerEvent('failed')
  async onFailed(job: Job<AiSummaryJobData> | undefined, error: Error): Promise<void> {
    if (!job) return;
    const { documentId, workshopId } = job.data;
    const maxAttempts = AI_SUMMARY.MAX_RETRIES;

    if (job.attemptsMade >= maxAttempts) {
      this.logger.error(
        `AI summary permanently failed for workshop ${workshopId} after ${job.attemptsMade} attempts: ${error.message}`,
      );
      await this.prisma.$transaction([
        this.prisma.workshop.update({
          where: { id: workshopId },
          data: { summaryStatus: SummaryStatus.SUMMARY_FAILED },
        }),
        this.prisma.workshopDocument.update({
          where: { id: documentId },
          data: { uploadStatus: 'FAILED', errorReason: error.message },
        }),
      ]);
    }
  }

  // ─── Filter 1: Extract text ───────────────────────────────────────────────
  private async extractText(filePath: string): Promise<string> {
    const sb = this.supabase();
    const { data: blob, error } = await sb.storage
      .from(STORAGE_BUCKETS.WORKSHOP_DOCS)
      .download(filePath);

    if (error || !blob) {
      throw new Error(`Failed to download PDF: ${error?.message ?? 'No data'}`);
    }

    const buffer = Buffer.from(await blob.arrayBuffer());

    let result: { text: string };
    try {
      result = await pdfParse(buffer);
    } catch (err: any) {
      throw new Error(`PDF parse failed (corrupted or encrypted): ${err.message}`);
    }

    if (!result.text || result.text.trim().length === 0) {
      throw new Error('PDF contains no extractable text (scan-only or encrypted)');
    }

    return result.text;
  }

  // ─── Filter 2: Clean text ─────────────────────────────────────────────────
  private cleanText(raw: string): string {
    // Detect and strip repeated header/footer lines (lines appearing 3+ times)
    const lines = raw.split('\n');
    const freq = new Map<string, number>();
    for (const line of lines) {
      const t = line.trim();
      if (t.length > 0) freq.set(t, (freq.get(t) ?? 0) + 1);
    }
    const repeatedLines = new Set(
      [...freq.entries()].filter(([, c]) => c >= 3).map(([l]) => l),
    );

    const filtered = lines
      .filter(l => !repeatedLines.has(l.trim()))
      .join('\n');

    return filtered
      .replace(/\s{3,}/g, '  ')           // collapse excessive whitespace
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // strip control chars only, keep Unicode/Vietnamese
      .replace(/(\n\s*){3,}/g, '\n\n')     // collapse multiple blank lines
      .trim();
  }

  // ─── Filter 3: Chunk ──────────────────────────────────────────────────────
  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    let offset = 0;
    while (offset < text.length) {
      chunks.push(text.slice(offset, offset + CHARS_PER_CHUNK));
      offset += CHARS_PER_CHUNK;
    }
    return chunks;
  }

  // ─── Filter 4: Call AI ────────────────────────────────────────────────────
  private async callAi(chunks: string[]): Promise<string> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY', '');
    if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    const summaries: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const prompt =
        chunks.length === 1
          ? `Summarise the following workshop document in clear, concise paragraphs suitable for students:\n\n${chunks[i]}`
          : `This is part ${i + 1} of ${chunks.length} of a workshop document. Summarise this section:\n\n${chunks[i]}`;

      const result = await Promise.race([
        model.generateContent(prompt),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI call timed out after 30s')), AI_SUMMARY.CALL_TIMEOUT_MS),
        ),
      ]);

      const text = result.response.text();
      summaries.push(text);
    }

    return summaries.join('\n\n');
  }

  // ─── Filter 5: Validate output ────────────────────────────────────────────
  private validateOutput(summary: string): void {
    if (!summary || summary.trim().length < AI_SUMMARY.MIN_OUTPUT_LENGTH) {
      throw new Error(
        `AI output too short: ${summary?.trim().length ?? 0} chars (min ${AI_SUMMARY.MIN_OUTPUT_LENGTH})`,
      );
    }
  }
}
