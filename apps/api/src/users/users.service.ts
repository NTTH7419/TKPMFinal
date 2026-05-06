import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { Role } from '@unihub/shared';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  async assignRole(targetUserId: string, role: Role, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException('User not found');

    const roleRecord = await this.prisma.role.findUnique({ where: { code: role } });
    if (!roleRecord) throw new NotFoundException(`Role ${role} not found`);

    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId: targetUserId, roleId: roleRecord.id } },
      update: {},
      create: { userId: targetUserId, roleId: roleRecord.id },
    });

    this.auditLog.log({
      action: 'ROLE_ASSIGNED',
      actorId,
      targetId: targetUserId,
      metadata: { role },
    });

    return { message: `Role ${role} assigned to user ${targetUserId}` };
  }

  async removeRole(targetUserId: string, role: Role, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException('User not found');

    const roleRecord = await this.prisma.role.findUnique({ where: { code: role } });
    if (!roleRecord) throw new NotFoundException(`Role ${role} not found`);

    await this.prisma.userRole.deleteMany({
      where: { userId: targetUserId, roleId: roleRecord.id },
    });

    this.auditLog.log({
      action: 'ROLE_REMOVED',
      actorId,
      targetId: targetUserId,
      metadata: { role },
    });

    return { message: `Role ${role} removed from user ${targetUserId}` };
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        include: { userRoles: { include: { role: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        status: u.status,
        roles: u.userRoles.map((ur) => ur.role.code),
        createdAt: u.createdAt,
      })),
      total,
      page,
      limit,
    };
  }
}
