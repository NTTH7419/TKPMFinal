import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { REDIS_KEYS } from '@unihub/shared';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuditLogService } from '../audit/audit-log.service';

const BCRYPT_COST = 12;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(REDIS_CLIENT) private redis: Redis,
    private auditLog: AuditLogService,
  ) {}

  // ─── Task 2.2: Login with bcrypt hash verification ───────────────────────────
  async login(dto: LoginDto, res: any) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user) {
      this.auditLog.log({ action: 'LOGIN_FAILED', metadata: { email: dto.email, reason: 'user_not_found' } });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'LOCKED') {
      this.auditLog.log({ action: 'LOGIN_FAILED', actorId: user.id, metadata: { reason: 'account_locked' } });
      throw new ForbiddenException('Account is locked');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      this.auditLog.log({ action: 'LOGIN_FAILED', actorId: user.id, metadata: { reason: 'wrong_password' } });
      throw new UnauthorizedException('Invalid credentials');
    }

    const roles = user.userRoles.map((ur) => ur.role.code);
    const { accessToken, refreshToken, jti } = await this.generateTokenPair(user.id, roles);

    // Set refresh token as HTTP-only cookie
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    });

    this.auditLog.log({ action: 'LOGIN_SUCCESS', actorId: user.id, metadata: { roles } });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles,
      },
    };
  }

  // ─── Task 2.4–2.5: Refresh token rotation with Redis blocklist ───────────────
  async refresh(refreshToken: string, res: any) {
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    let payload: { sub: string; jti: string; exp: number };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Check if this jti has been revoked (blocklist)
    const blocked = await this.redis.get(REDIS_KEYS.jwtBlocklist(payload.jti));
    if (blocked) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    // Revoke the old refresh token
    const remainingTtl = payload.exp - Math.floor(Date.now() / 1000);
    if (remainingTtl > 0) {
      await this.redis.setex(REDIS_KEYS.jwtBlocklist(payload.jti), remainingTtl, '1');
      this.auditLog.log({ action: 'TOKEN_REVOKED', actorId: payload.sub, metadata: { jti: payload.jti } });
    }

    // Look up user to get current roles
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: payload.sub },
      include: { userRoles: { include: { role: true } } },
    });

    if (user.status === 'LOCKED') {
      throw new ForbiddenException('Account is locked');
    }

    const roles = user.userRoles.map((ur) => ur.role.code);
    const { accessToken, refreshToken: newRefreshToken } = await this.generateTokenPair(user.id, roles);

    // Issue new refresh token cookie
    res.cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { accessToken };
  }

  // ─── Logout: revoke current refresh token ───────────────────────────────────
  async logout(refreshToken: string, res: any) {
    if (refreshToken) {
      try {
        const payload: { jti: string; exp: number } = this.jwtService.verify(refreshToken, {
          secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
        });
        const remainingTtl = payload.exp - Math.floor(Date.now() / 1000);
        if (remainingTtl > 0) {
          await this.redis.setex(REDIS_KEYS.jwtBlocklist(payload.jti), remainingTtl, '1');
        }
      } catch {
        // Token already invalid — ignore
      }
    }

    res.clearCookie('refresh_token');
    this.auditLog.log({ action: 'LOGOUT', metadata: {} });
    return { message: 'Logged out successfully' };
  }

  // ─── Task 2.3: Token generation ──────────────────────────────────────────────
  private async generateTokenPair(userId: string, roles: string[]) {
    const jti = crypto.randomUUID();

    const accessToken = this.jwtService.sign(
      { sub: userId, roles, jti },
      {
        secret: this.configService.getOrThrow('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      },
    );

    const refreshToken = this.jwtService.sign(
      { sub: userId, jti },
      {
        secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      },
    );

    return { accessToken, refreshToken, jti };
  }

  // ─── Task 2.11: Self-registration ───────────────────────────────────────────
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);

    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash, fullName: dto.fullName, status: 'ACTIVE' },
    });

    // Assign STUDENT role automatically
    const studentRole = await this.prisma.role.findUnique({ where: { code: 'STUDENT' } });
    if (studentRole) {
      await this.prisma.userRole.create({ data: { userId: user.id, roleId: studentRole.id } });
    }

    // Link to imported student record if email matches (status=null means not yet linked)
    await this.prisma.student.updateMany({
      where: { email: dto.email, userId: null },
      data: { userId: user.id },
    });

    return { id: user.id, email: user.email, fullName: user.fullName };
  }

  // ─── Hash a new password (used during registration/reset) ───────────────────
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_COST);
  }
}
