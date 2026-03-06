import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsOptional, IsString, Max, Min } from 'class-validator';
import { ChecklistMode } from '@prisma/client';

export class ListSessionsQueryDto {
  @IsOptional()
  @IsEnum(ChecklistMode)
  mode?: ChecklistMode;

  @IsOptional()
  @IsString()
  stackId?: string;

  @IsOptional()
  @IsIn(['active', 'completed', 'all'])
  status?: 'active' | 'completed' | 'all';

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}
