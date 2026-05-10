import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationChannel } from '@unihub/shared';

const EVENT_CHANNEL_MAP: Record<string, NotificationChannel[]> = {
  RegistrationConfirmed: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
  PaymentSucceeded: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
  RegistrationExpired: [NotificationChannel.IN_APP],
  WorkshopCancelled: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
  WorkshopUpdated: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
  PaymentFailed: [NotificationChannel.IN_APP],
};

const BACKOFF_DELAYS_MS = [0, 60_000, 300_000, 1_800_000, 7_200_000];

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('send-notification') private sendQueue: Queue,
  ) {}

  async createAndEnqueue(
    eventType: string,
    recipientUserId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const channels = EVENT_CHANNEL_MAP[eventType];
    if (!channels?.length) {
      this.logger.warn(`No channel mapping for event type: ${eventType}`);
      return;
    }

    // Outbox: create the notification event record
    const event = await this.prisma.notificationEvent.create({
      data: {
        eventType,
        recipientUserId,
        payload: payload as object,
        status: 'PENDING',
      },
    });

    // Create one delivery record per channel, enqueue jobs
    await Promise.all(
      channels.map(async (channel) => {
        let delivery;
        try {
          delivery = await this.prisma.notificationDelivery.create({
            data: { eventId: event.id, channel, status: 'PENDING' },
          });
        } catch (err: unknown) {
          // Unique constraint violation: already exists — skip
          const message = err instanceof Error ? err.message : String(err);
          if (message.includes('Unique constraint')) return;
          throw err;
        }

        await this.sendQueue.add(
          'send-notification',
          {
            deliveryId: delivery.id,
            eventId: event.id,
            channel,
            eventType,
            recipientUserId,
            payload,
          },
          {
            attempts: 5,
            backoff: { type: 'custom' },
            removeOnComplete: true,
            removeOnFail: false,
          },
        );
      }),
    );

    // Mark event as PROCESSED (deliveries enqueued)
    await this.prisma.notificationEvent.update({
      where: { id: event.id },
      data: { status: 'PROCESSED' },
    });
  }

  async getMyNotifications(userId: string) {
    return this.prisma.notificationEvent.findMany({
      where: { recipientUserId: userId },
      include: {
        deliveries: {
          where: { channel: 'IN_APP' },
          select: { status: true, sentAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(userId: string, eventId: string): Promise<void> {
    await this.prisma.notificationEvent.updateMany({
      where: { id: eventId, recipientUserId: userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  // Used by worker to get custom backoff delay
  static getBackoffDelay(attemptsMade: number): number {
    return BACKOFF_DELAYS_MS[Math.min(attemptsMade, BACKOFF_DELAYS_MS.length - 1)];
  }
}
