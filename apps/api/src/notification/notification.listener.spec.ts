import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { NotificationListener } from './notification.listener';
import { NotificationService } from './notification.service';
import { PrismaService } from '../prisma/prisma.service';

// ─── Task 11.7: Workshop cancelled → all registrants receive EMAIL + IN_APP ───

const WORKSHOP_ID = 'ws-cancel-1';
const REGISTRANTS = [
  { id: 'reg-1', studentId: 'student-1', status: 'CONFIRMED' },
  { id: 'reg-2', studentId: 'student-2', status: 'PENDING_PAYMENT' },
];
const STUDENTS: Record<string, any> = {
  'student-1': {
    id: 'student-1',
    userId: 'user-1',
    fullName: 'Alice',
    user: { email: 'alice@example.com' },
  },
  'student-2': {
    id: 'student-2',
    userId: 'user-2',
    fullName: 'Bob',
    user: { email: 'bob@example.com' },
  },
};

describe('NotificationListener — 11.7 WorkshopCancelled fan-out', () => {
  let listener: NotificationListener;
  let prisma: any;
  let sendQueue: { add: jest.Mock };

  beforeEach(async () => {
    sendQueue = { add: jest.fn().mockResolvedValue({}) };

    prisma = {
      workshop: {
        findUnique: jest.fn().mockResolvedValue({ id: WORKSHOP_ID, title: 'Skills Week' }),
      },
      registration: {
        findMany: jest.fn().mockResolvedValue(
          REGISTRANTS.map((r) => ({ ...r, student: STUDENTS[r.studentId] })),
        ),
      },
      student: {
        findUnique: jest.fn().mockImplementation((args: any) =>
          Promise.resolve(STUDENTS[args.where.id] ?? null),
        ),
      },
      notificationEvent: {
        create: jest.fn().mockImplementation((args: any) =>
          Promise.resolve({ id: `evt-${Math.random().toString(36).slice(2)}`, ...args.data }),
        ),
        update: jest.fn().mockResolvedValue({}),
      },
      notificationDelivery: {
        create: jest.fn().mockImplementation((args: any) =>
          Promise.resolve({ id: `del-${Math.random().toString(36).slice(2)}`, ...args.data }),
        ),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationListener,
        NotificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: getQueueToken('send-notification'), useValue: sendQueue },
      ],
    }).compile();

    listener = module.get(NotificationListener);
  });

  it('notifies ALL registrants (CONFIRMED + PENDING_PAYMENT) when workshop is cancelled', async () => {
    await listener.onWorkshopCancelled({ workshopId: WORKSHOP_ID, title: 'Skills Week' });

    // One notification event per registrant
    const eventCalls = (prisma.notificationEvent.create as jest.Mock).mock.calls;
    expect(eventCalls).toHaveLength(2);
    expect(eventCalls.every((c: any) => c[0].data.eventType === 'WorkshopCancelled')).toBe(true);
  });

  it('sends both EMAIL and IN_APP to each registrant', async () => {
    await listener.onWorkshopCancelled({ workshopId: WORKSHOP_ID, title: 'Skills Week' });

    // 2 registrants × 2 channels = 4 delivery records
    const deliveryCalls = (prisma.notificationDelivery.create as jest.Mock).mock.calls;
    expect(deliveryCalls).toHaveLength(4);

    const channels = deliveryCalls.map((c: any) => c[0].data.channel as string);
    expect(channels.filter((ch) => ch === 'EMAIL')).toHaveLength(2);
    expect(channels.filter((ch) => ch === 'IN_APP')).toHaveLength(2);
  });

  it('enqueues one job per channel per registrant (4 total)', async () => {
    await listener.onWorkshopCancelled({ workshopId: WORKSHOP_ID, title: 'Skills Week' });
    expect(sendQueue.add).toHaveBeenCalledTimes(4);
  });

  it('sends nothing when no active registrants exist', async () => {
    prisma.registration.findMany.mockResolvedValue([]);

    await listener.onWorkshopCancelled({ workshopId: WORKSHOP_ID, title: 'Skills Week' });

    expect(prisma.notificationEvent.create).not.toHaveBeenCalled();
    expect(prisma.notificationDelivery.create).not.toHaveBeenCalled();
    expect(sendQueue.add).not.toHaveBeenCalled();
  });

  it('only queries CONFIRMED and PENDING_PAYMENT registrations', async () => {
    await listener.onWorkshopCancelled({ workshopId: WORKSHOP_ID, title: 'Skills Week' });

    expect(prisma.registration.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workshopId: WORKSHOP_ID,
          status: { in: ['CONFIRMED', 'PENDING_PAYMENT'] },
        }),
      }),
    );
  });
});
