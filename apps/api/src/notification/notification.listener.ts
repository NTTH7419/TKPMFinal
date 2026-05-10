import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';
import { NotificationEventType } from '@unihub/shared';

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  // ── RegistrationConfirmed (free workshop) ─────────────────────────────────────
  @OnEvent(NotificationEventType.REGISTRATION_CONFIRMED)
  async onRegistrationConfirmed(data: { registrationId: string; workshopId: string; studentId: string }) {
    const recipient = await this.resolveStudentUser(data.studentId);
    if (!recipient) return;

    const workshop = await this.prisma.workshop.findUnique({ where: { id: data.workshopId } });

    await this.notificationService.createAndEnqueue(
      NotificationEventType.REGISTRATION_CONFIRMED,
      recipient.userId,
      {
        registrationId: data.registrationId,
        workshopId: data.workshopId,
        workshopTitle: workshop?.title ?? '',
        roomName: workshop?.roomName ?? '',
        startsAt: workshop?.startsAt?.toISOString() ?? '',
      },
    );
  }

  // ── PaymentSucceeded (paid workshop) ─────────────────────────────────────────
  @OnEvent(NotificationEventType.PAYMENT_SUCCEEDED)
  async onPaymentSucceeded(data: { registrationId: string; workshopId: string }) {
    const registration = await this.prisma.registration.findUnique({
      where: { id: data.registrationId },
      include: { workshop: true },
    });
    if (!registration) return;

    const recipient = await this.resolveStudentUser(registration.studentId);
    if (!recipient) return;

    await this.notificationService.createAndEnqueue(
      NotificationEventType.PAYMENT_SUCCEEDED,
      recipient.userId,
      {
        registrationId: data.registrationId,
        workshopId: data.workshopId,
        workshopTitle: registration.workshop.title,
        roomName: registration.workshop.roomName,
        startsAt: registration.workshop.startsAt.toISOString(),
      },
    );
  }

  // ── RegistrationExpired (hold expired) ───────────────────────────────────────
  @OnEvent(NotificationEventType.REGISTRATION_EXPIRED)
  async onRegistrationExpired(data: { registrationId: string; workshopId: string; studentId: string }) {
    const recipient = await this.resolveStudentUser(data.studentId);
    if (!recipient) return;

    const workshop = await this.prisma.workshop.findUnique({ where: { id: data.workshopId } });

    await this.notificationService.createAndEnqueue(
      NotificationEventType.REGISTRATION_EXPIRED,
      recipient.userId,
      {
        registrationId: data.registrationId,
        workshopId: data.workshopId,
        workshopTitle: workshop?.title ?? '',
      },
    );
  }

  // ── PaymentFailed ─────────────────────────────────────────────────────────────
  @OnEvent(NotificationEventType.PAYMENT_FAILED)
  async onPaymentFailed(data: { registrationId: string; workshopId: string }) {
    const registration = await this.prisma.registration.findUnique({
      where: { id: data.registrationId },
      include: { workshop: true },
    });
    if (!registration) return;

    const recipient = await this.resolveStudentUser(registration.studentId);
    if (!recipient) return;

    await this.notificationService.createAndEnqueue(
      NotificationEventType.PAYMENT_FAILED,
      recipient.userId,
      {
        registrationId: data.registrationId,
        workshopId: data.workshopId,
        workshopTitle: registration.workshop.title,
      },
    );
  }

  // ── WorkshopCancelled — fan out to all CONFIRMED/PENDING_PAYMENT registrants ──
  @OnEvent(NotificationEventType.WORKSHOP_CANCELLED)
  async onWorkshopCancelled(data: { workshopId: string; title: string }) {
    await this.fanOutWorkshopEvent(
      NotificationEventType.WORKSHOP_CANCELLED,
      data.workshopId,
      { workshopId: data.workshopId, workshopTitle: data.title },
    );
  }

  // ── WorkshopUpdated — fan out to all CONFIRMED/PENDING_PAYMENT registrants ────
  @OnEvent(NotificationEventType.WORKSHOP_UPDATED)
  async onWorkshopUpdated(data: { workshopId: string; changes: Record<string, unknown> }) {
    const workshop = await this.prisma.workshop.findUnique({ where: { id: data.workshopId } });

    await this.fanOutWorkshopEvent(
      NotificationEventType.WORKSHOP_UPDATED,
      data.workshopId,
      { workshopId: data.workshopId, workshopTitle: workshop?.title ?? '', changes: data.changes },
    );
  }

  // ── Fan-out helper: notify all active registrants for a workshop ──────────────
  private async fanOutWorkshopEvent(
    eventType: string,
    workshopId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const registrations = await this.prisma.registration.findMany({
      where: {
        workshopId,
        status: { in: ['CONFIRMED', 'PENDING_PAYMENT'] },
      },
      include: { student: true },
    });

    await Promise.allSettled(
      registrations.map(async (reg) => {
        const recipient = await this.resolveStudentUser(reg.studentId);
        if (!recipient) return;

        await this.notificationService.createAndEnqueue(eventType, recipient.userId, {
          ...payload,
          registrationId: reg.id,
        });
      }),
    );

    this.logger.log(`Fanned out ${eventType} to ${registrations.length} registrants for workshop ${workshopId}`);
  }

  private async resolveStudentUser(studentId: string): Promise<{ userId: string; email: string; fullName: string } | null> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true },
    });

    if (!student?.userId || !student.user) return null;

    return {
      userId: student.userId,
      email: student.user.email,
      fullName: student.fullName,
    };
  }
}
