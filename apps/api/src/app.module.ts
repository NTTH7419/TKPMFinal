import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WorkshopModule } from './workshop/workshop.module';
import { RegistrationModule } from './registration/registration.module';
import { LoadProtectionModule } from './load-protection/load-protection.module';
import { RateLimitGuard } from './load-protection/rate-limit.guard';

@Module({
  imports: [
    // Config — load .env globally
    ConfigModule.forRoot({ isGlobal: true }),

    // Event bus (domain events between modules)
    EventEmitterModule.forRoot(),

    // BullMQ — global Redis connection for all queues
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),

    // Shared infrastructure (global)
    PrismaModule,
    RedisModule,

    // Feature modules
    AuthModule,
    UsersModule,
    WorkshopModule,
    RegistrationModule,
    LoadProtectionModule,
  ],
  providers: [
    // RateLimitGuard is applied globally; routes without @RateLimit() are skipped automatically
    { provide: APP_GUARD, useClass: RateLimitGuard },
  ],
})
export class AppModule {}
