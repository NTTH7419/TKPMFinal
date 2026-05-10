import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { NotificationService } from './notification.service';
import { PrismaService } from '../prisma/prisma.service';

// ─── Task 7.10 Tests ──────────────────────────────────────────────────────────

describe('NotificationService', () => {
  let service: NotificationService;
  let prisma: jest.Mocked<Partial<PrismaService>>;
  let sendQueue: { add: jest.Mock };

  const mockEvent = { id: 'evt-1', eventType: 'RegistrationConfirmed', status: 'PENDING' };
  const mockDelivery = { id: 'del-1', eventId: 'evt-1', channel: 'EMAIL', status: 'PENDING' };

  beforeEach(async () => {
    sendQueue = { add: jest.fn().mockResolvedValue({}) };

    prisma = {
      notificationEvent: {
        create: jest.fn().mockResolvedValue(mockEvent),
        update: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      } as any,
      notificationDelivery: {
        create: jest.fn().mockResolvedValue(mockDelivery),
        update: jest.fn().mockResolvedValue({}),
      } as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: getQueueToken('send-notification'), useValue: sendQueue },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  // ── Email failure does NOT roll back registration ──────────────────────────
  it('should enqueue separate jobs per channel without throwing', async () => {
    await expect(
      service.createAndEnqueue('RegistrationConfirmed', 'user-1', { workshopTitle: 'Test' }),
    ).resolves.not.toThrow();

    // Should have created 1 event + 2 delivery records (EMAIL + IN_APP)
    expect((prisma.notificationDelivery!.create as jest.Mock).mock.calls.length).toBe(2);
    expect(sendQueue.add.mock.calls.length).toBe(2);
  });

  // ── Per-channel retry independence ────────────────────────────────────────
  it('should create independent delivery records per channel', async () => {
    await service.createAndEnqueue('RegistrationConfirmed', 'user-1', {});
    const channels = (prisma.notificationDelivery!.create as jest.Mock).mock.calls.map(
      (call: any) => call[0].data.channel,
    );
    expect(channels).toContain('EMAIL');
    expect(channels).toContain('IN_APP');
  });

  // ── RegistrationExpired sends in-app only ─────────────────────────────────
  it('should only create IN_APP delivery for RegistrationExpired', async () => {
    await service.createAndEnqueue('RegistrationExpired', 'user-1', {});
    const channels = (prisma.notificationDelivery!.create as jest.Mock).mock.calls.map(
      (call: any) => call[0].data.channel,
    );
    expect(channels).toEqual(['IN_APP']);
    expect(channels).not.toContain('EMAIL');
  });

  // ── PaymentFailed sends in-app only ──────────────────────────────────────
  it('should only create IN_APP delivery for PaymentFailed', async () => {
    await service.createAndEnqueue('PaymentFailed', 'user-1', {});
    const channels = (prisma.notificationDelivery!.create as jest.Mock).mock.calls.map(
      (call: any) => call[0].data.channel,
    );
    expect(channels).toEqual(['IN_APP']);
  });

  // ── PaymentSucceeded sends email + in-app ────────────────────────────────
  it('should create EMAIL + IN_APP for PaymentSucceeded', async () => {
    await service.createAndEnqueue('PaymentSucceeded', 'user-1', {});
    const channels = (prisma.notificationDelivery!.create as jest.Mock).mock.calls.map(
      (call: any) => call[0].data.channel,
    );
    expect(channels).toContain('EMAIL');
    expect(channels).toContain('IN_APP');
  });

  // ── Duplicate event is handled gracefully (unique constraint violation) ───
  it('should skip delivery creation on unique constraint violation', async () => {
    (prisma.notificationDelivery!.create as jest.Mock).mockRejectedValueOnce(
      new Error('Unique constraint failed'),
    );
    await expect(
      service.createAndEnqueue('RegistrationConfirmed', 'user-1', {}),
    ).resolves.not.toThrow();
  });

  // ── getBackoffDelay returns correct values ────────────────────────────────
  it.each([
    [0, 0],
    [1, 60_000],
    [2, 300_000],
    [3, 1_800_000],
    [4, 7_200_000],
    [99, 7_200_000], // clamped to last value
  ])('backoff delay for attempt %i is %i ms', (attempt, expected) => {
    expect(NotificationService.getBackoffDelay(attempt)).toBe(expected);
  });
});
