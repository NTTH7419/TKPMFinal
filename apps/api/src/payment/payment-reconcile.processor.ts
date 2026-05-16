import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

// ─── Task 6.10: Payment reconciliation job ────────────────────────────────────
@Injectable()
export class PaymentReconcileProcessor {
  private readonly logger = new Logger(PaymentReconcileProcessor.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  // Run every 15 minutes (0 */15 * * * *)
  @Cron('0 */15 * * * *')
  async reconcile(): Promise<void> {
    this.logger.log('Starting payment reconciliation...');

    try {
      // Query registrations that are PENDING_PAYMENT with hold_expires_at > 30 minutes old
      // AND no corresponding payment with status SUCCEEDED
      const staleRegistrations = await this.prisma.$queryRaw<
        Array<{ id: string; workshopId: string; studentId: string }>
      >`
        SELECT r.id, r.workshop_id as "workshopId", r.student_id as "studentId"
        FROM registrations r
        WHERE r.status = 'PENDING_PAYMENT'
          AND r.hold_expires_at < NOW() - INTERVAL '30 minutes'
          AND NOT EXISTS (
            SELECT 1 FROM payments p
            WHERE p.registration_id = r.id
              AND p.status = 'SUCCEEDED'
          )
      `;

      for (const reg of staleRegistrations) {
        // Update registration status to NEEDS_REVIEW
        await this.prisma.registration.update({
          where: { id: reg.id },
          data: { status: 'NEEDS_REVIEW' },
        });

        // Emit event for admin notification
        this.eventEmitter.emit('registration.needs_review', {
          registrationId: reg.id,
          workshopId: reg.workshopId,
          studentId: reg.studentId,
        });

        this.logger.log(`Marked registration ${reg.id} as NEEDS_REVIEW`);
      }

      this.logger.log(
        `Payment reconciliation completed. Marked ${staleRegistrations.length} registrations as NEEDS_REVIEW`,
      );
    } catch (error) {
      this.logger.error('Payment reconciliation failed:', error);
      throw error;
    }
  }
}
