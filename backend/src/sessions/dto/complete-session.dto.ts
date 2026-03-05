import { IsBoolean, IsOptional } from 'class-validator';

export class CompleteSessionDto {
  @IsOptional()
  @IsBoolean()
  confirmLowCoverage?: boolean;
}
