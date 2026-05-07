import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '@unihub/shared';

function makeContext(userRoles: string[] | undefined, handlerRoles?: Role[]): ExecutionContext {
  const reflector = new Reflector();
  jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
    if (key === ROLES_KEY) return handlerRoles;
    return undefined;
  });

  const request = { user: userRoles !== undefined ? { roles: userRoles } : undefined };

  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  // No @Roles() decorator → allow any authenticated user
  it('should allow access when no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = makeContext(['STUDENT']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  // User has the required role → allow
  it('should allow access when user has the required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const ctx = makeContext([Role.ADMIN]);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  // User has one of multiple allowed roles → allow
  it('should allow access when user has one of multiple required roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ORGANIZER, Role.ADMIN]);
    const ctx = makeContext([Role.ORGANIZER]);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  // User does not have the required role → ForbiddenException
  it('should throw ForbiddenException when user lacks the required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const ctx = makeContext([Role.STUDENT]);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  // User has no roles at all → ForbiddenException
  it('should throw ForbiddenException when user has no roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const ctx = makeContext([]);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  // user object is missing roles field → ForbiddenException
  it('should throw ForbiddenException when user object has no roles field', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const ctx = makeContext(undefined);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
