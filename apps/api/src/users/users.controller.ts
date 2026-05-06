import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { AssignRoleDto } from './dto/assign-role.dto';
import { Role } from '@unihub/shared';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UsersController {
  constructor(private usersService: UsersService) {}

  // GET /admin/users
  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.usersService.findAll(page, limit);
  }

  // POST /admin/users/:id/roles
  @Post(':id/roles')
  assignRole(
    @Param('id') targetUserId: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.usersService.assignRole(targetUserId, dto.role, user.sub);
  }

  // DELETE /admin/users/:id/roles/:role
  @Delete(':id/roles/:role')
  removeRole(
    @Param('id') targetUserId: string,
    @Param('role') role: Role,
    @CurrentUser() user: AuthUser,
  ) {
    return this.usersService.removeRole(targetUserId, role, user.sub);
  }
}
