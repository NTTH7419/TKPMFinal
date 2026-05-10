import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationService } from './notification.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  // ─── Task 7.7: List notifications ─────────────────────────────────────────────
  @Get('me/notifications')
  async getMyNotifications(@CurrentUser() user: { userId: string }) {
    return this.notificationService.getMyNotifications(user.userId);
  }

  // ─── Task 7.8: Mark as read ───────────────────────────────────────────────────
  @Patch('me/notifications/:id/read')
  async markRead(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    await this.notificationService.markAsRead(user.userId, id);
    return { ok: true };
  }
}
