import { Test, TestingModule } from '@nestjs/testing';
import { RegistrationService } from './registration.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkshopService } from '../workshop/workshop.service';
import { QueueTokenService } from '../load-protection/queue-token.service';
import { getQueueToken } from '@nestjs/bullmq';
import { ConflictException, ForbiddenException } from '@nestjs/common';

const mockQueueTokenService = {
  consumeToken: jest.fn().mockResolvedValue(undefined),
};

const mockQueue = { add: jest.fn().mockResolvedValue(undefined) };

const mockWorkshopRow = {
  id: 'ws-1',
  status: 'OPEN',
  capacity: 1,
  confirmed_count: 0,
  held_count: 0,
  fee_type: 'FREE',
  price: null,
  ends_at: new Date(Date.now() + 86400_000),
};

const mockStudent = { id: 'student-1', userId: 'user-1', status: 'ACTIVE' };

function makePrisma(overrides: Record<string, any> = {}) {
  return {
    registration: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((args: any) => Promise.resolve({ id: 'reg-1', ...args.data })),
    },
    student: {
      findFirst: jest.fn().mockResolvedValue(mockStudent),
    },
    workshop: {
      update: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn().mockImplementation(async (fn: any) => fn({
      $queryRaw: jest.fn().mockResolvedValue([mockWorkshopRow]),
      registration: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'reg-1', status: 'CONFIRMED', workshopId: 'ws-1', studentId: 'student-1', idempotencyKey: 'key-1', qrTokenHash: 'hash' }),
      },
      workshop: {
        update: jest.fn().mockResolvedValue({}),
      },
    })),
    ...overrides,
  };
}

describe('RegistrationService', () => {
  let service: RegistrationService;
  let prisma: any;

  async function build(prismaOverrides = {}) {
    prisma = makePrisma(prismaOverrides);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationService,
        { provide: PrismaService, useValue: prisma },
        { provide: WorkshopService, useValue: { publishSeatUpdate: jest.fn().mockResolvedValue(undefined) } },
        { provide: QueueTokenService, useValue: mockQueueTokenService },
        { provide: getQueueToken('expire-hold'), useValue: mockQueue },
      ],
    }).compile();
    service = module.get(RegistrationService);
  }

  beforeEach(() => jest.clearAllMocks());

  // ── 4.4: Free workshop → CONFIRMED immediately ──────────────────────────────
  it('should confirm immediately for FREE workshop', async () => {
    await build();
    const result = await service.register('user-1', { workshopId: 'ws-1', idempotencyKey: 'key-1' });
    expect(result.status).toBe('CONFIRMED');
    expect(mockQueue.add).not.toHaveBeenCalled();
  });

  // ── 4.5: Paid workshop → PENDING_PAYMENT + BullMQ job ───────────────────────
  it('should create PENDING_PAYMENT for PAID workshop and enqueue expire-hold', async () => {
    const paidRow = { ...mockWorkshopRow, fee_type: 'PAID', price: 50000 };
    prisma = makePrisma();
    const module = await Test.createTestingModule({
      providers: [
        RegistrationService,
        { provide: PrismaService, useValue: {
          ...prisma,
          $transaction: jest.fn().mockImplementation(async (fn: any) => fn({
            $queryRaw: jest.fn().mockResolvedValue([paidRow]),
            registration: {
              findFirst: jest.fn().mockResolvedValue(null),
              create: jest.fn().mockResolvedValue({ id: 'reg-2', status: 'PENDING_PAYMENT', workshopId: 'ws-1', studentId: 'student-1', idempotencyKey: 'key-2', holdExpiresAt: new Date() }),
            },
            workshop: { update: jest.fn().mockResolvedValue({}) },
          })),
        }},
        { provide: WorkshopService, useValue: { publishSeatUpdate: jest.fn().mockResolvedValue(undefined) } },
        { provide: QueueTokenService, useValue: mockQueueTokenService },
        { provide: getQueueToken('expire-hold'), useValue: mockQueue },
      ],
    }).compile();
    service = module.get(RegistrationService);

    const result = await service.register('user-1', { workshopId: 'ws-1', idempotencyKey: 'key-2' });
    expect(result.status).toBe('PENDING_PAYMENT');
    expect(mockQueue.add).toHaveBeenCalledWith('expire-hold', expect.objectContaining({ registrationId: 'reg-2' }), expect.objectContaining({ delay: 600_000 }));
  });

  // ── 4.6: Idempotency — same key returns cached result ───────────────────────
  it('should return cached registration on duplicate idempotency key', async () => {
    const cached = { id: 'reg-existing', status: 'CONFIRMED', idempotencyKey: 'dup-key' };
    await build({ registration: { findUnique: jest.fn().mockResolvedValue(cached) } });
    const result = await service.register('user-1', { workshopId: 'ws-1', idempotencyKey: 'dup-key' });
    expect(result).toEqual(cached);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  // ── 4.2: Student not verified ─────────────────────────────────────────────
  it('should throw ForbiddenException when student record not found', async () => {
    await build({ student: { findFirst: jest.fn().mockResolvedValue(null) } });
    await expect(
      service.register('user-unknown', { workshopId: 'ws-1', idempotencyKey: 'key-3' }),
    ).rejects.toThrow(ForbiddenException);
  });

  // ── 4.3: Concurrent last seat — second request gets ConflictException ────────
  it('should throw ConflictException when no seats available', async () => {
    const fullRow = { ...mockWorkshopRow, confirmed_count: 1, held_count: 0 }; // capacity=1, used=1
    const paidPrisma = {
      ...makePrisma(),
      $transaction: jest.fn().mockImplementation(async (fn: any) => fn({
        $queryRaw: jest.fn().mockResolvedValue([fullRow]),
        registration: { findFirst: jest.fn() },
        workshop: { update: jest.fn() },
      })),
    };
    await build(paidPrisma);
    await expect(
      service.register('user-1', { workshopId: 'ws-1', idempotencyKey: 'key-4' }),
    ).rejects.toThrow(ConflictException);
  });
});
