import {
  IsString, IsInt, IsPositive, IsEnum,
  IsOptional, IsNumber, IsDateString, Min, ValidateIf,
} from 'class-validator';
import { WorkshopFeeType } from '@unihub/shared';

export class UpdateWorkshopDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() speakerName?: string;
  @IsOptional() @IsString() roomName?: string;
  @IsOptional() @IsString() roomMapUrl?: string;
  @IsOptional() @IsInt() @IsPositive() capacity?: number;
  @IsOptional() @IsEnum(WorkshopFeeType) feeType?: WorkshopFeeType;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(1000) price?: number;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
}
