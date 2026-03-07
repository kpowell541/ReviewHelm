import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class OfficialCostQueryDto {
  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(8192)
  adminApiKey?: string;
}
