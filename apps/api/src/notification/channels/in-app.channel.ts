import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannelAdapter, NotificationPayload } from '../notification-channel.interface';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InAppNotificationChannel implements NotificationChannelAdapter {
  readonly channel = 'IN_APP';
  private readonly logger = new Logger(InAppNotificationChannel.name);

  constructor(private prisma: PrismaService) {}

  async send(deliveryId: string, _payload: NotificationPayload): Promise<void> {
    await this.prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        attemptCount: { increment: 1 },
      },
    });
    this.logger.debug(`In-app notification delivered: ${deliveryId}`);
  }
}
