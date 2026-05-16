import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AiSummaryService } from './ai-summary.service';
import { UpdateSummaryDto } from './dto/update-summary.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role, AI_SUMMARY } from '@unihub/shared';
import { RateLimit, RateLimitTier } from '../load-protection/rate-limit.decorator';

@Controller('admin/workshops')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORGANIZER, Role.ADMIN)
@RateLimit(RateLimitTier.ADMIN)
export class AiSummaryController {
  private readonly logger = new Logger(AiSummaryController.name);
  constructor(private service: AiSummaryService) {}

  // Task 10.2: POST /admin/workshops/:id/documents
  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadDocument(
    @Param('id') workshopId: string,
    @CurrentUser() user: { sub: string },
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: AI_SUMMARY.MAX_PDF_SIZE_BYTES }),
          new FileTypeValidator({ fileType: 'application/pdf' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.service.uploadDocument(workshopId, user.sub, file).catch(err => {
      this.logger.error('uploadDocument error:', err?.message, err?.stack);
      // Re-throw NestJS HTTP exceptions (404, 400...) as-is; wrap everything else as 500
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException(err?.message ?? 'Unknown error');
    });
  }

  // Task 10.3: GET /admin/workshops/:id/summary-status
  @Get(':id/summary-status')
  getSummaryStatus(@Param('id') workshopId: string) {
    return this.service.getSummaryStatus(workshopId);
  }

  // Task 10.13: PATCH /admin/workshops/:id/summary
  @Patch(':id/summary')
  updateSummary(
    @Param('id') workshopId: string,
    @Body() dto: UpdateSummaryDto,
  ) {
    return this.service.updateSummary(workshopId, dto.aiSummary);
  }
}
