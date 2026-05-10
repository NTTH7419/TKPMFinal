import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PaymentAdapter } from './payment-adapter.interface';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MockPaymentAdapter implements PaymentAdapter {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  async createIntent(
    registrationId: string,
    amount: number,
    idempotencyKey: string,
  ): Promise<{
    paymentIntentId: string;
    paymentUrl: string;
  }> {
    // Generate UUID for payment intent
    const paymentIntentId = crypto.randomUUID();

    // Simulate artificial delay to test timeout scenarios (configurable, default 100ms)
    const mockLatencyMs = this.config.get<number>('MOCK_PAYMENT_LATENCY_MS', 100);
    await new Promise((r) => setTimeout(r, mockLatencyMs));

    // Return mock payment URL (frontend will POST to /mock-payment/pay/:intentId)
    const paymentUrl = `/mock-payment/pay/${paymentIntentId}`;

    return {
      paymentIntentId,
      paymentUrl,
    };
  }

  async refund(
    paymentIntentId: string,
    amount: number,
    idempotencyKey: string,
  ): Promise<{
    refundId: string;
    status: string;
  }> {
    // Simulate artificial delay
    const mockLatencyMs = this.config.get<number>('MOCK_PAYMENT_LATENCY_MS', 100);
    await new Promise((r) => setTimeout(r, mockLatencyMs));

    const refundId = crypto.randomUUID();
    return {
      refundId,
      status: 'SUCCEEDED',
    };
  }
}
