import { ChecklistMode } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateSessionDto {
  @IsEnum(ChecklistMode)
  mode!: ChecklistMode;

  @IsOptional()
  @IsString()
  stackId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stackIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedSections?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}
