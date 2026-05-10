import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { NotificationChannelAdapter, NotificationPayload } from '../notification-channel.interface';
import { PrismaService } from '../../prisma/prisma.service';

const TEMPLATES: Record<string, { subject: string; buildHtml: (data: Record<string, unknown>) => string }> = {
  registration_confirmed: {
    subject: 'Đăng ký workshop thành công',
    buildHtml: (d) => `
      <h2>Xác nhận đăng ký workshop</h2>
      <p>Bạn đã đăng ký thành công workshop <strong>${d.workshopTitle}</strong>.</p>
      <p>Thời gian: ${d.startsAt}<br/>Phòng: ${d.roomName}</p>
      <p>Mã QR của bạn sẽ hiển thị trong ứng dụng khi đến ngày.</p>
    `,
  },
  registration_expired: {
    subject: 'Đăng ký workshop đã hết hạn',
    buildHtml: (d) => `
      <h2>Đăng ký đã hết hạn</h2>
      <p>Đăng ký của bạn cho workshop <strong>${d.workshopTitle ?? ''}</strong> đã hết hạn vì chưa hoàn tất thanh toán trong 10 phút.</p>
    `,
  },
  workshop_cancelled: {
    subject: 'Workshop đã bị hủy',
    buildHtml: (d) => `
      <h2>Workshop bị hủy</h2>
      <p>Workshop <strong>${d.workshopTitle}</strong> đã bị hủy bởi ban tổ chức.</p>
      <p>Nếu bạn đã thanh toán, vui lòng liên hệ ban tổ chức để được hoàn tiền.</p>
    `,
  },
  workshop_updated: {
    subject: 'Thông tin workshop đã thay đổi',
    buildHtml: (d) => `
      <h2>Cập nhật thông tin workshop</h2>
      <p>Workshop <strong>${d.workshopTitle}</strong> vừa có thay đổi về phòng hoặc thời gian.</p>
      <p>Vui lòng kiểm tra lại thông tin mới trong ứng dụng.</p>
    `,
  },
  payment_failed: {
    subject: 'Thanh toán không thành công',
    buildHtml: (d) => `
      <h2>Thanh toán thất bại</h2>
      <p>Thanh toán cho workshop <strong>${d.workshopTitle ?? ''}</strong> đã thất bại.</p>
      <p>Đăng ký của bạn đã bị hủy. Vui lòng thử đăng ký lại.</p>
    `,
  },
};

const EVENT_TEMPLATE_MAP: Record<string, string> = {
  RegistrationConfirmed: 'registration_confirmed',
  PaymentSucceeded: 'registration_confirmed',
  RegistrationExpired: 'registration_expired',
  WorkshopCancelled: 'workshop_cancelled',
  WorkshopUpdated: 'workshop_updated',
  PaymentFailed: 'payment_failed',
};

@Injectable()
export class EmailNotificationChannel implements NotificationChannelAdapter {
  readonly channel = 'EMAIL';
  private readonly logger = new Logger(EmailNotificationChannel.name);
  private resend: Resend;
  private fromAddress: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
    this.fromAddress = this.config.get<string>('EMAIL_FROM', 'UniHub <noreply@unihub.local>');
  }

  async send(deliveryId: string, payload: NotificationPayload): Promise<void> {
    const templateKey = EVENT_TEMPLATE_MAP[payload.eventType];
    const template = TEMPLATES[templateKey];

    if (!template) {
      await this.prisma.notificationDelivery.update({
        where: { id: deliveryId },
        data: { status: 'FAILED', errorReason: `Missing template for event: ${payload.eventType}`, attemptCount: { increment: 1 } },
      });
      throw new Error(`TEMPLATE_MISSING:${payload.eventType}`);
    }

    try {
      await this.resend.emails.send({
        from: this.fromAddress,
        to: payload.recipientEmail,
        subject: template.subject,
        html: template.buildHtml(payload.data),
      });

      await this.prisma.notificationDelivery.update({
        where: { id: deliveryId },
        data: { status: 'SENT', sentAt: new Date(), attemptCount: { increment: 1 } },
      });

      this.logger.debug(`Email sent to ${payload.recipientEmail} for event ${payload.eventType}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.notificationDelivery.update({
        where: { id: deliveryId },
        data: { status: 'FAILED', errorReason: message, attemptCount: { increment: 1 } },
      });
      throw err;
    }
  }
}
