import { Injectable, ExecutionContext, UnauthorizedException, Inject } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import { REDIS_KEYS } from '@unihub/shared';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Run passport JWT validation first
    const isValid = await super.canActivate(context);
    if (!isValid) return false;

    // Check if jti is in the Redis blocklist (revoked token)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.jti) {
      const blocked = await this.redis.get(REDIS_KEYS.jwtBlocklist(user.jti));
      if (blocked) {
        throw new UnauthorizedException('Token has been revoked');
      }
    }

    return true;
  }

  handleRequest(err: unknown, user: unknown) {
    if (err || !user) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    return user;
  }
}
