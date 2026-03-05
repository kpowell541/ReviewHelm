import { IsOptional, IsString } from 'class-validator';

export class RiskHeatmapQueryDto {
  @IsOptional()
  @IsString()
  diffId?: string;
}
