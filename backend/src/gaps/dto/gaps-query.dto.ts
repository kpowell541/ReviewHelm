import { Type } from 'class-transformer';
import { IsOptional, IsString, Max, Min } from 'class-validator';

export class GapsQueryDto {
  @IsOptional()
  @IsString()
  stackId?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;
}
