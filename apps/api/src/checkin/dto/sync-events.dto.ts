import { IsArray, ValidateNested, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

class CheckinEventItemDto {
  @IsUUID()
  eventId: string;

  @IsUUID()
  registrationId: string;

  @IsUUID()
  workshopId: string;

  @IsString()
  deviceId: string;

  @IsString()
  scannedAt: string; // ISO 8601
}

export class SyncEventsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckinEventItemDto)
  events: CheckinEventItemDto[];
}
