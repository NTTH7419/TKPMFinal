import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CheckinService } from './checkin.service';
import { PrismaService } from '../prisma/prisma.service';

const HMAC_SECRET = 'test-secret';
const WORKSHOP_ID = 'ws-1';
const REGISTRATION_ID = 'reg-1';
const STUDENT_ID = 'student-1';
const STAFF_ID = 'staff-1';
const DEVICE_ID = 'device-1';

function makeEvent(overrides: Partial<{
  eventId: string; registrationId: string; workshopId: string;
  deviceId: string; scannedAt: string;
}> = {}) {
  return {
    eventId: crypto.randomUUID(),
    registrationId: REGISTRATION_ID,
    workshopId: WORKSHOP_ID,
    deviceId: DEVICE_ID,
    scannedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makePrisma(overrides: Record<string, any> = {}) {
  return {
    workshop: {
      findUnique: jest.fn().mockResolvedValue({ id: WORKSHOP_ID, title: 'Test WS' }),
    },
    registration: {
      findMany: jest.fn().mockResolvedValue([
        { id: REGISTRATION_ID, studentId: STUDENT_ID, qrTokenHash: 'hash-abc' },
      ]),
      findFirst: jest.fn().mockResolvedValue({
        id: REGISTRATION_ID, workshopId: WORKSHOP_ID, status: 'CONFIRMED',
      }),
    },
    checkinEvent: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((args: any) =>
        Promise.resolve({ id: crypto.randomUUID(), ...args.data }),
      ),
      update: jest.fn().mockResolvedValue({}),
    },
    ...overrides,
  };
}

describe('CheckinService', () => {
  let service: CheckinService;
  let prisma: ReturnType<typeof makePrisma>;

  async function build(prismaOverrides = {}) {
    prisma = makePrisma(prismaOverrides);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckinService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(HMAC_SECRET) } },
      ],
    }).compile();
    service = module.get(CheckinService);
  }

  beforeEach(() => jest.clearAllMocks());

  // ── Task 8.4: Preload ─────────────────────────────────────────────────────────
  describe('preload', () => {
    it('should return roster with hmacSecret', async () => {
      await build();
      const result = await service.preload(WORKSHOP_ID);
      expect(result.workshopId).toBe(WORKSHOP_ID);
      expect(result.hmacSecret).toBe(HMAC_SECRET);
      expect(result.roster).toHaveLength(1);
      expect(result.roster[0]).toEqual({
        registrationId: REGISTRATION_ID,
        studentId: STUDENT_ID,
        qrTokenHash: 'hash-abc',
      });
    });

    it('should throw NotFoundException for unknown workshop', async () => {
      await build({ workshop: { findUnique: jest.fn().mockResolvedValue(null) } });
      await expect(service.preload('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  // ── Task 8.10: Sync — basic flow ──────────────────────────────────────────────
  describe('sync', () => {
    it('should accept a valid new check-in event', async () => {
      await build();
      const event = makeEvent();
      const results = await service.sync(STAFF_ID, [event]);
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('ACCEPTED');
      expect(prisma.checkinEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ eventId: event.eventId, status: 'ACCEPTED' }),
        }),
      );
    });

    it('should return existing status for already-synced event (idempotent)', async () => {
      const existingEvent = { id: 'evt-db', eventId: 'event-existing', status: 'ACCEPTED' };
      await build({
        checkinEvent: {
          ...makePrisma().checkinEvent,
          findUnique: jest.fn().mockResolvedValue(existingEvent),
        },
      });
      const results = await service.sync(STAFF_ID, [makeEvent({ eventId: 'event-existing' })]);
      expect(results[0].status).toBe('ACCEPTED');
      expect(prisma.checkinEvent.create).not.toHaveBeenCalled();
    });

    it('should return INVALID for registration not confirmed', async () => {
      await build({
        checkinEvent: {
          ...makePrisma().checkinEvent,
          findUnique: jest.fn().mockResolvedValue(null),
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({}),
        },
        registration: {
          ...makePrisma().registration,
          findFirst: jest.fn().mockResolvedValue(null),
        },
      });
      const results = await service.sync(STAFF_ID, [makeEvent()]);
      expect(results[0].status).toBe('INVALID');
      expect(prisma.checkinEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'INVALID' }) }),
      );
    });

    // ── Task 8.11: Duplicate resolution ──────────────────────────────────────────
    it('should mark second scan as DUPLICATE when earlier ACCEPTED event exists', async () => {
      const earlierEvent = {
        id: 'evt-earlier',
        scannedAt: new Date(Date.now() - 60_000), // 1 min ago
        status: 'ACCEPTED',
      };
      await build({
        checkinEvent: {
          ...makePrisma().checkinEvent,
          findUnique: jest.fn().mockResolvedValue(null),
          findFirst: jest.fn().mockResolvedValue(earlierEvent),
          create: jest.fn().mockResolvedValue({}),
          update: jest.fn().mockResolvedValue({}),
        },
      });
      const event = makeEvent({ scannedAt: new Date().toISOString() });
      const results = await service.sync(STAFF_ID, [event]);
      expect(results[0].status).toBe('DUPLICATE');
      expect(prisma.checkinEvent.update).not.toHaveBeenCalled();
    });

    it('should accept new event and demote earlier one when new scan is earlier', async () => {
      const laterTime = new Date(Date.now() + 60_000);
      const earlierEvent = {
        id: 'evt-later',
        scannedAt: laterTime,
        status: 'ACCEPTED',
      };
      await build({
        checkinEvent: {
          ...makePrisma().checkinEvent,
          findUnique: jest.fn().mockResolvedValue(null),
          findFirst: jest.fn().mockResolvedValue(earlierEvent),
          create: jest.fn().mockResolvedValue({}),
          update: jest.fn().mockResolvedValue({}),
        },
      });
      const event = makeEvent({ scannedAt: new Date().toISOString() }); // earlier
      const results = await service.sync(STAFF_ID, [event]);
      expect(results[0].status).toBe('ACCEPTED');
      expect(prisma.checkinEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'evt-later' }, data: { status: 'DUPLICATE' } }),
      );
    });

    it('should process NEEDS_REVIEW sync events normally', async () => {
      await build();
      const event = makeEvent();
      const results = await service.sync(STAFF_ID, [event]);
      // NEEDS_REVIEW events (from PWA) are validated server-side normally
      expect(results[0].status).toBe('ACCEPTED');
      expect(prisma.checkinEvent.create).toHaveBeenCalled();
    });

    it('should handle empty events array', async () => {
      await build();
      const results = await service.sync(STAFF_ID, []);
      expect(results).toHaveLength(0);
    });
  });
});
