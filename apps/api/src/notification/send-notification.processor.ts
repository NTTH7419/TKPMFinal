import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationChannelAdapter, NotificationPayload } from './notification-channel.interface';
import { NotificationService } from './notification.service';

interface SendNotificationJobData {
  deliveryId: string;
  eventId: string;
  channel: string;
  eventType: string;
  recipientUserId: string;
  payload: Record<string, unknown>;
}

// Custom backoff: [immediate, 1m, 5m, 30m, 2h]
export const notificationBackoffStrategy = (attemptsMade: number): number => {
  return NotificationService.getBackoffDelay(attemptsMade);
};

@Processor('send-notification', {
  settings: {
    backoffStrategy: notificationBackoffStrategy,
  },
})
export class SendNotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(SendNotificationProcessor.name);
  private adapters: Map<string, NotificationChannelAdapter> = new Map();

  constructor(
    private prisma: PrismaService,
    @Inject('NOTIFICATION_CHANNELS') channelAdapters: NotificationChannelAdapter[],
  ) {
    super();
    for (const adapter of channelAdapters) {
      this.adapters.set(adapter.channel, adapter);
    }
  }

  async process(job: Job<SendNotificationJobData>): Promise<void> {
    const { deliveryId, channel, eventType, recipientUserId, payload } = job.data;

    // Check if already SENT (idempotent)
    const delivery = await this.prisma.notificationDelivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) {
      this.logger.warn(`Delivery ${deliveryId} not found — skipping`);
      return;
    }

    if (delivery.status === 'SENT' || delivery.status === 'FAILED_PERMANENT') {
      return;
    }

    const adapter = this.adapters.get(channel);
    if (!adapter) {
      this.logger.error(`No adapter for channel: ${channel}`);
      await this.markPermanentFailure(deliveryId, `No adapter for channel: ${channel}`);
      return;
    }

    // Resolve recipient info for the email payload
    const user = await this.prisma.user.findUnique({ where: { id: recipientUserId } });
    const student = await this.prisma.student.findFirst({ where: { userId: recipientUserId } });

    const notifPayload: NotificationPayload = {
      recipientEmail: user?.email ?? '',
      recipientName: student?.fullName ?? user?.email ?? '',
      eventType,
      data: payload,
    };

    // If this is a template-missing error (non-retryable), BullMQ will still retry,
    // but we detect it in the adapter and mark FAILED. Guard here too.
    try {
      await adapter.send(deliveryId, notifPayload);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);

      // Non-retryable: missing template
      if (message.startsWith('TEMPLATE_MISSING:')) {
        await this.markPermanentFailure(deliveryId, message);
        return;
      }

      // If exhausted all attempts → mark permanent failure
      const maxAttempts = job.opts.attempts ?? 5;
      if (job.attemptsMade >= maxAttempts - 1) {
        await this.markPermanentFailure(deliveryId, message);
        return;
      }

      // Otherwise re-throw so BullMQ retries with backoff
      throw err;
    }
  }

  private async markPermanentFailure(deliveryId: string, reason: string): Promise<void> {
    await this.prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data: { status: 'FAILED_PERMANENT', errorReason: reason },
    });
  }
}
