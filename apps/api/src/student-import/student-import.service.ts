import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createHash } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import * as Papa from 'papaparse';
import { PrismaService } from '../prisma/prisma.service';

const REQUIRED_HEADERS = ['student_code', 'email', 'full_name', 'faculty'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STUDENT_CODE_REGEX = /^[a-zA-Z0-9]+$/;
const BUCKET = 'student-imports';

export interface ParsedRow {
  rowNumber: number;
  studentCode: string;
  email: string;
  fullName: string;
  faculty: string;
  rowStatus: 'VALID' | 'ERROR' | 'DUPLICATE';
  errorMessage?: string;
}

@Injectable()
export class StudentImportService {
  private readonly logger = new Logger(StudentImportService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    @InjectQueue('student-import') private importQueue: Queue,
  ) {}

  private supabase() {
    return createClient(
      this.config.get<string>('SUPABASE_URL', ''),
      this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY', this.config.get<string>('SUPABASE_ANON_KEY', '')),
    );
  }

  // ─── Task 9.2: Nightly cron at 2:00 AM ────────────────────────────────────
  @Cron('0 0 2 * * *')
  async scheduleScan(): Promise<void> {
    this.logger.log('Student import scan started');
    const sb = this.supabase();

    const { data: files, error } = await sb.storage.from(BUCKET).list('', { limit: 100 });
    if (error) {
      this.logger.error('Failed to list files from storage:', error.message);
      return;
    }
    if (!files || files.length === 0) {
      this.logger.log('No files found in student-imports bucket');
      return;
    }

    for (const file of files) {
      if (!file.name.endsWith('.csv')) continue;
      const filePath = file.name;

      // Download file to compute checksum
      const { data: blob, error: dlErr } = await sb.storage.from(BUCKET).download(filePath);
      if (dlErr || !blob) {
        this.logger.warn(`Could not download ${filePath}: ${dlErr?.message}`);
        continue;
      }

      const buffer = Buffer.from(await blob.arrayBuffer());
      const checksum = createHash('sha256').update(buffer).digest('hex');

      // Task 9.2: Skip duplicates by checksum
      const existing = await this.prisma.studentImportBatch.findUnique({ where: { checksum } });
      if (existing) {
        this.logger.log(`Skipping ${filePath} — already imported (batch ${existing.id})`);
        continue;
      }

      // Create batch record and enqueue
      const batch = await this.prisma.studentImportBatch.create({
        data: { filePath, checksum, status: 'PENDING' },
      });
      await this.importQueue.add('process-batch', { batchId: batch.id, filePath });
      this.logger.log(`Enqueued batch ${batch.id} for ${filePath}`);
    }
  }

  // ─── Debug: test Supabase Storage connection ──────────────────────────────
  async debugStorage() {
    const sb = this.supabase();
    const url = this.config.get<string>('SUPABASE_URL', '(not set)');
    const keyHint = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY', '').slice(0, 20) + '...';

    // List all buckets
    const { data: buckets, error: bucketsErr } = await sb.storage.listBuckets();

    // List files in target bucket
    const { data: files, error: filesErr } = await sb.storage.from(BUCKET).list('', { limit: 100 });

    return {
      supabaseUrl: url,
      serviceRoleKeyHint: keyHint,
      targetBucket: BUCKET,
      buckets: buckets?.map(b => b.name) ?? [],
      bucketsError: bucketsErr?.message ?? null,
      filesInBucket: files?.map(f => f.name) ?? [],
      filesError: filesErr?.message ?? null,
    };
  }

  // ─── Debug version of scheduleScan — returns result instead of swallowing ──
  async scheduleScanWithResult(): Promise<{ scanned: string[]; skipped: string[]; enqueued: string[]; error?: string }> {
    const sb = this.supabase();
    const result = { scanned: [] as string[], skipped: [] as string[], enqueued: [] as string[], error: undefined as string | undefined };

    const { data: files, error } = await sb.storage.from(BUCKET).list('', { limit: 100 });
    if (error) {
      result.error = `Failed to list bucket "${BUCKET}": ${error.message}`;
      return result;
    }
    if (!files || files.length === 0) {
      result.error = `Bucket "${BUCKET}" is empty or not found`;
      return result;
    }

    for (const file of files) {
      result.scanned.push(file.name);
      if (!file.name.endsWith('.csv')) continue;

      const { data: blob, error: dlErr } = await sb.storage.from(BUCKET).download(file.name);
      if (dlErr || !blob) {
        result.error = `Download failed for ${file.name}: ${dlErr?.message}`;
        continue;
      }

      const buffer = Buffer.from(await blob.arrayBuffer());
      const checksum = createHash('sha256').update(buffer).digest('hex');
      const existing = await this.prisma.studentImportBatch.findUnique({ where: { checksum } });
      if (existing) {
        result.skipped.push(`${file.name} (checksum already imported as batch ${existing.id})`);
        continue;
      }

      const batch = await this.prisma.studentImportBatch.create({
        data: { filePath: file.name, checksum, status: 'PENDING' },
      });
      await this.importQueue.add('process-batch', { batchId: batch.id, filePath: file.name });
      result.enqueued.push(`${file.name} → batchId: ${batch.id}`);
    }

    return result;
  }

  // ─── Task 9.3 + 9.4: Parse and validate CSV rows ──────────────────────────
  async parseCsv(csvText: string, _batchId: string): Promise<ParsedRow[]> {
    const result = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
    } as Papa.ParseConfig<Record<string, string>>);

    const parseResult = result as Papa.ParseResult<Record<string, string>>;
    const headers: string[] = parseResult.meta.fields ?? [];
    const missingHeaders = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
    }

    const seenCodes = new Set<string>();
    const rows: ParsedRow[] = [];

    for (let i = 0; i < parseResult.data.length; i++) {
      const raw = parseResult.data[i];
      const rowNumber = i + 2; // +2 for 1-indexed + header row
      const studentCode = (raw['student_code'] ?? '').trim();
      const email = (raw['email'] ?? '').trim();
      const fullName = (raw['full_name'] ?? '').trim();
      const faculty = (raw['faculty'] ?? '').trim();

      // Validate required fields
      if (!studentCode || !email || !fullName || !faculty) {
        rows.push({ rowNumber, studentCode, email, fullName, faculty, rowStatus: 'ERROR', errorMessage: 'Missing required fields' });
        continue;
      }

      // Validate student code format
      if (!STUDENT_CODE_REGEX.test(studentCode)) {
        rows.push({ rowNumber, studentCode, email, fullName, faculty, rowStatus: 'ERROR', errorMessage: 'Invalid student code format (alphanumeric only)' });
        continue;
      }

      // Validate email format
      if (!EMAIL_REGEX.test(email)) {
        rows.push({ rowNumber, studentCode, email, fullName, faculty, rowStatus: 'ERROR', errorMessage: 'Invalid email format' });
        continue;
      }

      // Within-batch duplicate detection
      if (seenCodes.has(studentCode)) {
        rows.push({ rowNumber, studentCode, email, fullName, faculty, rowStatus: 'DUPLICATE', errorMessage: `Duplicate student_code in batch` });
        continue;
      }

      seenCodes.add(studentCode);
      rows.push({ rowNumber, studentCode, email, fullName, faculty, rowStatus: 'VALID' });
    }

    return rows;
  }

  // ─── Task 9.5: Threshold check ────────────────────────────────────────────
  checkThreshold(rows: ParsedRow[], thresholdPct: number): boolean {
    if (rows.length === 0) return false;
    const errorCount = rows.filter((r) => r.rowStatus !== 'VALID').length;
    return (errorCount / rows.length) * 100 > thresholdPct;
  }

  // ─── Task 9.6 + 9.7: Atomic promotion + batch report ─────────────────────
  async processBatch(batchId: string): Promise<void> {
    const batch = await this.prisma.studentImportBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new NotFoundException(`Batch ${batchId} not found`);

    // Mark as PROCESSING
    await this.prisma.studentImportBatch.update({
      where: { id: batchId },
      data: { status: 'PROCESSING', startedAt: new Date() },
    });

    const sb = this.supabase();
    const { data: blob, error } = await sb.storage.from(BUCKET).download(batch.filePath);
    if (error || !blob) {
      await this.prisma.studentImportBatch.update({
        where: { id: batchId },
        data: { status: 'FAILED', completedAt: new Date() },
      });
      throw new Error(`Failed to download ${batch.filePath}: ${error?.message}`);
    }

    const csvText = await blob.text();
    let rows: ParsedRow[];

    try {
      rows = await this.parseCsv(csvText, batchId);
    } catch (err: any) {
      // Header validation failure — reject immediately
      await this.prisma.studentImportBatch.update({
        where: { id: batchId },
        data: {
          status: 'REJECTED',
          totalRows: 0,
          validRows: 0,
          errorRows: 0,
          completedAt: new Date(),
        },
      });
      this.logger.warn(`Batch ${batchId} rejected: ${err.message}`);
      return;
    }

    const totalRows = rows.length;
    const validRows = rows.filter((r) => r.rowStatus === 'VALID').length;
    const errorRows = rows.filter((r) => r.rowStatus !== 'VALID').length;

    // Persist import rows for audit
    await this.prisma.studentImportRow.createMany({
      data: rows.map((r) => ({
        batchId,
        rowNumber: r.rowNumber,
        studentCode: r.studentCode,
        email: r.email,
        fullName: r.fullName,
        faculty: r.faculty,
        rowStatus: r.rowStatus,
        errorMessage: r.errorMessage ?? null,
      })),
    });

    // Task 9.5: Threshold check
    if (this.checkThreshold(rows, batch.errorThresholdPct)) {
      await this.prisma.studentImportBatch.update({
        where: { id: batchId },
        data: { status: 'REJECTED', totalRows, validRows, errorRows, completedAt: new Date() },
      });
      this.logger.warn(`Batch ${batchId} rejected — error rate ${((errorRows / totalRows) * 100).toFixed(1)}% exceeds threshold ${batch.errorThresholdPct}%`);
      return;
    }

    // Task 9.6: Atomic promotion — upsert valid rows into students table
    const validRowData = rows.filter((r) => r.rowStatus === 'VALID');
    const validStudentCodes = validRowData.map((r) => r.studentCode);

    await this.prisma.$transaction(async (tx) => {
      for (const row of validRowData) {
        const student = await tx.student.upsert({
          where: { studentCode: row.studentCode },
          create: {
            studentCode: row.studentCode,
            email: row.email,
            fullName: row.fullName,
            faculty: row.faculty,
            status: 'ACTIVE',
            sourceBatchId: batchId,
            lastSeenInImportAt: new Date(),
          },
          update: {
            email: row.email,
            fullName: row.fullName,
            faculty: row.faculty,
            status: 'ACTIVE',
            sourceBatchId: batchId,
            lastSeenInImportAt: new Date(),
          },
        });

        // Link import row to student
        await tx.studentImportRow.updateMany({
          where: { batchId, studentCode: row.studentCode },
          data: { studentId: student.id },
        });
      }

      // Mark absent students as INACTIVE
      await tx.student.updateMany({
        where: {
          sourceBatchId: { not: null },
          studentCode: { notIn: validStudentCodes },
          status: 'ACTIVE',
        },
        data: { status: 'INACTIVE' },
      });

      // Task 9.7: Final batch report
      await tx.studentImportBatch.update({
        where: { id: batchId },
        data: { status: 'PROMOTED', totalRows, validRows, errorRows, completedAt: new Date() },
      });
    });

    this.logger.log(`Batch ${batchId} promoted: ${validRows}/${totalRows} rows`);
  }

  // ─── Task 9.8: List import batches ────────────────────────────────────────
  async listBatches(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.studentImportBatch.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          filePath: true,
          status: true,
          totalRows: true,
          validRows: true,
          errorRows: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.studentImportBatch.count(),
    ]);
    return { data, total, page, limit };
  }

  // ─── Task 9.9: Get batch detail with error rows ───────────────────────────
  async getBatchDetail(batchId: string) {
    const batch = await this.prisma.studentImportBatch.findUnique({
      where: { id: batchId },
      include: {
        rows: {
          orderBy: { rowNumber: 'asc' },
          select: {
            id: true,
            rowNumber: true,
            studentCode: true,
            email: true,
            fullName: true,
            faculty: true,
            rowStatus: true,
            errorMessage: true,
          },
        },
      },
    });
    if (!batch) throw new NotFoundException(`Batch ${batchId} not found`);
    return batch;
  }
}
