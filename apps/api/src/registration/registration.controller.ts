import { Controller, Post, Get, Param, Body, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { RegistrationService } from './registration.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RateLimit, RateLimitTier } from '../load-protection/rate-limit.decorator';
import { Role } from '@unihub/shared';

@Controller()
@UseGuards(JwtAuthGuard)
export class RegistrationController {
  constructor(private registrationService: RegistrationService) {}

  // POST /registrations — STUDENT only
  @Post('registrations')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  @RateLimit(RateLimitTier.REGISTRATION)
  register(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateRegistrationDto,
  ) {
    return this.registrationService.register(user.sub, dto);
  }

  // GET /me/registrations — authenticated student
  @Get('me/registrations')
  getMyRegistrations(@CurrentUser() user: { sub: string }) {
    return this.registrationService.getMyRegistrations(user.sub);
  }

  // GET /me/registrations/:id/qr — authenticated student
  @Get('me/registrations/:id/qr')
  getQrCode(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
  ) {
    return this.registrationService.getQrCode(user.sub, id);
  }
}
