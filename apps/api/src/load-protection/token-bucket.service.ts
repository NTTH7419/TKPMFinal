import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

export interface TokenBucketResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

// Atomic Lua: refill based on elapsed time, then consume 1 token.
// Returns [allowed(0|1), remaining_tokens, retry_after_seconds]
const LUA_TOKEN_BUCKET = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])

local data = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(data[1])
local lastRefill = tonumber(data[2])

if tokens == nil then
  tokens = capacity
  lastRefill = now
end

local elapsed = (now - lastRefill) / 1000
local refilled = elapsed * refillRate
tokens = math.min(capacity, tokens + refilled)
lastRefill = now

local allowed
local retryAfter = 0

if tokens >= 1 then
  tokens = tokens - 1
  allowed = 1
else
  allowed = 0
  if refillRate > 0 then
    retryAfter = math.ceil((1 - tokens) / refillRate)
  else
    retryAfter = ttl
  end
end

redis.call('HMSET', key, 'tokens', tokens, 'last_refill', lastRefill)
redis.call('EXPIRE', key, ttl)

return {allowed, math.floor(tokens), retryAfter}
`;

@Injectable()
export class TokenBucketService {
  constructor(@Inject(REDIS_CLIENT) private redis: Redis) {}

  async consume(
    key: string,
    capacity: number,
    refillRate: number,
    ttlSeconds: number,
  ): Promise<TokenBucketResult> {
    const now = Date.now();
    const result = (await this.redis.eval(
      LUA_TOKEN_BUCKET,
      1,
      key,
      String(capacity),
      String(refillRate),
      String(now),
      String(ttlSeconds),
    )) as [number, number, number];

    return {
      allowed: result[0] === 1,
      remaining: result[1],
      retryAfterSeconds: result[2],
    };
  }
}
