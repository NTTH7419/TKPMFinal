import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuditLogService } from '../audit/audit-log.service';

@Module({
  providers: [UsersService, AuditLogService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
