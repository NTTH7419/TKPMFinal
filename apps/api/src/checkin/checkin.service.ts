import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import type { CheckinEventDto, CheckinSyncResultDto, PreloadRosterDto } from '@unihub/shared';

@Injectable()
export class CheckinService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  // ─── Task 8.4: GET /checkin/preload/:workshopId ───────────────────────────────
  async preload(workshopId: string): Promise<PreloadRosterDto> {
    const workshop = await this.prisma.workshop.findUnique({ where: { id: workshopId } });
    if (!workshop) throw new NotFoundException('Workshop not found');

    const registrations = await this.prisma.registration.findMany({
      where: { workshopId, status: 'CONFIRMED' },
      select: { id: true, studentId: true, qrTokenHash: true },
    });

    return {
      workshopId,
      hmacSecret: this.config.get<string>('HMAC_QR_SECRET', ''),
      roster: registrations.map((r) => ({
        registrationId: r.id,
        studentId: r.studentId,
        qrTokenHash: r.qrTokenHash ?? '',
      })),
    };
  }

  // ─── Tasks 8.10 + 8.11: POST /checkin/sync ───────────────────────────────────
  async sync(staffUserId: string, events: CheckinEventDto[]): Promise<CheckinSyncResultDto[]> {
    const results: CheckinSyncResultDto[] = [];

    for (const event of events) {
      // Idempotency: if this eventId was already synced, return its status
      const existing = await this.prisma.checkinEvent.findUnique({
        where: { eventId: event.eventId },
      });
      if (existing) {
        results.push({ eventId: event.eventId, status: existing.status as CheckinSyncResultDto['status'] });
        continue;
      }

      // Validate that the registration exists and is CONFIRMED for this workshop
      const registration = await this.prisma.registration.findFirst({
        where: { id: event.registrationId, workshopId: event.workshopId, status: 'CONFIRMED' },
      });
      if (!registration) {
        await this.prisma.checkinEvent.create({
          data: {
            eventId: event.eventId,
            registrationId: event.registrationId,
            workshopId: event.workshopId,
            staffUserId,
            deviceId: event.deviceId,
            scannedAt: new Date(event.scannedAt),
            syncedAt: new Date(),
            status: 'INVALID',
          },
        });
        results.push({ eventId: event.eventId, status: 'INVALID', reason: 'Registration not found or not confirmed' });
        continue;
      }

      // Task 8.11: Duplicate resolution — accept earliest scanned_at, mark later as DUPLICATE
      const earlierAccepted = await this.prisma.checkinEvent.findFirst({
        where: { registrationId: event.registrationId, status: 'ACCEPTED' },
        orderBy: { scannedAt: 'asc' },
      });

      let status: string;
      if (earlierAccepted) {
        const newScannedAt = new Date(event.scannedAt);
        if (newScannedAt < earlierAccepted.scannedAt) {
          // This event is earlier — demote the existing accepted event
          await this.prisma.checkinEvent.update({
            where: { id: earlierAccepted.id },
            data: { status: 'DUPLICATE' },
          });
          status = 'ACCEPTED';
        } else {
          status = 'DUPLICATE';
        }
      } else {
        status = 'ACCEPTED';
      }

      await this.prisma.checkinEvent.create({
        data: {
          eventId: event.eventId,
          registrationId: event.registrationId,
          workshopId: event.workshopId,
          staffUserId,
          deviceId: event.deviceId,
          scannedAt: new Date(event.scannedAt),
          syncedAt: new Date(),
          status,
        },
      });

      results.push({ eventId: event.eventId, status: status as CheckinSyncResultDto['status'] });
    }

    return results;
  }
}
