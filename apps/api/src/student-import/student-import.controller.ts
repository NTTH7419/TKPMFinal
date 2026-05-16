import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@unihub/shared';
import { StudentImportService } from './student-import.service';

@Controller('admin/imports/students')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORGANIZER, Role.ADMIN)
export class StudentImportController {
  constructor(private service: StudentImportService) {}

  // Manual trigger for testing (replaces waiting for 2AM cron)
  @Post('trigger')
  async trigger() {
    const result = await this.service.scheduleScanWithResult();
    return result;
  }

  // Debug storage connection
  @Get('debug-storage')
  async debugStorage() {
    return this.service.debugStorage();
  }

  // Task 9.8: GET /admin/imports/students
  @Get()
  list(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.service.listBatches(Number(page), Number(limit));
  }

  // Task 9.9: GET /admin/imports/students/:batchId
  @Get(':batchId')
  detail(@Param('batchId') batchId: string) {
    return this.service.getBatchDetail(batchId);
  }
}
