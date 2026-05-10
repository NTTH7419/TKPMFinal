import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationListener } from './notification.listener';
import { SendNotificationProcessor } from './send-notification.processor';
import { InAppNotificationChannel } from './channels/in-app.channel';
import { EmailNotificationChannel } from './channels/email.channel';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: 'send-notification' }),
  ],
  providers: [
    NotificationService,
    NotificationListener,
    SendNotificationProcessor,
    // Channel adapters — injected as array via NOTIFICATION_CHANNELS token
    InAppNotificationChannel,
    EmailNotificationChannel,
    {
      provide: 'NOTIFICATION_CHANNELS',
      useFactory: (inApp: InAppNotificationChannel, email: EmailNotificationChannel) => [inApp, email],
      inject: [InAppNotificationChannel, EmailNotificationChannel],
    },
  ],
  controllers: [NotificationController],
  exports: [NotificationService],
})
export class NotificationModule {}
