import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import * as bcrypt from 'bcryptjs';

const mockUser = {
  id: 'user-1',
  email: 'student@test.com',
  passwordHash: '',
  fullName: 'Test Student',
  status: 'ACTIVE',
  createdAt: new Date(),
  userRoles: [{ role: { code: 'STUDENT', id: 'role-1', name: 'Student' } }],
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
  },
};

const mockRedis = {
  get: jest.fn(),
  setex: jest.fn(),
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('mock-token'),
  verify: jest.fn(),
};

const mockConfig = {
  getOrThrow: jest.fn().mockReturnValue('mock-secret'),
  get: jest.fn().mockReturnValue('mock-secret'),
};

const mockRes = {
  cookie: jest.fn(),
  clearCookie: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeAll(async () => {
    mockUser.passwordHash = await bcrypt.hash('correct-password', 10);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    mockUser.passwordHash = await bcrypt.hash('correct-password', 10);
  });

  // ─── Task 2.10: Successful login ─────────────────────────────────────────────
  it('should return accessToken and user on valid credentials', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockJwt.sign.mockReturnValue('access-token');

    const result = await service.login(
      { email: mockUser.email, password: 'correct-password' },
      mockRes,
    );

    expect(result.accessToken).toBe('access-token');
    expect(result.user.email).toBe(mockUser.email);
    expect(result.user.roles).toContain('STUDENT');
    expect(mockRes.cookie).toHaveBeenCalledWith(
      'refresh_token',
      expect.any(String),
      expect.any(Object),
    );
  });

  // ─── Wrong password ───────────────────────────────────────────────────────────
  it('should throw UnauthorizedException on wrong password', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    await expect(
      service.login({ email: mockUser.email, password: 'wrong-password' }, mockRes),
    ).rejects.toThrow(UnauthorizedException);
  });

  // ─── User not found ───────────────────────────────────────────────────────────
  it('should throw UnauthorizedException when user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'notfound@test.com', password: 'any' }, mockRes),
    ).rejects.toThrow(UnauthorizedException);
  });

  // ─── Locked account ───────────────────────────────────────────────────────────
  it('should throw ForbiddenException when account is locked', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, status: 'LOCKED' });

    await expect(
      service.login({ email: mockUser.email, password: 'correct-password' }, mockRes),
    ).rejects.toThrow(ForbiddenException);
  });

  // ─── Refresh token rotation ───────────────────────────────────────────────────
  it('should issue new tokens on valid refresh token', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    mockJwt.verify.mockReturnValue({ sub: mockUser.id, jti: 'old-jti', exp: futureExp });
    mockRedis.get.mockResolvedValue(null); // not blocked
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue(mockUser);
    mockJwt.sign.mockReturnValue('new-access-token');

    const result = await service.refresh('valid-refresh-token', mockRes);

    expect(result.accessToken).toBe('new-access-token');
    expect(mockRedis.setex).toHaveBeenCalledWith(
      expect.stringContaining('jti:'),
      expect.any(Number),
      '1',
    );
  });

  // ─── Revoked refresh token ────────────────────────────────────────────────────
  it('should throw UnauthorizedException when refresh token is revoked', async () => {
    mockJwt.verify.mockReturnValue({ sub: mockUser.id, jti: 'revoked-jti', exp: 9999999999 });
    mockRedis.get.mockResolvedValue('1'); // blocked

    await expect(service.refresh('revoked-token', mockRes)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
