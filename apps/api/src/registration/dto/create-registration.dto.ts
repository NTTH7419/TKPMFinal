import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

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
}
