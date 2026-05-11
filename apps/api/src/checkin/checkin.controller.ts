import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { CheckinService } from './checkin.service';
import { SyncEventsDto } from './dto/sync-events.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@unihub/shared';

@Controller('checkin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CHECKIN_STAFF, Role.ADMIN)
export class CheckinController {
  constructor(private checkinService: CheckinService) {}

  // Task 8.4: GET /checkin/preload/:workshopId
  @Get('preload/:workshopId')
  preload(@Param('workshopId') workshopId: string) {
    return this.checkinService.preload(workshopId);
  }

  // Task 8.10: POST /checkin/sync
  @Post('sync')
  sync(
    @CurrentUser() user: { sub: string },
    @Body() dto: SyncEventsDto,
  ) {
    return this.checkinService.sync(user.sub, dto.events);
  }
}
