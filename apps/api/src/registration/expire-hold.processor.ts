import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { WorkshopService } from '../workshop/workshop.service';
import { NotificationEventType } from '@unihub/shared';

interface ExpireHoldJobData {
  registrationId: string;
  workshopId: string;
}

@Processor('expire-hold')
export class ExpireHoldProcessor extends WorkerHost {
  private readonly logger = new Logger(ExpireHoldProcessor.name);

  constructor(
    private prisma: PrismaService,
    private workshopService: WorkshopService,
    private eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<ExpireHoldJobData>): Promise<void> {
    const { registrationId, workshopId } = job.data;

    this.logger.log(`Processing expire-hold for registration ${registrationId}`);

    // Idempotent: only act if still PENDING_PAYMENT
    const registration = await this.prisma.registration.findUnique({
      where: { id: registrationId },
    });

    if (!registration) {
      this.logger.warn(`Registration ${registrationId} not found — skipping`);
      return;
    }

    if (registration.status !== 'PENDING_PAYMENT') {
      this.logger.log(
        `Registration ${registrationId} is already ${registration.status} — skipping`,
      );
      return; // idempotent — already CONFIRMED or CANCELLED
    }

    // Transition PENDING_PAYMENT → EXPIRED + decrement held_count
    await this.prisma.$transaction([
      this.prisma.registration.update({
        where: { id: registrationId },
        data: { status: 'EXPIRED' },
      }),
      this.prisma.workshop.update({
        where: { id: workshopId },
        data: { heldCount: { decrement: 1 } },
      }),
    ]);

    this.logger.log(`Registration ${registrationId} expired — held seat released`);

    // Publish seat update
    this.workshopService.publishSeatUpdate(workshopId).catch(() => {});

    // Emit domain event for Notification module
    this.eventEmitter.emit(NotificationEventType.REGISTRATION_EXPIRED, {
      registrationId,
      workshopId,
      studentId: registration.studentId,
    });
  }
}
