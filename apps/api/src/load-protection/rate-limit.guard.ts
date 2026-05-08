import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { TokenBucketService } from './token-bucket.service';
import { RateLimitTier, RATE_LIMIT_TIER_KEY } from './rate-limit.decorator';
import { RATE_LIMIT } from '@unihub/shared';

interface TierConfig {
  capacity: number;
  refillRate: number;
  retryAfter: number;
  ttl: number;
}

// Task 5.3: tier configs — refillRate in tokens/second
const TIER_CONFIG: Record<RateLimitTier, TierConfig> = {
  [RateLimitTier.PUBLIC_LISTING]: {
    capacity: RATE_LIMIT.PUBLIC_LISTING.capacity,
    refillRate: RATE_LIMIT.PUBLIC_LISTING.refillPerSecond,
    retryAfter: 5,
    ttl: 60,
  },
  [RateLimitTier.LOGIN]: {
    capacity: RATE_LIMIT.LOGIN.capacity,
    refillRate: RATE_LIMIT.LOGIN.refillPerSecond,
    retryAfter: 10,
    ttl: 60,
  },
  [RateLimitTier.REGISTRATION]: {
    capacity: RATE_LIMIT.REGISTRATION.capacity,
    refillRate: 1 / 30, // 1 token per 30 seconds
    retryAfter: 30,
    ttl: 300,
  },
  [RateLimitTier.ADMIN]: {
    capacity: RATE_LIMIT.ADMIN.capacity,
    refillRate: RATE_LIMIT.ADMIN.refillPerSecond,
    retryAfter: 5,
    ttl: 60,
  },
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private tokenBucketService: TokenBucketService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const tier = this.reflector.getAllAndOverride<RateLimitTier>(
      RATE_LIMIT_TIER_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!tier) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const config = TIER_CONFIG[tier];
    const key = this.buildKey(tier, request);

    const result = await this.tokenBucketService.consume(
      key,
      config.capacity,
      config.refillRate,
      config.ttl,
    );

    response.setHeader('X-RateLimit-Limit', config.capacity);
    response.setHeader('X-RateLimit-Remaining', result.remaining);

    // Task 5.4: 429 with Retry-After header
    if (!result.allowed) {
      response.setHeader('Retry-After', config.retryAfter);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests',
          retryAfter: config.retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private buildKey(tier: RateLimitTier, request: Request): string {
    const ip =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ??
      request.ip ??
      '0.0.0.0';
    const user = (request as any).user as { id?: string } | undefined;
    const workshopId =
      request.params?.id ?? request.body?.workshopId ?? 'unknown';

    switch (tier) {
      case RateLimitTier.PUBLIC_LISTING:
        return `rl:public:${ip}`;
      case RateLimitTier.LOGIN:
        return `rl:login:${ip}`;
      case RateLimitTier.REGISTRATION:
        return `rl:reg:${user?.id ?? ip}:${workshopId}`;
      case RateLimitTier.ADMIN:
        return `rl:admin:${user?.id ?? ip}`;
    }
  }
}
