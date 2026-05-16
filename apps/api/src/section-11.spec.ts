/**
 * Section 11 — Integration & End-to-End Scenario Tests
 *
 * Each describe block corresponds to a Section 11 task.
 * Tasks 11.3 / 11.5 / 11.6 are covered by dedicated spec files:
 *   - payment.service.spec.ts  (11.3 auto-refund)
 *   - checkin.service.spec.ts  (11.5 offline E2E)
 *   - student-import.service.spec.ts (11.6 malformed CSV)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, HttpStatus } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Reflector } from '@nestjs/core';

import { RegistrationService } from './registration/registration.service';
import { PrismaService } from './prisma/prisma.service';
import { WorkshopService } from './workshop/workshop.service';
import { QueueTokenService } from './load-protection/queue-token.service';
import { TokenBucketService } from './load-protection/token-bucket.service';
import { RateLimitGuard } from './load-protection/rate-limit.guard';
import { RateLimitTier } from './load-protection/rate-limit.decorator';

// ─── 11.1: Concurrency — exactly 1 seat granted out of 100 simultaneous tries ──

describe('11.1 Concurrency: 100 simultaneous registrations for the last seat', () => {
  let service: RegistrationService;

  const WORKSHOP_ID = 'ws-last-seat';
  const baseWorkshopRow = {
    id: WORKSHOP_ID,
    status: 'OPEN',
    capacity: 1,
    confirmed_count: 0,
    held_count: 0,
    fee_type: 'FREE',
    price: null,
    ends_at: new Date(Date.now() + 86_400_000),
  };

  beforeEach(async () => {
    // Simulate the SELECT FOR UPDATE row-level lock:
    //   - first caller sees the seat available → gets CONFIRMED
    //   - every subsequent caller sees confirmed_count=1 → ConflictException
    let seatGranted = false;

    const mockPrisma = {
      registration: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args: any) =>
          Promise.resolve({ id: crypto.randomUUID(), ...args.data }),
        ),
      },
      student: {
        findFirst: jest.fn().mockResolvedValue({ id: 'student-1', userId: 'user-1', status: 'ACTIVE' }),
      },
      workshop: { update: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn().mockImplementation(async (fn: any) => {
        const row = seatGranted
          ? { ...baseWorkshopRow, confirmed_count: 1 } // seat already taken
          : baseWorkshopRow;
        if (!seatGranted) seatGranted = true;
        return fn({
          $queryRaw: jest.fn().mockResolvedValue([row]),
          registration: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              id: crypto.randomUUID(),
              status: 'CONFIRMED',
            }),
          },
          workshop: { update: jest.fn().mockResolvedValue({}) },
        });
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WorkshopService, useValue: { publishSeatUpdate: jest.fn().mockResolvedValue(undefined) } },
        { provide: QueueTokenService, useValue: { consumeToken: jest.fn().mockResolvedValue(undefined) } },
        { provide: getQueueToken('expire-hold'), useValue: { add: jest.fn().mockResolvedValue(undefined) } },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get(RegistrationService);
  });

  it('exactly 1 registration succeeds; all remaining 99 get ConflictException', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 100 }, (_, i) =>
        service.register('user-1', {
          workshopId: WORKSHOP_ID,
          idempotencyKey: `idem-${i}-${crypto.randomUUID()}`,
        }),
      ),
    );

    const confirmed = results.filter((r) => r.status === 'fulfilled');
    const conflicts = results.filter(
      (r) => r.status === 'rejected' && r.reason instanceof ConflictException,
    );

    expect(confirmed).toHaveLength(1);
    expect(conflicts).toHaveLength(99);
  });
});

// ─── 11.2: Rate Limit — burst requests → 429 with Retry-After ─────────────────

describe('11.2 Rate limit: burst registration requests → 429 with Retry-After', () => {
  let guard: RateLimitGuard;
  let tokenBucket: { consume: jest.Mock };
  let reflector: Reflector;

  function makeCtx() {
    const response = { setHeader: jest.fn() };
    return {
      switchToHttp: () => ({
        getRequest: () => ({ ip: '10.0.0.1', params: {}, body: {}, headers: {} }),
        getResponse: () => response,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
      _response: response,
    } as any;
  }

  beforeEach(async () => {
    tokenBucket = { consume: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        RateLimitGuard,
        { provide: TokenBucketService, useValue: tokenBucket },
        Reflector,
      ],
    }).compile();
    guard = module.get(RateLimitGuard);
    reflector = module.get(Reflector);
  });

  it('returns 429 with Retry-After header when REGISTRATION bucket is exhausted', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(RateLimitTier.REGISTRATION);
    tokenBucket.consume.mockResolvedValue({ allowed: false, remaining: 0, retryAfterSeconds: 30 });

    const ctx = makeCtx();

    await expect(guard.canActivate(ctx)).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });

    const response = ctx.switchToHttp().getResponse();
    // Task 5.4: Retry-After must be set to REGISTRATION tier value (30s)
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', 30);
  });

  it('allows requests through when bucket has remaining tokens', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(RateLimitTier.REGISTRATION);
    tokenBucket.consume.mockResolvedValue({ allowed: true, remaining: 4, retryAfterSeconds: 0 });

    const ctx = makeCtx();
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('returns 429 with Retry-After: 10 for LOGIN tier', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(RateLimitTier.LOGIN);
    tokenBucket.consume.mockResolvedValue({ allowed: false, remaining: 0, retryAfterSeconds: 10 });

    const ctx = makeCtx();
    await expect(guard.canActivate(ctx)).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });

    const response = ctx.switchToHttp().getResponse();
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', 10);
  });
});

// ─── 11.8: API surface review — see coverage summary below ────────────────────
//
// All acceptance criteria are covered by the following test files:
//   ✓ auth.service.spec.ts        — 2.1–2.11: login, bcrypt, JWT, refresh rotation, RBAC
//   ✓ registration.service.spec.ts — 4.2–4.10: free/paid, idempotency, hold expiry
//   ✓ load-protection.spec.ts      — 5.3, 5.4, 5.8: rate limits, queue token
//   ✓ payment.service.spec.ts      — 6.6, 6.9, 6.11, 6.12: auto-refund, idempotency, CB
//   ✓ circuit-breaker.service.spec.ts — 6.7: state transitions (CLOSED→OPEN→HALF_OPEN→CLOSED)
//   ✓ notification.spec.ts         — 7.10: per-channel routing, retry independence
//   ✓ notification.listener.spec.ts — 11.7: workshop cancelled fan-out
//   ✓ checkin.service.spec.ts      — 8.4, 8.10, 8.11: preload, sync, duplicate resolution
//   ✓ student-import.service.spec.ts — 9.3, 9.5: CSV parsing, threshold, checksum
//   ✓ ai-summary.service.spec.ts   — 10.2–10.12: pipeline, retry, timeout
//   ✓ section-11.spec.ts (this)    — 11.1, 11.2: concurrency, rate limit burst
