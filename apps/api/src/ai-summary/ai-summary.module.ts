import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AiSummaryService } from './ai-summary.service';
import { AiSummaryProcessor } from './ai-summary.processor';
import { AiSummaryController } from './ai-summary.controller';
import { QUEUE_NAMES } from '@unihub/shared';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAMES.AI_SUMMARY }),
  ],
  providers: [AiSummaryService, AiSummaryProcessor],
  controllers: [AiSummaryController],
})
export class AiSummaryModule {}
