import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { StudentImportService } from './student-import.service';

@Processor('student-import')
export class StudentImportProcessor extends WorkerHost {
  private readonly logger = new Logger(StudentImportProcessor.name);

  constructor(private service: StudentImportService) {
    super();
  }

  async process(job: Job<{ batchId: string; filePath: string }>): Promise<void> {
    const { batchId, filePath } = job.data;
    this.logger.log(`Processing batch ${batchId} — file: ${filePath}`);
    await this.service.processBatch(batchId);
  }
}
