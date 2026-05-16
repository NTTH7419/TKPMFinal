import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUE_NAMES, SummaryStatus, STORAGE_BUCKETS, AI_SUMMARY } from '@unihub/shared';

const VI_MAP: Record<string, string> = {
  à:'a',á:'a',â:'a',ã:'a',ä:'a',å:'a',
  è:'e',é:'e',ê:'e',ë:'e',
  ì:'i',í:'i',î:'i',ï:'i',
  ò:'o',ó:'o',ô:'o',õ:'o',ö:'o',
  ù:'u',ú:'u',û:'u',ü:'u',
  ý:'y',ÿ:'y',
  // Vietnamese tones & specific chars
  ắ:'a',ặ:'a',ằ:'a',ẳ:'a',ẵ:'a',
  ấ:'a',ậ:'a',ầ:'a',ẩ:'a',ẫ:'a',
  ă:'a',
  ế:'e',ệ:'e',ề:'e',ể:'e',ễ:'e',
  ố:'o',ộ:'o',ồ:'o',ổ:'o',ỗ:'o',
  ớ:'o',ợ:'o',ờ:'o',ở:'o',ỡ:'o',
  ơ:'o',
  ứ:'u',ự:'u',ừ:'u',ử:'u',ữ:'u',
  ư:'u',
  ị:'i',ỉ:'i',ĩ:'i',
  ọ:'o',ỏ:'o',
  ụ:'u',ủ:'u',ũ:'u',
  ạ:'a',ả:'a',
  ẹ:'e',ẻ:'e',ẽ:'e',
  ỳ:'y',ỵ:'y',ỷ:'y',ỹ:'y',
  đ:'d',
};

function removeVietnamese(str: string): string {
  return str
    .split('')
    .map(c => VI_MAP[c] ?? VI_MAP[c.toLowerCase()]?.toUpperCase() ?? c)
    .join('')
    .toUpperCase();
}

export interface AiSummaryJobData {
  documentId: string;
  workshopId: string;
  filePath: string;
}

@Injectable()
export class AiSummaryService {
  private readonly logger = new Logger(AiSummaryService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    @InjectQueue(QUEUE_NAMES.AI_SUMMARY) private summaryQueue: Queue,
  ) {}

  private supabase() {
    return createClient(
      this.config.get<string>('SUPABASE_URL', ''),
      this.config.get<string>(
        'SUPABASE_SERVICE_ROLE_KEY',
        this.config.get<string>('SUPABASE_ANON_KEY', ''),
      ),
    );
  }

  // Task 10.2: Upload PDF document and enqueue processing job
  async uploadDocument(
    workshopId: string,
    userId: string,
    file: Express.Multer.File,
  ) {
    const workshop = await this.prisma.workshop.findUnique({ where: { id: workshopId } });
    if (!workshop) throw new NotFoundException(`Workshop ${workshopId} not found`);

    // Cancel any active AI processing job for this workshop before starting a new one
    const activeDoc = await this.prisma.workshopDocument.findFirst({
      where: { workshopId, uploadStatus: 'PROCESSING' },
    });
    if (activeDoc) {
      const jobs = await this.summaryQueue.getJobs(['active', 'waiting', 'delayed']);
      for (const job of jobs) {
        if ((job.data as AiSummaryJobData).workshopId === workshopId) {
          await job.remove();
          this.logger.log(`Cancelled active AI job for workshop ${workshopId}`);
        }
      }
      await this.prisma.workshopDocument.update({
        where: { id: activeDoc.id },
        data: { uploadStatus: 'FAILED', errorReason: 'Superseded by new upload' },
      });
    }

    // Upload to Supabase Storage
    const sb = this.supabase();
    const safeFilename = removeVietnamese(file.originalname)
      .replace(/[^a-zA-Z0-9._\-– ]/g, '_')  // keep spaces and dashes for readability
      .replace(/ +/g, ' ')                    // collapse spaces
      .trim()
      .replace(/ /g, '_')                     // final: spaces → underscore
      .replace(/_+/g, '_')
      .slice(0, 100);
    const storagePath = `${workshopId}/${Date.now()}_${safeFilename}`;
    const { error: uploadError } = await sb.storage
      .from(STORAGE_BUCKETS.WORKSHOP_DOCS)
      .upload(storagePath, file.buffer, { contentType: 'application/pdf' });

    if (uploadError) {
      throw new BadRequestException(`Storage upload failed: ${uploadError.message}`);
    }

    // Create workshop_document record — if this fails, clean up the orphan file in Storage
    let doc: { id: string; workshopId: string; uploadStatus: string };
    try {
      doc = await this.prisma.workshopDocument.create({
        data: {
          workshopId,
          uploadedById: userId,
          originalFilename: safeFilename,
          filePath: storagePath,
          fileSizeBytes: file.size,
          mimeType: 'application/pdf',
          uploadStatus: 'UPLOADED',
        },
      });
    } catch (err) {
      // Compensating action: remove the file that was already uploaded
      await sb.storage.from(STORAGE_BUCKETS.WORKSHOP_DOCS).remove([storagePath]).catch(() => {});
      throw err;
    }

    // Reset workshop summary status to PROCESSING
    await this.prisma.workshop.update({
      where: { id: workshopId },
      data: { summaryStatus: SummaryStatus.PROCESSING },
    });

    // Publish AI_SUMMARY_REQUESTED job
    await this.summaryQueue.add(
      'AI_SUMMARY_REQUESTED',
      { documentId: doc.id, workshopId, filePath: storagePath } satisfies AiSummaryJobData,
      { attempts: AI_SUMMARY.MAX_RETRIES, backoff: { type: 'custom' } },
    );

    this.logger.log(`Queued AI summary for workshop ${workshopId}, document ${doc.id}`);
    return { documentId: doc.id, status: doc.uploadStatus };
  }

  // Task 10.3: Return current summary_status and ai_summary
  async getSummaryStatus(workshopId: string) {
    const workshop = await this.prisma.workshop.findUnique({
      where: { id: workshopId },
      select: { id: true, summaryStatus: true, aiSummary: true },
    });
    if (!workshop) throw new NotFoundException(`Workshop ${workshopId} not found`);

    const latestDoc = await this.prisma.workshopDocument.findFirst({
      where: { workshopId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, originalFilename: true, uploadStatus: true, errorReason: true, createdAt: true },
    });

    return {
      summaryStatus: workshop.summaryStatus,
      aiSummary: workshop.aiSummary,
      latestDocument: latestDoc,
    };
  }

  // Task 10.13: Manual edit of ai_summary — only when AI_GENERATED or ADMIN_EDITED
  async updateSummary(workshopId: string, aiSummary: string) {
    const workshop = await this.prisma.workshop.findUnique({
      where: { id: workshopId },
      select: { summaryStatus: true },
    });
    if (!workshop) throw new NotFoundException(`Workshop ${workshopId} not found`);

    const editableStatuses: string[] = [SummaryStatus.AI_GENERATED, SummaryStatus.ADMIN_EDITED];
    if (!editableStatuses.includes(workshop.summaryStatus)) {
      throw new BadRequestException(
        `Summary can only be edited when status is AI_GENERATED or ADMIN_EDITED. Current: ${workshop.summaryStatus}`,
      );
    }

    const updated = await this.prisma.workshop.update({
      where: { id: workshopId },
      data: { aiSummary, summaryStatus: SummaryStatus.ADMIN_EDITED },
      select: { id: true, summaryStatus: true, aiSummary: true },
    });

    return updated;
  }
}
