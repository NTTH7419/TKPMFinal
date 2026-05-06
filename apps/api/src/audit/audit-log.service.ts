import { Injectable, Logger } from '@nestjs/common';

export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'ROLE_ASSIGNED'
  | 'ROLE_REMOVED'
  | 'WORKSHOP_CREATED'
  | 'WORKSHOP_UPDATED'
  | 'WORKSHOP_CANCELLED'
  | 'TOKEN_REVOKED';

export interface AuditLogEntry {
  action: AuditAction;
  actorId?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  log(entry: AuditLogEntry): void {
    // Write structured audit log — persisted to application logs
    // In production this would write to a dedicated audit_logs table
    this.logger.log({
      timestamp: new Date().toISOString(),
      ...entry,
    });
  }
}
