import {
  Controller,
  Post,
  Body,
  BadRequestException,
  RawBodyRequest,
  Req,
  UnauthorizedException,
  Param,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { Request } from 'express';
import { PaymentService } from './payment.service';

@Controller('payments')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  // ─── Task 6.5 + 6.12: POST /payments/webhook ────────────────────────────────
  @Post('webhook')
  async webhook(@Req() req: RawBodyRequest<Request>): Promise<{ status: string }> {
    const signature = req.headers['x-webhook-signature'] as string;
    console.log('🔔 Webhook received:', { paymentIntentId: (req.body as any)?.paymentIntentId, status: (req.body as any)?.status });

    if (!signature) {
      console.error('❌ Missing webhook signature');
      throw new UnauthorizedException('Missing webhook signature');
    }

    // Verify HMAC signature
    const secret = process.env.HMAC_WEBHOOK_SECRET || 'dev-webhook-secret';
    const payload = req.rawBody || Buffer.from(JSON.stringify(req.body));
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    console.log('🔐 Signature check:', { received: signature.substring(0, 8) + '...', expected: expectedSignature.substring(0, 8) + '...' });

    if (signature !== expectedSignature) {
      console.error('❌ Invalid webhook signature');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Extract webhook data
    const { paymentIntentId, status } = req.body;
    if (!paymentIntentId || !['SUCCEEDED', 'FAILED'].includes(status)) {
      console.error('❌ Invalid payload:', { paymentIntentId, status });
      throw new BadRequestException('Invalid webhook payload');
    }

    // Process webhook (idempotent)
    console.log('✅ Processing webhook:', { paymentIntentId, status });
    try {
      await this.paymentService.handlePaymentWebhook(paymentIntentId, status);
      console.log('✅ Webhook processed successfully');
    } catch (e) {
      console.error('❌ Webhook processing failed:', e);
      throw e;
    }

    return { status: 'ok' };
  }

  // ─── Task 6.4: Mock webhook trigger ──────────────────────────────────────────
  @Post('intent')
  async createPaymentIntent(
    @Body() body: { registrationId: string; idempotencyKey: string },
  ): Promise<{ paymentIntentId: string; paymentUrl: string }> {
    return this.paymentService.createPaymentIntent(
      body.registrationId,
      body.idempotencyKey,
    );
  }

  // ─── Task 6.4: Mock payment endpoint (from Student Web) ──────────────────────
  @Post('mock-payment/pay/:intentId')
  async mockPay(
    @Param('intentId') paymentIntentId: string,
    @Body() body: { status?: string },
  ): Promise<{ status: string }> {
    const status = body.status || 'success';

    // Sign and send webhook to ourselves
    const secret = process.env.HMAC_WEBHOOK_SECRET || 'dev-webhook-secret';
    const webhookPayload = {
      paymentIntentId,
      status: status === 'success' ? 'SUCCEEDED' : 'FAILED',
    };
    const payloadJson = JSON.stringify(webhookPayload);
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payloadJson)
      .digest('hex');

    // Simulate a real webhook call (fire and forget, don't wait)
    this.sendMockWebhook(payloadJson, signature).catch((e) => {
      console.error('Mock webhook send failed:', e);
    });

    return { status: 'ok' };
  }

  private async sendMockWebhook(
    payloadJson: string,
    signature: string,
  ): Promise<void> {
    // Simulate async webhook delivery with a small delay
    await new Promise((r) => setTimeout(r, 100));

    // POST to our own webhook endpoint
    const baseUrl = process.env.API_URL || 'http://localhost:3000';
    try {
      const res = await fetch(`${baseUrl}/payments/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-signature': signature,
        },
        body: payloadJson,
      });
      if (!res.ok) {
        console.error('Mock webhook failed:', await res.text());
      }
    } catch (error) {
      console.error('Mock webhook error:', error);
    }
  }
}
