import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class CreateRegistrationDto {
  @IsUUID()
  workshopId: string;

  /**
   * Idempotency key: client generates once (e.g. uuid), retries with same key
   * to prevent double-registration on network error.
   */
  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  /**
   * Queue token: issued by POST /workshops/:id/queue-token
   * Required for rate-limiting and queue protection
   */
  @IsString()
  @IsOptional()
  queueToken?: string;
}
