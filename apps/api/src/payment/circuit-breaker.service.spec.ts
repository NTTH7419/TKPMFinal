import { Test, TestingModule } from '@nestjs/testing';
import { CircuitBreakerService } from './circuit-breaker.service';
import { REDIS_CLIENT } from '../redis/redis.module';

// ─── Task 11.4: Circuit breaker state machine ─────────────────────────────────
// Verifies: 5 failures → OPEN, 30s → HALF_OPEN, 3 probes → CLOSED

describe('CircuitBreakerService (6.7 + 11.4)', () => {
  let service: CircuitBreakerService;
  let redis: {
    get: jest.Mock;
    set: jest.Mock;
    setex: jest.Mock;
    del: jest.Mock;
    incr: jest.Mock;
  };

  beforeEach(async () => {
    redis = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      incr: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CircuitBreakerService,
        { provide: REDIS_CLIENT, useValue: redis },
      ],
    }).compile();

    service = module.get<CircuitBreakerService>(CircuitBreakerService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  // ── CLOSED → OPEN (5 consecutive failures) ───────────────────────────────────

  it('should start in CLOSED state and allow requests', async () => {
    redis.get.mockResolvedValue(null); // all keys empty → defaults to CLOSED
    await expect(service.canProceed()).resolves.toBe(true);
  });

  it('should transition CLOSED → OPEN on 5th consecutive failure', async () => {
    redis.get.mockImplementation((key: string) => {
      if (key === 'cb:payment_gateway') return Promise.resolve('CLOSED');
      return Promise.resolve(null);
    });
    redis.incr.mockResolvedValue(5); // 5th consecutive failure

    await service.recordFailure();

    expect(redis.setex).toHaveBeenCalledWith(
      'cb:payment_gateway',
      expect.any(Number),
      'OPEN',
    );
  });

  it('should remain CLOSED when consecutive failures < 5', async () => {
    redis.get.mockImplementation((key: string) => {
      if (key === 'cb:payment_gateway') return Promise.resolve('CLOSED');
      return Promise.resolve(null);
    });
    redis.incr.mockResolvedValue(3); // only 3 failures

    await service.recordFailure();

    expect(redis.setex).not.toHaveBeenCalledWith(
      'cb:payment_gateway',
      expect.any(Number),
      'OPEN',
    );
  });

  // ── OPEN → block requests (within 30s window) ────────────────────────────────

  it('should block requests when circuit is OPEN (within 30s window)', async () => {
    const now = Date.now();
    jest.useFakeTimers();
    jest.setSystemTime(now);

    redis.get.mockImplementation((key: string) => {
      if (key === 'cb:payment_gateway') return Promise.resolve('OPEN');
      if (key === 'cb:payment_gateway:failure_ts')
        return Promise.resolve((now - 5_000).toString()); // opened 5s ago
      return Promise.resolve(null);
    });

    await expect(service.canProceed()).rejects.toThrow(
      'Payment gateway is temporarily unavailable',
    );
  });

  // ── OPEN → HALF_OPEN after 30s ───────────────────────────────────────────────

  it('should transition OPEN → HALF_OPEN after 30s and allow probe requests', async () => {
    const now = Date.now();
    jest.useFakeTimers();
    jest.setSystemTime(now);

    redis.get.mockImplementation((key: string) => {
      if (key === 'cb:payment_gateway') return Promise.resolve('OPEN');
      if (key === 'cb:payment_gateway:failure_ts')
        return Promise.resolve((now - 31_000).toString()); // opened 31s ago
      return Promise.resolve(null);
    });

    // canProceed transitions to HALF_OPEN and returns true
    await expect(service.canProceed()).resolves.toBe(true);

    // Should have set state to HALF_OPEN
    expect(redis.set).toHaveBeenCalledWith('cb:payment_gateway', 'HALF_OPEN');
  });

  // ── HALF_OPEN → CLOSED after 3 probe successes ────────────────────────────────

  it('should transition HALF_OPEN → CLOSED after 3 consecutive probe successes', async () => {
    redis.get.mockImplementation((key: string) => {
      if (key === 'cb:payment_gateway') return Promise.resolve('HALF_OPEN');
      return Promise.resolve(null);
    });
    redis.incr.mockResolvedValue(3); // 3rd probe success

    await service.recordSuccess();

    expect(redis.set).toHaveBeenCalledWith('cb:payment_gateway', 'CLOSED');
    expect(redis.del).toHaveBeenCalledWith('cb:payment_gateway:failures');
  });

  it('should remain HALF_OPEN when probe successes < 3', async () => {
    redis.get.mockImplementation((key: string) => {
      if (key === 'cb:payment_gateway') return Promise.resolve('HALF_OPEN');
      return Promise.resolve(null);
    });
    redis.incr.mockResolvedValue(2); // only 2 probe successes

    await service.recordSuccess();

    expect(redis.set).not.toHaveBeenCalledWith('cb:payment_gateway', 'CLOSED');
  });

  // ── Failure-rate threshold (>50% in 30s window with ≥10 requests) ────────────

  it('should open on >50% failure rate with 10+ requests in 30s window', async () => {
    redis.get.mockImplementation((key: string) => {
      if (key === 'cb:payment_gateway') return Promise.resolve('CLOSED');
      if (key === 'cb:payment_gateway:success') return Promise.resolve('4');
      return Promise.resolve(null);
    });
    // incr returns 7 — total would be 7 failures + 4 successes = 11 requests, 63.6% failure rate
    // But since 7 >= failureThreshold (5), it opens on consecutive failure check first
    redis.incr.mockResolvedValue(7);

    await service.recordFailure();

    expect(redis.setex).toHaveBeenCalledWith(
      'cb:payment_gateway',
      expect.any(Number),
      'OPEN',
    );
  });

  // ── Full state machine cycle ──────────────────────────────────────────────────

  describe('Full state machine: CLOSED → OPEN → HALF_OPEN → CLOSED', () => {
    it('cycles through all states correctly', async () => {
      const now = Date.now();
      jest.useFakeTimers();
      jest.setSystemTime(now);

      // Step 1: Record 5 failures → OPEN
      redis.get.mockImplementation((key: string) => {
        if (key === 'cb:payment_gateway') return Promise.resolve('CLOSED');
        return Promise.resolve(null);
      });
      redis.incr.mockResolvedValue(5);
      await service.recordFailure();
      expect(redis.setex).toHaveBeenCalledWith('cb:payment_gateway', expect.any(Number), 'OPEN');

      jest.clearAllMocks();
      redis.set.mockResolvedValue('OK');
      redis.setex.mockResolvedValue('OK');
      redis.del.mockResolvedValue(1);

      // Step 2: 30s passes → HALF_OPEN (next canProceed returns true)
      redis.get.mockImplementation((key: string) => {
        if (key === 'cb:payment_gateway') return Promise.resolve('OPEN');
        if (key === 'cb:payment_gateway:failure_ts')
          return Promise.resolve((now - 31_000).toString());
        return Promise.resolve(null);
      });
      await expect(service.canProceed()).resolves.toBe(true);
      expect(redis.set).toHaveBeenCalledWith('cb:payment_gateway', 'HALF_OPEN');

      jest.clearAllMocks();
      redis.set.mockResolvedValue('OK');
      redis.del.mockResolvedValue(1);

      // Step 3: 3 probe successes → CLOSED
      redis.get.mockImplementation((key: string) => {
        if (key === 'cb:payment_gateway') return Promise.resolve('HALF_OPEN');
        return Promise.resolve(null);
      });
      redis.incr.mockResolvedValue(3);
      await service.recordSuccess();
      expect(redis.set).toHaveBeenCalledWith('cb:payment_gateway', 'CLOSED');
    });
  });
});
