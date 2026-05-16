import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AiSummaryService } from './ai-summary.service';
import { PrismaService } from '../prisma/prisma.service';
import { SummaryStatus, QUEUE_NAMES } from '@unihub/shared';

const WORKSHOP_ID = 'ws-uuid-1';
const DOC_ID = 'doc-uuid-1';

const mockFile = {
  originalname: 'workshop.pdf',
  buffer: Buffer.from('pdf-content'),
  size: 1024,
  mimetype: 'application/pdf',
} as Express.Multer.File;

function makeQueue(overrides: Record<string, any> = {}) {
  return {
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    getJobs: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function makePrisma(overrides: Record<string, any> = {}) {
  return {
    workshop: {
      findUnique: jest.fn().mockResolvedValue({
        id: WORKSHOP_ID, summaryStatus: 'PENDING', aiSummary: null,
      }),
      update: jest.fn().mockImplementation(({ data }: any) =>
        Promise.resolve({ id: WORKSHOP_ID, ...data }),
      ),
    },
    workshopDocument: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: DOC_ID, workshopId: WORKSHOP_ID, uploadStatus: 'UPLOADED',
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    ...overrides,
  };
}

function makeConfig(overrides: Record<string, string> = {}) {
  return {
    get: jest.fn((key: string, def: string = '') => overrides[key] ?? def),
  };
}

// Mock Supabase so we don't make real HTTP calls
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        upload: jest.fn().mockResolvedValue({ error: null }),
        download: jest.fn().mockResolvedValue({ data: new Blob(['pdf']), error: null }),
      }),
    },
  }),
}));

describe('AiSummaryService', () => {
  let service: AiSummaryService;
  let prisma: ReturnType<typeof makePrisma>;
  let queue: ReturnType<typeof makeQueue>;

  async function build(
    prismaOverrides?: Record<string, any>,
    queueOverrides?: Record<string, any>,
    configOverrides?: Record<string, string>,
  ) {
    prisma = makePrisma(prismaOverrides);
    queue = makeQueue(queueOverrides);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiSummaryService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: makeConfig(configOverrides) },
        { provide: getQueueToken(QUEUE_NAMES.AI_SUMMARY), useValue: queue },
      ],
    }).compile();

    service = module.get<AiSummaryService>(AiSummaryService);
  }

  // ─── 10.2: Upload document ───────────────────────────────────────────────────

  describe('uploadDocument', () => {
    it('creates a document record and enqueues an AI_SUMMARY_REQUESTED job', async () => {
      await build();
      const result = await service.uploadDocument(WORKSHOP_ID, 'user-1', mockFile);

      expect(prisma.workshopDocument.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workshopId: WORKSHOP_ID,
            mimeType: 'application/pdf',
            uploadStatus: 'UPLOADED',
          }),
        }),
      );
      expect(queue.add).toHaveBeenCalledWith(
        'AI_SUMMARY_REQUESTED',
        expect.objectContaining({ workshopId: WORKSHOP_ID, documentId: DOC_ID }),
      );
      expect(result.status).toBe('UPLOADED');
    });

    it('throws NotFoundException when workshop does not exist', async () => {
      await build({ workshop: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn() } });
      await expect(service.uploadDocument('no-ws', 'user-1', mockFile)).rejects.toThrow(NotFoundException);
    });

    it('cancels active processing jobs before starting a new one', async () => {
      const cancelJob = { data: { workshopId: WORKSHOP_ID }, remove: jest.fn().mockResolvedValue(undefined) };
      const queueWithActive = makeQueue({
        getJobs: jest.fn().mockResolvedValue([cancelJob]),
      });
      await build(
        {
          workshopDocument: {
            findFirst: jest.fn().mockResolvedValue({ id: 'old-doc', uploadStatus: 'PROCESSING' }),
            create: jest.fn().mockResolvedValue({ id: DOC_ID, workshopId: WORKSHOP_ID, uploadStatus: 'UPLOADED' }),
            update: jest.fn().mockResolvedValue({}),
          },
        },
        queueWithActive,
      );
      await service.uploadDocument(WORKSHOP_ID, 'user-1', mockFile);
      expect(cancelJob.remove).toHaveBeenCalled();
    });
  });

  // ─── 10.3: Get summary status ────────────────────────────────────────────────

  describe('getSummaryStatus', () => {
    it('returns summaryStatus and aiSummary for existing workshop', async () => {
      await build({
        workshop: {
          findUnique: jest.fn().mockResolvedValue({ id: WORKSHOP_ID, summaryStatus: 'AI_GENERATED', aiSummary: 'Summary text' }),
          update: jest.fn(),
        },
        workshopDocument: {
          findFirst: jest.fn().mockResolvedValue({ id: DOC_ID, originalFilename: 'f.pdf', uploadStatus: 'DONE', errorReason: null, createdAt: new Date().toISOString() }),
          create: jest.fn(),
          update: jest.fn(),
        },
      });

      const result = await service.getSummaryStatus(WORKSHOP_ID);
      expect(result.summaryStatus).toBe('AI_GENERATED');
      expect(result.aiSummary).toBe('Summary text');
    });

    it('throws NotFoundException for missing workshop', async () => {
      await build({ workshop: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn() } });
      await expect(service.getSummaryStatus('no-ws')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── 10.13: Manual summary edit ─────────────────────────────────────────────

  describe('updateSummary', () => {
    it('updates summary and sets status=ADMIN_EDITED when current status is AI_GENERATED', async () => {
      await build({
        workshop: {
          findUnique: jest.fn().mockResolvedValue({ summaryStatus: SummaryStatus.AI_GENERATED }),
          update: jest.fn().mockResolvedValue({ id: WORKSHOP_ID, summaryStatus: SummaryStatus.ADMIN_EDITED, aiSummary: 'Edited' }),
        },
      });

      const result = await service.updateSummary(WORKSHOP_ID, 'Edited');
      expect(prisma.workshop.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { aiSummary: 'Edited', summaryStatus: SummaryStatus.ADMIN_EDITED },
        }),
      );
      expect(result.summaryStatus).toBe(SummaryStatus.ADMIN_EDITED);
    });

    it('allows editing when status is ADMIN_EDITED', async () => {
      await build({
        workshop: {
          findUnique: jest.fn().mockResolvedValue({ summaryStatus: SummaryStatus.ADMIN_EDITED }),
          update: jest.fn().mockResolvedValue({ id: WORKSHOP_ID, summaryStatus: SummaryStatus.ADMIN_EDITED, aiSummary: 'Re-edited' }),
        },
      });
      await expect(service.updateSummary(WORKSHOP_ID, 'Re-edited')).resolves.toBeDefined();
    });

    it('rejects editing when status is PENDING', async () => {
      await build({
        workshop: {
          findUnique: jest.fn().mockResolvedValue({ summaryStatus: SummaryStatus.PENDING }),
          update: jest.fn(),
        },
      });
      await expect(service.updateSummary(WORKSHOP_ID, 'Bad edit')).rejects.toThrow(BadRequestException);
    });

    it('rejects editing when status is SUMMARY_FAILED', async () => {
      await build({
        workshop: {
          findUnique: jest.fn().mockResolvedValue({ summaryStatus: SummaryStatus.SUMMARY_FAILED }),
          update: jest.fn(),
        },
      });
      await expect(service.updateSummary(WORKSHOP_ID, 'Bad edit')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException for missing workshop', async () => {
      await build({ workshop: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn() } });
      await expect(service.updateSummary('no-ws', 'text')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── 10.4–10.9: SUMMARY_FAILED does not affect workshop availability ─────────

  describe('SUMMARY_FAILED isolation', () => {
    it('getSummaryStatus returns SUMMARY_FAILED status without throwing', async () => {
      await build({
        workshop: {
          findUnique: jest.fn().mockResolvedValue({ id: WORKSHOP_ID, summaryStatus: SummaryStatus.SUMMARY_FAILED, aiSummary: null }),
          update: jest.fn(),
        },
        workshopDocument: {
          findFirst: jest.fn().mockResolvedValue({ id: DOC_ID, originalFilename: 'bad.pdf', uploadStatus: 'FAILED', errorReason: 'PDF unreadable', createdAt: new Date().toISOString() }),
          create: jest.fn(),
          update: jest.fn(),
        },
      });

      const result = await service.getSummaryStatus(WORKSHOP_ID);
      expect(result.summaryStatus).toBe(SummaryStatus.SUMMARY_FAILED);
      // workshop record itself is still accessible
    });
  });
});
