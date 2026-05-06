// ─── Roles ────────────────────────────────────────────────────────────────────
export enum Role {
  STUDENT = 'STUDENT',
  ORGANIZER = 'ORGANIZER',
  CHECKIN_STAFF = 'CHECKIN_STAFF',
  ADMIN = 'ADMIN',
}

// ─── Workshop ─────────────────────────────────────────────────────────────────
export enum WorkshopStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum WorkshopFeeType {
  FREE = 'FREE',
  PAID = 'PAID',
}

export enum SummaryStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  AI_GENERATED = 'AI_GENERATED',
  ADMIN_EDITED = 'ADMIN_EDITED',
  SUMMARY_FAILED = 'SUMMARY_FAILED',
}

export enum DocumentUploadStatus {
  UPLOADED = 'UPLOADED',
  PROCESSING = 'PROCESSING',
  DONE = 'DONE',
  FAILED = 'FAILED',
}

// ─── Registration ─────────────────────────────────────────────────────────────
export enum RegistrationStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  CONFIRMED = 'CONFIRMED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
}

// ─── Payment ──────────────────────────────────────────────────────────────────
export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

// ─── Check-in ─────────────────────────────────────────────────────────────────
export enum CheckinStatus {
  ACCEPTED = 'ACCEPTED',
  DUPLICATE = 'DUPLICATE',
  INVALID = 'INVALID',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
}

export enum CheckinSyncStatus {
  PENDING_SYNC = 'PENDING_SYNC',
  SYNCED = 'SYNCED',
}

// ─── Student Import ───────────────────────────────────────────────────────────
export enum ImportBatchStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PROMOTED = 'PROMOTED',
  REJECTED = 'REJECTED',
  FAILED = 'FAILED',
}

export enum ImportRowStatus {
  VALID = 'VALID',
  ERROR = 'ERROR',
  DUPLICATE = 'DUPLICATE',
}

// ─── Notification ─────────────────────────────────────────────────────────────
export enum NotificationChannel {
  EMAIL = 'EMAIL',
  IN_APP = 'IN_APP',
  TELEGRAM = 'TELEGRAM',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  FAILED_PERMANENT = 'FAILED_PERMANENT',
}

export enum NotificationEventType {
  REGISTRATION_CONFIRMED = 'RegistrationConfirmed',
  REGISTRATION_EXPIRED = 'RegistrationExpired',
  PAYMENT_SUCCEEDED = 'PaymentSucceeded',
  PAYMENT_FAILED = 'PaymentFailed',
  WORKSHOP_CANCELLED = 'WorkshopCancelled',
  WORKSHOP_UPDATED = 'WorkshopUpdated',
}

// ─── User ─────────────────────────────────────────────────────────────────────
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  LOCKED = 'LOCKED',
}

export enum StudentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

// ─── Circuit Breaker ──────────────────────────────────────────────────────────
export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}
