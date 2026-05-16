import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { StudentImportService } from './student-import.service';
import { StudentImportProcessor } from './student-import.processor';
import { StudentImportController } from './student-import.controller';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'student-import' }),
    ScheduleModule.forRoot(),
  ],
  providers: [StudentImportService, StudentImportProcessor],
  controllers: [StudentImportController],
})
export class StudentImportModule {}
