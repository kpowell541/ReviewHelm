import { ChecklistMode } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSessionDto {
  @IsEnum(ChecklistMode)
  mode!: ChecklistMode;

  @IsOptional()
  @IsString()
  stackId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}
