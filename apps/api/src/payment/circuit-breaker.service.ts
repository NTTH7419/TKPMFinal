import { Injectable, ServiceUnavailableException, Inject } from '@nestjs/common';
import { REDIS_CLIENT } from '../redis/redis.module';
import Redis from 'ioredis';

interface CircuitState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  successCount: number;
  failureTimestamp: number;
  lastFailureAt: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly stateKey = 'cb:payment_gateway';
  private readonly failureCountKey = 'cb:payment_gateway:failures';
  private readonly successCountKey = 'cb:payment_gateway:success';
  private readonly failureTimestampKey = 'cb:payment_gateway:failure_ts';

  // Configuration
  private readonly failureThreshold = 5; // 5 consecutive failures
  private readonly failureRateThreshold = 0.5; // >50% failure rate
  private readonly failureRateWindow = 30000; // 30 seconds
  private readonly minimumRequests = 10;
  private readonly openDuration = 30000; // 30 seconds
  private readonly halfOpenProbes = 3;

  constructor(@Inject(REDIS_CLIENT) private redis: Redis) {}

  async canProceed(): Promise<boolean> {
    const state = await this.getState();

    if (state.state === 'CLOSED') {
      return true;
    }

    if (state.state === 'OPEN') {
      // Check if open duration has expired
      const now = Date.now();
      const openedAt = state.failureTimestamp;
      if (now - openedAt > this.openDuration) {
        // Transition to Half-Open
        await this.setHalfOpenState();
        return true; // Allow probe request
      }

      throw new ServiceUnavailableException(
        'Payment gateway is temporarily unavailable',
      );
    }

    // HALF_OPEN: allow probes
    return true;
  }

  async recordSuccess(): Promise<void> {
    const state = await this.getState();

    if (state.state === 'CLOSED') {
      // Reset failure count on success in closed state
      await this.redis.del(this.failureCountKey);
      return;
    }

    if (state.state === 'HALF_OPEN') {
      // Increment success count
      const successCount = await this.redis.incr(this.successCountKey);
      if (successCount >= this.halfOpenProbes) {
        // Transition to Closed
        await this.setClosedState();
      }
      return;
    }

    // OPEN: ignore success until Half-Open transition
  }

  async recordFailure(): Promise<void> {
    await this.getState();
    const now = Date.now();

    // Track failures within the 30s window
    const failureCountValue = await this.redis.incr(
      this.failureCountKey,
    );

    // Store first failure timestamp
    if (failureCountValue === 1) {
      await this.redis.setex(this.failureTimestampKey, 31, now.toString());
    } else {
      // Update timestamp
      await this.redis.set(
        this.failureTimestampKey,
        now.toString(),
        'EX',
        31,
      );
    }

    // Transition to Open if 5 consecutive failures
    if (failureCountValue >= this.failureThreshold) {
      await this.setOpenState();
      return;
    }

    // For failure rate check, we count recent failures in 30s window
    // If we have 10+ requests in 30s window and >50% are failures, open
    if (failureCountValue >= this.minimumRequests) {
      // Estimate total requests (failures + successes)
      const successCountValue = await this.redis.get(
        this.successCountKey,
      );
      const successCount = successCountValue ? parseInt(successCountValue, 10) : 0;
      const totalCount = failureCountValue + successCount;

      if (totalCount >= this.minimumRequests) {
        const failureRate = failureCountValue / totalCount;
        if (failureRate > this.failureRateThreshold) {
          await this.setOpenState();
        }
      }
    }
  }

  private async getState(): Promise<CircuitState> {
    const stateValue = await this.redis.get(this.stateKey);
    const failureCount = await this.redis.get(this.failureCountKey);
    const successCount = await this.redis.get(this.successCountKey);
    const failureTimestamp = await this.redis.get(
      this.failureTimestampKey,
    );

    return {
      state: (stateValue as 'CLOSED' | 'OPEN' | 'HALF_OPEN') || 'CLOSED',
      failureCount: failureCount ? parseInt(failureCount, 10) : 0,
      successCount: successCount ? parseInt(successCount, 10) : 0,
      failureTimestamp: failureTimestamp ? parseInt(failureTimestamp, 10) : 0,
      lastFailureAt: 0,
    };
  }

  private async setClosedState(): Promise<void> {
    await Promise.all([
      this.redis.set(this.stateKey, 'CLOSED'),
      this.redis.del(this.failureCountKey),
      this.redis.del(this.successCountKey),
      this.redis.del(this.failureTimestampKey),
    ]);
  }

  private async setOpenState(): Promise<void> {
    await this.redis.setex(
      this.stateKey,
      Math.ceil(this.openDuration / 1000),
      'OPEN',
    );
    // Reset success count when opening
    await this.redis.del(this.successCountKey);
  }

  private async setHalfOpenState(): Promise<void> {
    await this.redis.set(this.stateKey, 'HALF_OPEN');
    await this.redis.del(this.successCountKey);
  }
}
