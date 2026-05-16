import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { StudentImportService } from './student-import.service';
import { PrismaService } from '../prisma/prisma.service';

const BATCH_ID = 'batch-uuid-1';
const VALID_CSV = `student_code,email,full_name,faculty
SV001,alice@example.com,Alice Nguyen,IT
SV002,bob@example.com,Bob Tran,Business
SV003,carol@example.com,Carol Le,Engineering`;

const MISSING_HEADER_CSV = `student_code,email
SV001,alice@example.com`;

const INVALID_EMAIL_CSV = `student_code,email,full_name,faculty
SV001,not-an-email,Alice Nguyen,IT`;

const DUPLICATE_CODE_CSV = `student_code,email,full_name,faculty
SV001,alice@example.com,Alice Nguyen,IT
SV001,bob@example.com,Bob Tran,Business`;

function makePrisma(overrides: Record<string, any> = {}) {
  return {
    studentImportBatch: {
      findUnique: jest.fn().mockResolvedValue({
        id: BATCH_ID, filePath: 'students.csv', checksum: 'abc123',
        status: 'PENDING', errorThresholdPct: 20,
      }),
      create: jest.fn().mockImplementation((args: any) =>
        Promise.resolve({ id: BATCH_ID, ...args.data })
      ),
      update: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    studentImportRow: {
      createMany: jest.fn().mockResolvedValue({ count: 3 }),
      updateMany: jest.fn().mockResolvedValue({}),
    },
    student: {
      upsert: jest.fn().mockImplementation((args: any) =>
        Promise.resolve({ id: 'student-' + args.create.studentCode, ...args.create })
      ),
      updateMany: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn().mockImplementation((fn: (tx: any) => Promise<any>) => {
      return fn({
        student: {
          upsert: jest.fn().mockImplementation((args: any) =>
            Promise.resolve({ id: 'student-' + args.create.studentCode, ...args.create })
          ),
          updateMany: jest.fn().mockResolvedValue({}),
        },
        studentImportRow: {
          updateMany: jest.fn().mockResolvedValue({}),
        },
        studentImportBatch: {
          update: jest.fn().mockResolvedValue({}),
        },
      });
    }),
    ...overrides,
  };
}

function makeQueue() {
  return { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };
}

async function buildService(prismaOverrides = {}) {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      StudentImportService,
      { provide: PrismaService, useValue: makePrisma(prismaOverrides) },
      { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('') } },
      { provide: getQueueToken('student-import'), useValue: makeQueue() },
    ],
  }).compile();
  return module.get<StudentImportService>(StudentImportService);
}

// ─── CSV Parsing Tests ────────────────────────────────────────────────────────

describe('parseCsv', () => {
  let service: StudentImportService;
  beforeEach(async () => { service = await buildService(); });

  it('parses all VALID rows from a clean CSV', async () => {
    const rows = await service.parseCsv(VALID_CSV, BATCH_ID);
    expect(rows).toHaveLength(3);
    expect(rows.every(r => r.rowStatus === 'VALID')).toBe(true);
  });

  it('throws on missing required headers', async () => {
    await expect(service.parseCsv(MISSING_HEADER_CSV, BATCH_ID)).rejects.toThrow(/Missing required headers/);
  });

  it('marks rows with invalid email as ERROR', async () => {
    const rows = await service.parseCsv(INVALID_EMAIL_CSV, BATCH_ID);
    expect(rows[0].rowStatus).toBe('ERROR');
    expect(rows[0].errorMessage).toMatch(/email/i);
  });

  it('marks second occurrence of duplicate student_code as DUPLICATE', async () => {
    const rows = await service.parseCsv(DUPLICATE_CODE_CSV, BATCH_ID);
    expect(rows[0].rowStatus).toBe('VALID');
    expect(rows[1].rowStatus).toBe('DUPLICATE');
  });

  it('marks row with missing required field as ERROR', async () => {
    const csv = `student_code,email,full_name,faculty\n,alice@example.com,Alice,IT`;
    const rows = await service.parseCsv(csv, BATCH_ID);
    expect(rows[0].rowStatus).toBe('ERROR');
    expect(rows[0].errorMessage).toMatch(/Missing required fields/);
  });
});

// ─── Threshold Check Tests ────────────────────────────────────────────────────

describe('checkThreshold', () => {
  let service: StudentImportService;
  beforeEach(async () => { service = await buildService(); });

  it('returns true when error rate exceeds threshold', () => {
    const rows = [
      { rowStatus: 'VALID' as const, rowNumber: 1, studentCode: 'A', email: 'a@b.com', fullName: 'A', faculty: 'IT' },
      { rowStatus: 'ERROR' as const, rowNumber: 2, studentCode: 'B', email: 'bad', fullName: 'B', faculty: 'IT', errorMessage: 'err' },
      { rowStatus: 'ERROR' as const, rowNumber: 3, studentCode: 'C', email: 'bad', fullName: 'C', faculty: 'IT', errorMessage: 'err' },
    ];
    expect(service.checkThreshold(rows, 20)).toBe(true); // 66% > 20%
  });

  it('returns false when error rate is below threshold', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      rowStatus: (i < 9 ? 'VALID' : 'ERROR') as 'VALID' | 'ERROR',
      rowNumber: i + 1,
      studentCode: `SV${i}`,
      email: `s${i}@x.com`,
      fullName: `Student ${i}`,
      faculty: 'IT',
      ...(i >= 9 ? { errorMessage: 'bad' } : {}),
    }));
    expect(service.checkThreshold(rows, 20)).toBe(false); // 10% < 20%
  });
});

// ─── processBatch Tests ───────────────────────────────────────────────────────

describe('processBatch', () => {
  it('throws NotFoundException when batch does not exist', async () => {
    const service = await buildService({
      studentImportBatch: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    });
    await expect(service.processBatch('nonexistent')).rejects.toThrow(NotFoundException);
  });

  it('rejects batch when error rate exceeds threshold', async () => {
    const updateMock = jest.fn().mockResolvedValue({});
    const service = await buildService({
      studentImportBatch: {
        findUnique: jest.fn().mockResolvedValue({
          id: BATCH_ID, filePath: 'f.csv', checksum: 'x', status: 'PENDING', errorThresholdPct: 20,
        }),
        update: updateMock,
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      studentImportRow: { createMany: jest.fn().mockResolvedValue({}) },
    });

    // Spy on parseCsv to return mostly-error rows
    jest.spyOn(service, 'parseCsv').mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({
        rowNumber: i + 1,
        studentCode: `SV${i}`,
        email: 'bad',
        fullName: 'X',
        faculty: 'IT',
        rowStatus: 'ERROR' as const,
        errorMessage: 'invalid',
      }))
    );
    // Spy on Supabase download
    jest.spyOn(service as any, 'supabase').mockReturnValue({
      storage: { from: () => ({ download: async () => ({ data: new Blob(['csv']), error: null }) }) },
    });
    jest.spyOn(service as any, 'parseCsv').mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({
        rowNumber: i + 1, studentCode: `SV${i}`, email: 'bad',
        fullName: 'X', faculty: 'IT', rowStatus: 'ERROR' as const, errorMessage: 'err',
      }))
    );

    await service.processBatch(BATCH_ID);
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'REJECTED' }),
    }));
  });
});

// ─── Duplicate File Detection (checksum) ─────────────────────────────────────

describe('scheduleScan — duplicate checksum detection', () => {
  it('skips files whose checksum already exists in studentImportBatch', async () => {
    const createMock = jest.fn();
    const service = await buildService({
      studentImportBatch: {
        findUnique: jest.fn().mockResolvedValue({ id: 'existing-batch' }),
        create: createMock,
        update: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    });

    jest.spyOn(service as any, 'supabase').mockReturnValue({
      storage: {
        from: () => ({
          list: async () => ({ data: [{ name: 'students.csv' }], error: null }),
          download: async () => ({ data: new Blob(['csv content']), error: null }),
        }),
      },
    });

    await service.scheduleScan();
    expect(createMock).not.toHaveBeenCalled();
  });
});
