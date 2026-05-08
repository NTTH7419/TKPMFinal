import {
  Injectable,
  Inject,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import { QUEUE_TOKEN_TTL_SEC, REDIS_KEYS } from '@unihub/shared';

// Task 5.7: max queue tokens issued per second per workshop
const QUEUE_THROTTLE_LIMIT = 100;

@Injectable()
export class QueueTokenService {
  constructor(@Inject(REDIS_CLIENT) private redis: Redis) {}

  // Task 5.5: issue queue token with 120s TTL
  async issueToken(
    userId: string,
    workshopId: string,
  ): Promise<{ ttl: number }> {
    // Task 5.7: throttle — cap issuance per second per workshop
    const throttleKey = `qt:throttle:${workshopId}`;
    const count = await this.redis.incr(throttleKey);
    if (count === 1) {
      await this.redis.expire(throttleKey, 1);
    }
    if (count > QUEUE_THROTTLE_LIMIT) {
      throw new HttpException(
        'Queue is full, please try again shortly',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const tokenKey = REDIS_KEYS.queueToken(userId, workshopId);
    await this.redis.set(tokenKey, '1', 'EX', QUEUE_TOKEN_TTL_SEC);

    return { ttl: QUEUE_TOKEN_TTL_SEC };
  }

  // Task 5.6: validate token exists and delete atomically (one-time-use)
  async consumeToken(userId: string, workshopId: string): Promise<void> {
    const tokenKey = REDIS_KEYS.queueToken(userId, workshopId);
    const deleted = await this.redis.del(tokenKey);
    if (deleted === 0) {
      throw new UnauthorizedException(
        'Missing or expired queue token. Please request a new queue token.',
      );
    }
  }
}
