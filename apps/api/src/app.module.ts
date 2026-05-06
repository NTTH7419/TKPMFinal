import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WorkshopModule } from './workshop/workshop.module';

@Module({
  imports: [
    // Config — load .env globally
    ConfigModule.forRoot({ isGlobal: true }),

    // Event bus (domain events between modules)
    EventEmitterModule.forRoot(),

    // Shared infrastructure (global)
    PrismaModule,
    RedisModule,

    // Feature modules
    AuthModule,
    UsersModule,
    WorkshopModule,
  ],
})
export class AppModule {}
