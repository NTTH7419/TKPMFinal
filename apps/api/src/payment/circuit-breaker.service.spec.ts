import { Test, TestingModule } from '@nestjs/testing';
import { CircuitBreakerService } from './circuit-breaker.service';
import { REDIS_CLIENT } from '../redis/redis.module';

describe('CircuitBreakerService (6.7)', () => {
  let service: CircuitBreakerService;
  let redis: any;

  beforeEach(async () => {
    const mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      incr: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CircuitBreakerService,
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<CircuitBreakerService>(CircuitBreakerService);
    redis = mockRedis;
  });

  describe('Circuit Breaker State Transitions (6.11)', () => {
    it('should start in CLOSED state', async () => {
      redis.client.get.mockResolvedValue(null);
      const canProceed = await service.canProceed();
      expect(canProceed).toBe(true);
    });

    it('should transition from CLOSED to OPEN on 5 consecutive failures', async () => {
      redis.client.get.mockImplementation((key: string) => {
        if (key === 'cb:payment_gateway') return Promise.resolve('CLOSED');
        if (key === 'cb:payment_gateway:failures') return Promise.resolve('4');
        return Promise.resolve(null);
      });

      redis.client.incr.mockResolvedValue(5);

      await service.recordFailure();

      expect(redis.client.setex).toHaveBeenCalledWith(
        'cb:payment_gateway',
        expect.any(Number),
        'OPEN',
      );
    });

    it('should remain CLOSED when failures < threshold', async () => {
      redis.client.get.mockImplementation((key: string) => {
        if (key === 'cb:payment_gateway') return Promise.resolve('CLOSED');
        return Promise.resolve(null);
      });
      redis.client.incr.mockResolvedValue(2);

      await service.recordFailure();

      expect(redis.client.setex).not.toHaveBeenCalledWith(
        'cb:payment_gateway',
        expect.any(Number),
        'OPEN',
      );
    });

    it('should transition from OPEN to HALF_OPEN after timeout', async () => {
      const now = Date.now();
      const openedAt = now - 31000; // Opened 31 seconds ago

      redis.client.get.mockImplementation((key: string) => {
        if (key === 'cb:payment_gateway') return Promise.resolve('OPEN');
        if (key === 'cb:payment_gateway:failure_ts')
          return Promise.resolve(openedAt.toString());
        return Promise.resolve(null);
      });

      // Mock time
      jest.useFakeTimers();
      jest.setSystemTime(now);

      const canProceed = await service.canProceed();

      expect(canProceed).toBe(true); // Half-Open allows probes
      jest.useRealTimers();
    });

    it('should prevent requests when OPEN', async () => {
      const now = Date.now();
      const openedAt = now - 5000; // Opened 5 seconds ago (within 30s window)

      redis.client.get.mockImplementation((key: string) => {
        if (key === 'cb:payment_gateway') return Promise.resolve('OPEN');
        if (key === 'cb:payment_gateway:failure_ts')
          return Promise.resolve(openedAt.toString());
        return Promise.resolve(null);
      });

      jest.useFakeTimers();
      jest.setSystemTime(now);

      try {
        await service.canProceed();
        fail('Should throw ServiceUnavailableException');
      } catch (e) {
        expect(e.message).toContain('Payment gateway is temporarily unavailable');
      }

      jest.useRealTimers();
    });

    it('should transition from HALF_OPEN to CLOSED after 3 successes', async () => {
      redis.client.get.mockImplementation((key: string) => {
        if (key === 'cb:payment_gateway') return Promise.resolve('HALF_OPEN');
        return Promise.resolve(null);
      });

      redis.client.incr.mockResolvedValue(3);

      await service.recordSuccess();

      expect(redis.client.set).toHaveBeenCalledWith(
        'cb:payment_gateway',
        'CLOSED',
      );
      expect(redis.client.del).toHaveBeenCalledWith(
        'cb:payment_gateway:failures',
      );
    });

    it('should remain HALF_OPEN when successes < threshold', async () => {
      redis.client.get.mockImplementation((key: string) => {
        if (key === 'cb:payment_gateway') return Promise.resolve('HALF_OPEN');
        return Promise.resolve(null);
      });

      redis.client.incr.mockResolvedValue(2);

      await service.recordSuccess();

      expect(redis.client.set).not.toHaveBeenCalledWith(
        'cb:payment_gateway',
        'CLOSED',
      );
    });
  });

  describe('Failure Rate Detection', () => {
    it('should open on >50% failure rate with 10+ requests', async () => {
      redis.client.get.mockImplementation((key: string) => {
        if (key === 'cb:payment_gateway') return Promise.resolve('CLOSED');
        if (key === 'cb:payment_gateway:failures') return Promise.resolve('6');
        if (key === 'cb:payment_gateway:success') return Promise.resolve('4');
        return Promise.resolve(null);
      });

      redis.client.incr.mockResolvedValue(7); // 7 failures out of 11 total = 63.6%

      await service.recordFailure();

      // Should have opened due to failure rate
      expect(redis.client.setex).toHaveBeenCalledWith(
        'cb:payment_gateway',
        expect.any(Number),
        'OPEN',
      );
    });
  });
});
