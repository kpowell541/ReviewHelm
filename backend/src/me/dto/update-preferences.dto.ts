import { ClaudeModel } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const SEVERITIES = ['blocker', 'major', 'minor', 'nit'] as const;
const FONT_SIZES = ['small', 'medium', 'large'] as const;
const CODE_THEMES = ['dark', 'light'] as const;

export class UpdatePreferencesDto {
  @IsOptional()
  @IsEnum(ClaudeModel)
  aiModel?: ClaudeModel;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @IsIn(SEVERITIES, { each: true })
  defaultSeverityFilter?: string[];

  @IsOptional()
  @IsBoolean()
  antiBiasMode?: boolean;

  @IsOptional()
  @IsIn(FONT_SIZES)
  fontSize?: 'small' | 'medium' | 'large';

  @IsOptional()
  @IsIn(CODE_THEMES)
  codeBlockTheme?: 'dark' | 'light';

  @IsOptional()
  @IsBoolean()
  autoExportPdf?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  activeCommentStyleProfileId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(10000)
  monthlyBudgetUsd?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(100, { each: true })
  alertThresholds?: number[];

  @IsOptional()
  @IsBoolean()
  hardStopAtBudget?: boolean;

  @IsOptional()
  @IsBoolean()
  autoDowngradeNearBudget?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  autoDowngradeThresholdPct?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  cooldownSeconds?: number;
}
