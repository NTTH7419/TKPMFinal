import { Module } from '@nestjs/common';
import { TokenBucketService } from './token-bucket.service';
import { RateLimitGuard } from './rate-limit.guard';
import { QueueTokenService } from './queue-token.service';
import { LoadProtectionController } from './load-protection.controller';

@Module({
  providers: [TokenBucketService, RateLimitGuard, QueueTokenService],
  controllers: [LoadProtectionController],
  exports: [TokenBucketService, RateLimitGuard, QueueTokenService],
})
export class LoadProtectionModule {}
