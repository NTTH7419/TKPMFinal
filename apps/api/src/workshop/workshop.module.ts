import { Module } from '@nestjs/common';
import { WorkshopService } from './workshop.service';
import { WorkshopController } from './workshop.controller';

@Module({
  providers: [WorkshopService],
  controllers: [WorkshopController],
  exports: [WorkshopService],
})
export class WorkshopModule {}
