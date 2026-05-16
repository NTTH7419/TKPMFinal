import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentService } from './payment.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { PrismaService } from '../prisma/prisma.service';

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  incr: jest.fn(),
  del: jest.fn(),
  expire: jest.fn(),
};

describe('PaymentService (6.11)', () => {
  let service: PaymentService;
  let prisma: any;
  let adapter: any;
  let circuitBreaker: CircuitBreakerService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const mockPrisma: any = {
      registration: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      payment: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      workshop: {
        update: jest.fn(),
      },
      $transaction: jest.fn((cb: (tx: any) => any) => cb(mockPrisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        CircuitBreakerService,
        {
          provide: 'PaymentAdapter',
          useValue: {
            createIntent: jest.fn(),
            refund: jest.fn(),
          },
        },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    prisma = mockPrisma;
    adapter = module.get<any>('PaymentAdapter');
    circuitBreaker = module.get<CircuitBreakerService>(CircuitBreakerService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  describe('Payment Idempotency (6.9)', () => {
    it('should return existing payment for duplicate idempotency key', async () => {
      const existingPayment = {
        id: 'p1',
        paymentIntentId: 'intent-123',
        gatewayPayload: { paymentUrl: '/mock-payment/pay/intent-123' },
      };

      prisma.payment.findUnique.mockResolvedValue(existingPayment);

      const result = await service.createPaymentIntent('reg-1', 'idempotency-key');

      expect(result).toEqual({
        paymentIntentId: 'intent-123',
        paymentUrl: '/mock-payment/pay/intent-123',
      });
      expect(adapter.createIntent).not.toHaveBeenCalled();
    });

    it('should create new payment intent for new registration', async () => {
      const registration = {
        id: 'reg-1',
        status: 'PENDING_PAYMENT',
        workshop: { price: 100000, endsAt: new Date() },
      };

      prisma.payment.findUnique.mockResolvedValue(null);
      prisma.registration.findUnique.mockResolvedValue(registration);
      adapter.createIntent.mockResolvedValue({
        paymentIntentId: 'intent-abc',
        paymentUrl: '/mock-payment/pay/intent-abc',
      });
      prisma.payment.create.mockResolvedValue({
        id: 'p1',
        paymentIntentId: 'intent-abc',
        status: 'INITIATED',
      });

      const result = await service.createPaymentIntent('reg-1', 'new-idempotency-key');

      expect(result.paymentIntentId).toBe('intent-abc');
      expect(adapter.createIntent).toHaveBeenCalledWith('reg-1', 100000, 'new-idempotency-key');
      expect(prisma.payment.create).toHaveBeenCalled();
    });
  });

  describe('Duplicate Webhook Handling (6.11)', () => {
    it('should be idempotent for SUCCEEDED status', async () => {
      const payment = {
        id: 'p1',
        status: 'SUCCEEDED',
        paymentIntentId: 'intent-123',
        registration: {
          id: 'reg-1',
          status: 'CONFIRMED',
          workshopId: 'ws-1',
        },
      };

      prisma.payment.findUnique.mockResolvedValue(payment);

      await service.handlePaymentWebhook('intent-123', 'SUCCEEDED');

      // Should return early without updating
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it('should process new SUCCEEDED webhook', async () => {
      const payment = {
        id: 'p1',
        status: 'INITIATED',
        paymentIntentId: 'intent-123',
        amount: 100000,
        registration: {
          id: 'reg-1',
          status: 'PENDING_PAYMENT',
          studentId: 'stud-1',
          workshopId: 'ws-1',
          holdExpiresAt: new Date(Date.now() + 5 * 60 * 1000), // Not expired
          workshop: {
            endsAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
          },
        },
      };

      prisma.payment.findUnique.mockResolvedValue(payment);
      prisma.payment.update.mockResolvedValue({ status: 'SUCCEEDED' });
      prisma.registration.update.mockResolvedValue({ status: 'CONFIRMED' });
      prisma.workshop.update.mockResolvedValue({});

      await service.handlePaymentWebhook('intent-123', 'SUCCEEDED');

      // Should update payment and registration
      expect(prisma.payment.update).toHaveBeenCalled();
      expect(prisma.registration.update).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('payment.succeeded', expect.any(Object));
    });
  });

  describe('Auto-refund (6.6)', () => {
    it('should auto-refund when hold expires after payment succeeds', async () => {
      const payment = {
        id: 'p1',
        paymentIntentId: 'intent-123',
        amount: 100000,
        status: 'INITIATED',
        registration: {
          id: 'reg-1',
          status: 'PENDING_PAYMENT',
          holdExpiresAt: new Date(Date.now() - 5 * 60 * 1000), // Already expired
          workshopId: 'ws-1',
        },
      };

      prisma.payment.findUnique.mockResolvedValue(payment);
      adapter.refund.mockResolvedValue({ refundId: 'ref-1', status: 'SUCCEEDED' });
      prisma.payment.update.mockResolvedValue({ status: 'REFUNDED' });
      prisma.registration.update.mockResolvedValue({ status: 'NEEDS_REVIEW' });

      await service.handlePaymentWebhook('intent-123', 'SUCCEEDED');

      // Should refund
      expect(adapter.refund).toHaveBeenCalledWith('intent-123', 100000, expect.any(String));
      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ data: expect.objectContaining({ status: 'REFUNDED' }) }),
      );
    });
  });

  describe('Payment Failed Webhook (6.12)', () => {
    it('should handle FAILED webhook and release held slot', async () => {
      const payment = {
        id: 'p1',
        status: 'INITIATED',
        paymentIntentId: 'intent-123',
        registration: {
          id: 'reg-1',
          status: 'PENDING_PAYMENT',
          workshopId: 'ws-1',
        },
      };

      prisma.payment.findUnique.mockResolvedValue(payment);
      prisma.payment.update.mockResolvedValue({ status: 'FAILED' });
      prisma.registration.update.mockResolvedValue({ status: 'FAILED' });
      prisma.workshop.update.mockResolvedValue({});

      await service.handlePaymentWebhook('intent-123', 'FAILED');

      expect(prisma.payment.update).toHaveBeenCalledWith(
        { where: { id: 'p1' } },
        { data: { status: 'FAILED' } },
      );
      expect(prisma.registration.update).toHaveBeenCalledWith(
        { where: { id: 'reg-1' } },
        { data: { status: 'FAILED' } },
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith('payment.failed', expect.any(Object));
    });
  });

  describe('Circuit Breaker Integration (6.7, 6.8)', () => {
    it('should record success in circuit breaker', async () => {
      const registration = {
        id: 'reg-1',
        status: 'PENDING_PAYMENT',
        workshop: { price: 100000, endsAt: new Date() },
      };

      jest.spyOn(circuitBreaker, 'canProceed').mockResolvedValue(true);
      jest.spyOn(circuitBreaker, 'recordSuccess').mockResolvedValue(undefined);

      prisma.payment.findUnique.mockResolvedValue(null);
      prisma.registration.findUnique.mockResolvedValue(registration);
      adapter.createIntent.mockResolvedValue({
        paymentIntentId: 'intent-abc',
        paymentUrl: '/mock',
      });
      prisma.payment.create.mockResolvedValue({});

      await service.createPaymentIntent('reg-1', 'idem-key');

      expect(circuitBreaker.recordSuccess).toHaveBeenCalled();
    });

    it('should record failure in circuit breaker', async () => {
      const registration = {
        id: 'reg-1',
        status: 'PENDING_PAYMENT',
        workshop: { price: 100000 },
      };

      jest.spyOn(circuitBreaker, 'canProceed').mockResolvedValue(true);
      jest.spyOn(circuitBreaker, 'recordFailure').mockResolvedValue(undefined);

      prisma.payment.findUnique.mockResolvedValue(null);
      prisma.registration.findUnique.mockResolvedValue(registration);
      adapter.createIntent.mockRejectedValue(new Error('Gateway error'));

      try {
        await service.createPaymentIntent('reg-1', 'idem-key');
      } catch {
        // Expected to throw
      }

      expect(circuitBreaker.recordFailure).toHaveBeenCalled();
    });
  });
});
