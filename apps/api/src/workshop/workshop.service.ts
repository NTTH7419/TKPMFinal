import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { REDIS_KEYS, WorkshopStatus, NotificationEventType } from '@unihub/shared';
import { CreateWorkshopDto } from './dto/create-workshop.dto';
import { UpdateWorkshopDto } from './dto/update-workshop.dto';
import { AuditLogService } from '../audit/audit-log.service';

@Injectable()
export class WorkshopService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    @Inject(REDIS_CLIENT) private redis: Redis,
    private auditLog: AuditLogService,
  ) {}

  // ─── Task 3.2: Create workshop ────────────────────────────────────────────────
  async create(dto: CreateWorkshopDto, actorId?: string) {
    const workshop = await this.prisma.workshop.create({
      data: {
        title: dto.title,
        speakerName: dto.speakerName,
        roomName: dto.roomName,
        roomMapUrl: dto.roomMapUrl,
        capacity: dto.capacity,
        feeType: dto.feeType,
        price: dto.price,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        status: WorkshopStatus.DRAFT,
      },
    });

    this.auditLog.log({ action: 'WORKSHOP_CREATED', actorId, targetId: workshop.id, metadata: { title: workshop.title } });

    return workshop;
  }

  // ─── Task 3.3: Update workshop + emit event if room/time changed ──────────────
  async update(id: string, dto: UpdateWorkshopDto, actorId?: string) {
    const existing = await this.findOneOrThrow(id);

    const roomOrTimeChanged =
      (dto.roomName && dto.roomName !== existing.roomName) ||
      (dto.startsAt && dto.startsAt !== existing.startsAt.toISOString()) ||
      (dto.endsAt && dto.endsAt !== existing.endsAt.toISOString());

    const updated = await this.prisma.workshop.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.speakerName && { speakerName: dto.speakerName }),
        ...(dto.roomName && { roomName: dto.roomName }),
        ...(dto.roomMapUrl !== undefined && { roomMapUrl: dto.roomMapUrl }),
        ...(dto.capacity && { capacity: dto.capacity }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.startsAt && { startsAt: new Date(dto.startsAt) }),
        ...(dto.endsAt && { endsAt: new Date(dto.endsAt) }),
      },
    });

    if (roomOrTimeChanged) {
      this.eventEmitter.emit(NotificationEventType.WORKSHOP_UPDATED, {
        workshopId: id,
        changes: { roomName: dto.roomName, startsAt: dto.startsAt, endsAt: dto.endsAt },
      });
      this.auditLog.log({ action: 'WORKSHOP_UPDATED', actorId, targetId: id, metadata: { changes: dto } });
    }

    return updated;
  }

  // ─── Task 3.4: DRAFT → OPEN transition ───────────────────────────────────────
  async open(id: string) {
    const workshop = await this.findOneOrThrow(id);

    if (workshop.status !== WorkshopStatus.DRAFT) {
      throw new BadRequestException(`Cannot open workshop with status: ${workshop.status}`);
    }

    return this.prisma.workshop.update({
      where: { id },
      data: { status: WorkshopStatus.OPEN },
    });
  }

  // ─── Task 3.5: Cancel + emit WorkshopCancelled ────────────────────────────────
  async cancel(id: string, actorId?: string) {
    const workshop = await this.findOneOrThrow(id);

    if (workshop.status === WorkshopStatus.CANCELLED) {
      throw new BadRequestException('Workshop is already cancelled');
    }

    const updated = await this.prisma.workshop.update({
      where: { id },
      data: { status: WorkshopStatus.CANCELLED },
    });

    this.eventEmitter.emit(NotificationEventType.WORKSHOP_CANCELLED, {
      workshopId: id,
      title: workshop.title,
    });
    this.auditLog.log({ action: 'WORKSHOP_CANCELLED', actorId, targetId: id, metadata: { title: workshop.title } });

    return updated;
  }

  // ─── Task 3.6: Public paginated list of OPEN workshops ────────────────────────
  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [workshops, total] = await Promise.all([
      this.prisma.workshop.findMany({
        where: { status: WorkshopStatus.OPEN },
        skip,
        take: limit,
        orderBy: { startsAt: 'asc' },
        select: {
          id: true,
          title: true,
          speakerName: true,
          roomName: true,
          capacity: true,
          confirmedCount: true,
          heldCount: true,
          feeType: true,
          price: true,
          startsAt: true,
          endsAt: true,
          status: true,
          summaryStatus: true,
        },
      }),
      this.prisma.workshop.count({ where: { status: WorkshopStatus.OPEN } }),
    ]);

    return { data: workshops, total, page, limit };
  }

  // ─── Task 3.8+: Admin list (all statuses) ──────────────────────────────────
  async findAllAdmin(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [workshops, total] = await Promise.all([
      this.prisma.workshop.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.workshop.count(),
    ]);

    return { data: workshops, total, page, limit };
  }

  // ─── Task 3.7: Full workshop detail (public) ─────────────────────────────────

  async findOne(id: string) {
    const workshop = await this.prisma.workshop.findUnique({
      where: { id },
    });
    if (!workshop) throw new NotFoundException('Workshop not found');
    return workshop;
  }

  // ─── Task 3.8: Admin stats ────────────────────────────────────────────────────
  async getStats(id: string) {
    await this.findOneOrThrow(id);

    const [totalRegistrations, confirmedCount, pendingPaymentCount, checkinCount, workshop] =
      await Promise.all([
        this.prisma.registration.count({ where: { workshopId: id } }),
        this.prisma.registration.count({
          where: { workshopId: id, status: 'CONFIRMED' },
        }),
        this.prisma.registration.count({
          where: { workshopId: id, status: 'PENDING_PAYMENT' },
        }),
        this.prisma.checkinEvent.count({
          where: { workshopId: id, status: 'ACCEPTED' },
        }),
        this.prisma.workshop.findUniqueOrThrow({
          where: { id },
          select: { capacity: true },
        }),
      ]);

    const utilizationPct =
      workshop.capacity > 0
        ? Math.round((confirmedCount / workshop.capacity) * 100)
        : 0;

    return {
      totalRegistrations,
      confirmedCount,
      pendingPaymentCount,
      checkinCount,
      capacity: workshop.capacity,
      utilizationPct,
    };
  }

  // ─── Shared: publish seat update to Redis Pub/Sub ────────────────────────────
  // Called by RegistrationService and PaymentService after seat count changes
  async publishSeatUpdate(workshopId: string) {
    const workshop = await this.prisma.workshop.findUnique({
      where: { id: workshopId },
      select: { capacity: true, confirmedCount: true, heldCount: true },
    });

    if (!workshop) return;

    const payload = {
      workshopId,
      remainingSeats: Math.max(0, workshop.capacity - workshop.confirmedCount - workshop.heldCount),
      heldCount: workshop.heldCount,
      confirmedCount: workshop.confirmedCount,
    };

    await this.redis.publish(
      REDIS_KEYS.sseSeats(workshopId),
      JSON.stringify(payload),
    );
  }

  private async findOneOrThrow(id: string) {
    const workshop = await this.prisma.workshop.findUnique({ where: { id } });
    if (!workshop) throw new NotFoundException('Workshop not found');
    return workshop;
  }
}
