import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsPositive,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  ValidateIf,
} from 'class-validator';
import { WorkshopFeeType } from '@unihub/shared';

export class CreateWorkshopDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  speakerName: string;

  @IsString()
  @IsNotEmpty()
  roomName: string;

  @IsOptional()
  @IsString()
  roomMapUrl?: string;

  @IsInt()
  @IsPositive()
  capacity: number;

  @IsEnum(WorkshopFeeType)
  feeType: WorkshopFeeType;

  @ValidateIf((o) => o.feeType === WorkshopFeeType.PAID)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1000)
  price?: number;

  @IsDateString()
  startsAt: string;

  @IsDateString()
  endsAt: string;
}
