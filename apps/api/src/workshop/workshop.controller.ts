import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  Res,
  Sse,
  Inject,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import Redis from 'ioredis';
import { WorkshopService } from './workshop.service';
import { CreateWorkshopDto } from './dto/create-workshop.dto';
import { UpdateWorkshopDto } from './dto/update-workshop.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { REDIS_CLIENT } from '../redis/redis.module';
import { Role, REDIS_KEYS } from '@unihub/shared';

@Controller()
export class WorkshopController {
  constructor(
    private workshopService: WorkshopService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  // ─── Public endpoints ─────────────────────────────────────────────────────────

  // GET /workshops
  @Get('workshops')
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.workshopService.findAll(page, limit);
  }

  // GET /workshops/:id
  @Get('workshops/:id')
  findOne(@Param('id') id: string) {
    return this.workshopService.findOne(id);
  }

  // ─── Task 3.9: SSE endpoint — GET /workshops/:id/seats ───────────────────────
  // Subscribes to Redis Pub/Sub and pushes seat updates to the client
  @Get('workshops/:id/seats')
  @Sse()
  seatStream(@Param('id') workshopId: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>((observer) => {
      // Each SSE connection needs a dedicated Redis subscriber (pub/sub is connection-level)
      const subscriber = this.redis.duplicate();

      const channel = REDIS_KEYS.sseSeats(workshopId);

      subscriber.subscribe(channel, (err) => {
        if (err) {
          observer.error(err);
        }
      });

      subscriber.on('message', (_channel: string, message: string) => {
        try {
          observer.next({ data: JSON.parse(message) } as MessageEvent);
        } catch {
          // Ignore malformed messages
        }
      });

      subscriber.on('error', (err) => observer.error(err));

      // Cleanup on client disconnect
      return () => {
        subscriber.unsubscribe(channel).catch(() => {});
        subscriber.quit().catch(() => {});
      };
    });
  }

  // ─── Admin endpoints ──────────────────────────────────────────────────────────

  // GET /admin/workshops
  @Get('admin/workshops')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZER, Role.ADMIN)
  findAllAdmin(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.workshopService.findAllAdmin(page, limit);
  }

  // POST /admin/workshops

  @Post('admin/workshops')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZER, Role.ADMIN)
  create(@Body() dto: CreateWorkshopDto, @CurrentUser() user: { id: string }) {
    return this.workshopService.create(dto, user.id);
  }

  // PATCH /admin/workshops/:id
  @Patch('admin/workshops/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZER, Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateWorkshopDto, @CurrentUser() user: { id: string }) {
    return this.workshopService.update(id, dto, user.id);
  }

  // POST /admin/workshops/:id/open
  @Post('admin/workshops/:id/open')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZER, Role.ADMIN)
  open(@Param('id') id: string) {
    return this.workshopService.open(id);
  }

  // POST /admin/workshops/:id/cancel
  @Post('admin/workshops/:id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZER, Role.ADMIN)
  cancel(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.workshopService.cancel(id, user.id);
  }

  // GET /admin/workshops/:id/stats
  @Get('admin/workshops/:id/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZER, Role.ADMIN)
  getStats(@Param('id') id: string) {
    return this.workshopService.getStats(id);
  }
}
