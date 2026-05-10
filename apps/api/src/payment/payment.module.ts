import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { MockPaymentAdapter } from './mock-payment.adapter';
import { CircuitBreakerService } from './circuit-breaker.service';
import { PaymentReconcileProcessor } from './payment-reconcile.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'payment-reconcile' }),
    ScheduleModule.forRoot(),
  ],
  providers: [
    MockPaymentAdapter,
    CircuitBreakerService,
    PaymentReconcileProcessor,
    PaymentService,
    {
      provide: 'PaymentAdapter',
      useClass: MockPaymentAdapter,
    },
  ],
  controllers: [PaymentController],
  exports: [PaymentService, 'PaymentAdapter'],
})
export class PaymentModule {}
