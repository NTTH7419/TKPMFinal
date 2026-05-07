import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { WorkshopService } from '../workshop/workshop.service';
import { REDIS_KEYS, WorkshopStatus } from '@unihub/shared';
import { CreateRegistrationDto } from './dto/create-registration.dto';

const QR_EXPIRY_BUFFER_MINUTES = 30;

@Injectable()
export class RegistrationService {
  constructor(
    private prisma: PrismaService,
    private workshopService: WorkshopService,
    @InjectQueue('expire-hold') private expireHoldQueue: Queue,
  ) {}

  // ─── Task 4.2 + 4.3 + 4.4 + 4.5 + 4.6: POST /registrations ─────────────────
  async register(userId: string, dto: CreateRegistrationDto) {
    // ── Task 4.6: Idempotency check ──
    const existing = await this.prisma.registration.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existing) return existing; // return cached result

    // ── Task 4.2: Validate student record ──
    const student = await this.prisma.student.findFirst({
      where: { userId, status: 'ACTIVE' },
    });
    if (!student) {
      throw new ForbiddenException('STUDENT_NOT_VERIFIED');
    }

    // ── Task 4.3: Row-lock transaction ──
    return this.prisma.$transaction(async (tx) => {
      // SELECT ... FOR UPDATE — row-level lock prevents concurrent double-booking
      const workshop = await tx.$queryRaw<
        Array<{
          id: string;
          status: string;
          capacity: number;
          confirmed_count: number;
          held_count: number;
          fee_type: string;
          price: number | null;
          ends_at: Date;
        }>
      >`SELECT id, status, capacity, confirmed_count, held_count, fee_type, price, ends_at
        FROM workshops
        WHERE id = ${dto.workshopId}
        FOR UPDATE`;

      if (!workshop.length) throw new NotFoundException('Workshop not found');
      const w = workshop[0];

      if (w.status !== WorkshopStatus.OPEN) {
        throw new BadRequestException('Workshop is not open for registration');
      }

      const usedSeats = w.confirmed_count + w.held_count;
      if (usedSeats >= w.capacity) {
        throw new ConflictException('No seats available');
      }

      // Check duplicate active registration
      const duplicate = await tx.registration.findFirst({
        where: {
          workshopId: dto.workshopId,
          studentId: student.id,
          status: { in: ['PENDING_PAYMENT', 'CONFIRMED'] },
        },
      });
      if (duplicate) {
        throw new ConflictException('Already registered for this workshop');
      }

      const isFree = w.fee_type === 'FREE';

      if (isFree) {
        // ── Task 4.4: FREE workshop — CONFIRMED immediately ──
        const qrHash = this.generateQrHash({
          workshopId: dto.workshopId,
          studentId: student.id,
          expiresAt: new Date(w.ends_at.getTime() + QR_EXPIRY_BUFFER_MINUTES * 60 * 1000),
        });

        const [registration] = await Promise.all([
          tx.registration.create({
            data: {
              workshopId: dto.workshopId,
              studentId: student.id,
              status: 'CONFIRMED',
              idempotencyKey: dto.idempotencyKey,
              qrTokenHash: qrHash,
            },
          }),
          tx.workshop.update({
            where: { id: dto.workshopId },
            data: { confirmedCount: { increment: 1 } },
          }),
        ]);

        // Publish seat update via Redis Pub/Sub (fire and forget)
        this.workshopService.publishSeatUpdate(dto.workshopId).catch(() => {});

        return registration;
      } else {
        // ── Task 4.5: PAID workshop — PENDING_PAYMENT + hold 10 min ──
        const holdExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        const [registration] = await Promise.all([
          tx.registration.create({
            data: {
              workshopId: dto.workshopId,
              studentId: student.id,
              status: 'PENDING_PAYMENT',
              holdExpiresAt,
              idempotencyKey: dto.idempotencyKey,
            },
          }),
          tx.workshop.update({
            where: { id: dto.workshopId },
            data: { heldCount: { increment: 1 } },
          }),
        ]);

        this.workshopService.publishSeatUpdate(dto.workshopId).catch(() => {});

        // ── Task 4.10: Enqueue delayed expire-hold job ──
        await this.expireHoldQueue.add(
          'expire-hold',
          { registrationId: registration.id, workshopId: dto.workshopId },
          {
            delay: 10 * 60 * 1000, // 10 minutes
            jobId: `expire-hold:${registration.id}`,
            removeOnComplete: true,
            removeOnFail: false,
          },
        );

        return registration;
      }
    });
  }

  // ─── Task 4.8: GET /me/registrations ─────────────────────────────────────────
  async getMyRegistrations(userId: string) {
    const student = await this.prisma.student.findFirst({ where: { userId } });
    if (!student) return [];

    return this.prisma.registration.findMany({
      where: { studentId: student.id },
      include: {
        workshop: {
          select: {
            id: true,
            title: true,
            speakerName: true,
            roomName: true,
            startsAt: true,
            endsAt: true,
            feeType: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Task 4.9: GET /me/registrations/:id/qr ──────────────────────────────────
  async getQrCode(userId: string, registrationId: string): Promise<string> {
    const student = await this.prisma.student.findFirst({ where: { userId } });
    if (!student) throw new ForbiddenException('STUDENT_NOT_VERIFIED');

    const registration = await this.prisma.registration.findFirst({
      where: { id: registrationId, studentId: student.id },
      include: { workshop: { select: { endsAt: true, title: true } } },
    });

    if (!registration) throw new NotFoundException('Registration not found');
    if (registration.status !== 'CONFIRMED') {
      throw new BadRequestException('QR code only available for confirmed registrations');
    }
    if (!registration.qrTokenHash) {
      throw new BadRequestException('QR code not yet generated');
    }

    // Re-build QR payload so frontend can render it as a QR image
    const expiresAt = new Date(
      registration.workshop.endsAt.getTime() + QR_EXPIRY_BUFFER_MINUTES * 60 * 1000,
    );
    const payload = {
      registrationId: registration.id,
      workshopId: registration.workshopId,
      studentId: registration.studentId,
      expiresAt: expiresAt.toISOString(),
    };
    const payloadStr = JSON.stringify(payload);
    const qrData = Buffer.from(payloadStr).toString('base64url');

    return qrData; // frontend encodes this as a QR code
  }

  // ─── Task 4.7: HMAC-SHA256 QR generation ─────────────────────────────────────
  private generateQrHash(data: {
    workshopId: string;
    studentId: string;
    expiresAt: Date;
  }): string {
    const payload = JSON.stringify({
      ...data,
      expiresAt: data.expiresAt.toISOString(),
    });
    return crypto
      .createHmac('sha256', process.env.HMAC_QR_SECRET!)
      .update(payload)
      .digest('hex');
  }
}
