import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { QueueTokenService } from './queue-token.service';
import { Role } from '@unihub/shared';

@Controller('workshops')
export class LoadProtectionController {
  constructor(private queueTokenService: QueueTokenService) {}

  // Task 5.5: POST /workshops/:id/queue-token — STUDENT only
  @Post(':id/queue-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  issueQueueToken(
    @CurrentUser() user: { id: string },
    @Param('id') workshopId: string,
  ) {
    return this.queueTokenService.issueToken(user.id, workshopId);
  }
}
