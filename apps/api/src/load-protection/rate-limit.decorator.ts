import { SetMetadata } from '@nestjs/common';

export enum RateLimitTier {
  PUBLIC_LISTING = 'PUBLIC_LISTING',
  LOGIN = 'LOGIN',
  REGISTRATION = 'REGISTRATION',
  ADMIN = 'ADMIN',
}

export const RATE_LIMIT_TIER_KEY = 'rate_limit_tier';

export const RateLimit = (tier: RateLimitTier) =>
  SetMetadata(RATE_LIMIT_TIER_KEY, tier);
