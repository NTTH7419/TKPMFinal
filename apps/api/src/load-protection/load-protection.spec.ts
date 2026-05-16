import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TokenBucketService } from './token-bucket.service';
import { RateLimitGuard } from './rate-limit.guard';
import { QueueTokenService } from './queue-token.service';
import { RateLimitTier } from './rate-limit.decorator';
import { REDIS_CLIENT } from '../redis/redis.module';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeContext(tier: RateLimitTier, overrides: Record<string, any> = {}): ExecutionContext {
  const request = { ip: '127.0.0.1', params: {}, body: {}, headers: {}, ...overrides };
  const response = { setHeader: jest.fn() };
  return {
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

// ─── TokenBucketService ───────────────────────────────────────────────────────

describe('TokenBucketService', () => {
  let service: TokenBucketService;
  let mockRedis: { eval: jest.Mock };

  beforeEach(async () => {
    mockRedis = { eval: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenBucketService,
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();
    service = module.get(TokenBucketService);
  });

  it('should return allowed=true when tokens remain', async () => {
    mockRedis.eval.mockResolvedValue([1, 4, 0]);
    const result = await service.consume('rl:test:ip', 5, 1, 60);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('should return allowed=false when bucket is empty', async () => {
    mockRedis.eval.mockResolvedValue([0, 0, 5]);
    const result = await service.consume('rl:test:ip', 5, 1, 60);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBe(5);
  });
});

// ─── RateLimitGuard ───────────────────────────────────────────────────────────

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let tokenBucketService: { consume: jest.Mock };
  let reflector: Reflector;

  beforeEach(async () => {
    tokenBucketService = { consume: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitGuard,
        { provide: TokenBucketService, useValue: tokenBucketService },
        Reflector,
      ],
    }).compile();
    guard = module.get(RateLimitGuard);
    reflector = module.get(Reflector);
  });

  it('should pass when no tier is set on handler', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = makeContext(RateLimitTier.PUBLIC_LISTING);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(tokenBucketService.consume).not.toHaveBeenCalled();
  });

  it('should allow request when tokens remain', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(RateLimitTier.PUBLIC_LISTING);
    tokenBucketService.consume.mockResolvedValue({ allowed: true, remaining: 59, retryAfterSeconds: 0 });
    const ctx = makeContext(RateLimitTier.PUBLIC_LISTING);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  // Task 5.8: rate limit enforcement returns 429
  it('should throw 429 with Retry-After header when bucket is exhausted', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(RateLimitTier.LOGIN);
    tokenBucketService.consume.mockResolvedValue({ allowed: false, remaining: 0, retryAfterSeconds: 10 });
    const ctx = makeContext(RateLimitTier.LOGIN);

    await expect(guard.canActivate(ctx)).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });

    const response = ctx.switchToHttp().getResponse() as any;
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', 10);
  });
});

// ─── QueueTokenService ────────────────────────────────────────────────────────

describe('QueueTokenService', () => {
  let service: QueueTokenService;
  let mockRedis: { incr: jest.Mock; expire: jest.Mock; set: jest.Mock; del: jest.Mock };

  beforeEach(async () => {
    mockRedis = {
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueTokenService,
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();
    service = module.get(QueueTokenService);
  });

  it('should issue a token and return the TTL', async () => {
    const result = await service.issueToken('user-1', 'ws-1');
    expect(mockRedis.set).toHaveBeenCalledWith('qt:user-1:ws-1', '1', 'EX', 120);
    expect(result.ttl).toBe(120);
  });

  it('should throw 429 when workshop queue throttle is exceeded', async () => {
    mockRedis.incr.mockResolvedValue(101); // over limit
    await expect(service.issueToken('user-1', 'ws-1')).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
  });

  // Task 5.8: queue token is one-time-use
  it('should consume token successfully on first use', async () => {
    mockRedis.del.mockResolvedValue(1);
    await expect(service.consumeToken('user-1', 'ws-1')).resolves.not.toThrow();
    expect(mockRedis.del).toHaveBeenCalledWith('qt:user-1:ws-1');
  });

  // Task 5.8: expired / already-used token is rejected
  it('should throw UnauthorizedException when token does not exist (expired or already used)', async () => {
    mockRedis.del.mockResolvedValue(0);
    await expect(service.consumeToken('user-1', 'ws-1')).rejects.toThrow(UnauthorizedException);
  });
});
