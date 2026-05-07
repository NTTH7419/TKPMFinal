import { Module } from '@nestjs/common';
import { WorkshopService } from './workshop.service';
import { WorkshopController } from './workshop.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [WorkshopService],
  controllers: [WorkshopController],
  exports: [WorkshopService],
})
export class WorkshopModule {}
