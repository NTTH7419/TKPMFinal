import { IsString, MinLength } from 'class-validator';

export class UpdateSummaryDto {
  @IsString()
  @MinLength(1)
  aiSummary: string;
}
