import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ServiceUnavailableException,
  Inject,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentAdapter } from './payment-adapter.interface';
import { CircuitBreakerService } from './circuit-breaker.service';
import * as crypto from 'crypto';

const PAYMENT_INTENT_TIMEOUT_MS = 5000; // 5 seconds

@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    @Inject('PaymentAdapter') private paymentAdapter: PaymentAdapter,
    private circuitBreaker: CircuitBreakerService,
    private eventEmitter: EventEmitter2,
  ) {}

  // ─── Task 6.1 + 6.2: Create payment intent ──────────────────────────────────
  async createPaymentIntent(
    registrationId: string,
    idempotencyKey: string,
  ): Promise<{ paymentIntentId: string; paymentUrl: string }> {
    // Check idempotency: if same key exists, return previous result
    const existingPayment = await this.prisma.payment.findUnique({
      where: { idempotencyKey },
    });

    if (existingPayment) {
      const payload = existingPayment.gatewayPayload as any;
      return {
        paymentIntentId: existingPayment.paymentIntentId,
        paymentUrl: payload?.paymentUrl || '',
      };
    }

    // Fetch registration to get amount
    const registration = await this.prisma.registration.findUnique({
      where: { id: registrationId },
      include: { workshop: true },
    });

    if (!registration) {
      throw new NotFoundException('Registration not found');
    }

    if (registration.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException(
        `Cannot create payment for registration in ${registration.status} status`,
      );
    }

    const amount = registration.workshop.price
      ? Number(registration.workshop.price)
      : 0;

    // Check circuit breaker before calling adapter
    const canProceed = await this.circuitBreaker.canProceed();
    if (!canProceed) {
      throw new ServiceUnavailableException(
        'Payment gateway is temporarily unavailable',
      );
    }

    let paymentIntentId: string;
    let paymentUrl: string;

    try {
      // Call adapter with timeout
      const result = (await Promise.race([
        this.paymentAdapter.createIntent(
          registrationId,
          amount,
          idempotencyKey,
        ),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Gateway timeout')),
            PAYMENT_INTENT_TIMEOUT_MS,
          ),
        ) as Promise<{ paymentIntentId: string; paymentUrl: string }>,
      ])) as { paymentIntentId: string; paymentUrl: string };

      paymentIntentId = result.paymentIntentId;
      paymentUrl = result.paymentUrl;

      // Record success in circuit breaker
      await this.circuitBreaker.recordSuccess();
    } catch (error) {
      // Record failure in circuit breaker
      await this.circuitBreaker.recordFailure();
      throw new ServiceUnavailableException(
        'Payment gateway is temporarily unavailable',
      );
    }

    // Persist payment record
    const payment = await this.prisma.payment.create({
      data: {
        registrationId,
        paymentIntentId,
        idempotencyKey,
        gateway: 'mock',
        amount,
        status: 'INITIATED',
        gatewayPayload: { paymentUrl },
      },
    });

    return {
      paymentIntentId: payment.paymentIntentId,
      paymentUrl,
    };
  }

  // ─── Task 6.5: Handle webhook ────────────────────────────────────────────────
  async handlePaymentWebhook(
    paymentIntentId: string,
    status: 'SUCCEEDED' | 'FAILED',
  ): Promise<void> {
    console.log(`💳 Handling payment webhook: ${paymentIntentId} → ${status}`);

    const payment = await this.prisma.payment.findUnique({
      where: { paymentIntentId },
      include: { registration: { include: { workshop: true } } },
    });

    if (!payment) {
      console.error(`❌ Payment not found: ${paymentIntentId}`);
      throw new NotFoundException('Payment not found');
    }

    console.log(`💰 Payment found: status=${payment.status}, registration=${payment.registration?.id}`);

    // Idempotent: if already processed, return
    if (payment.status === status) {
      console.log(`⚠️  Payment already ${status}, returning (idempotent)`);
      return;
    }

    if (status === 'SUCCEEDED') {
      console.log('✅ Calling handlePaymentSucceeded');
      await this.handlePaymentSucceeded(payment);
    } else if (status === 'FAILED') {
      console.log('❌ Calling handlePaymentFailed');
      await this.handlePaymentFailed(payment);
    }
  }

  private async handlePaymentSucceeded(payment: any): Promise<void> {
    const registration = payment.registration;

    // Check if hold has expired
    if (
      registration.holdExpiresAt &&
      new Date() > new Date(registration.holdExpiresAt)
    ) {
      // Hold expired → trigger auto-refund (task 6.6)
      await this.executeAutoRefund(payment, registration);
      return;
    }

    // Normal flow: update payment and registration
    await this.prisma.$transaction(async (tx) => {
      // Update payment status
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'SUCCEEDED' },
      });

      // Update registration status and generate QR
      const expiresAt = new Date(
        registration.workshop.endsAt.getTime() + 30 * 60 * 1000,
      );
      const qrHash = this.generateQrHash({
        registrationId: registration.id,
        workshopId: registration.workshopId,
        studentId: registration.studentId,
        expiresAt,
      });

      await tx.registration.update({
        where: { id: registration.id },
        data: {
          status: 'CONFIRMED',
          qrTokenHash: qrHash,
        },
      });

      // Update workshop seat counts
      await tx.workshop.update({
        where: { id: registration.workshopId },
        data: {
          heldCount: { decrement: 1 },
          confirmedCount: { increment: 1 },
        },
      });
    });

    // Publish seat update
    this.eventEmitter.emit('payment.succeeded', {
      registrationId: registration.id,
      workshopId: registration.workshopId,
    });
  }

  private async handlePaymentFailed(payment: any): Promise<void> {
    const registration = payment.registration;

    // Update payment status
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED' },
    });

    // Update registration status (task 6.12)
    await this.prisma.registration.update({
      where: { id: registration.id },
      data: { status: 'FAILED' },
    });

    // Decrement held count if still holding
    if (registration.status === 'PENDING_PAYMENT') {
      await this.prisma.workshop.update({
        where: { id: registration.workshopId },
        data: { heldCount: { decrement: 1 } },
      });
    }

    // Emit payment failed event for notifications
    this.eventEmitter.emit('payment.failed', {
      registrationId: registration.id,
      workshopId: registration.workshopId,
    });
  }

  // ─── Task 6.6: Auto-refund when hold expires after payment succeeds ─────────
  private async executeAutoRefund(payment: any, registration: any): Promise<void> {
    const refundIdempotencyKey = `refund:${payment.paymentIntentId}`;

    // Check if refund already executed
    const existingRefund = await this.prisma.payment.findFirst({
      where: {
        paymentIntentId: payment.paymentIntentId,
        status: 'REFUNDED',
      },
    });

    if (existingRefund) {
      return;
    }

    try {
      // Call refund with timeout
      await Promise.race([
        this.paymentAdapter.refund(
          payment.paymentIntentId,
          payment.amount,
          refundIdempotencyKey,
        ),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Refund timeout')),
            PAYMENT_INTENT_TIMEOUT_MS,
          ),
        ),
      ]);
    } catch (error) {
      console.error('Auto-refund failed:', error);
    }

    // Update payment status to REFUNDED
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'REFUNDED' },
    });

    // Update registration status to NEEDS_REVIEW
    await this.prisma.registration.update({
      where: { id: registration.id },
      data: { status: 'NEEDS_REVIEW' },
    });
  }

  private generateQrHash(payload: {
    registrationId: string;
    workshopId: string;
    studentId: string;
    expiresAt: Date;
  }): string {
    const secret = process.env.HMAC_QR_SECRET || 'dev-secret';
    const data = JSON.stringify({
      registrationId: payload.registrationId,
      workshopId: payload.workshopId,
      studentId: payload.studentId,
      expiresAt: payload.expiresAt.toISOString(),
    });
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  async markAsRefunded(paymentIntentId: string): Promise<void> {
    await this.prisma.payment.update({
      where: { paymentIntentId },
      data: { status: 'REFUNDED' },
    });
  }
}
