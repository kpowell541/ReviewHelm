import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateCommentProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  tone?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  strictness?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  verbosity?: number;

  @IsOptional()
  @IsBoolean()
  includePraise?: boolean;

  @IsOptional()
  @IsBoolean()
  includeActionItems?: boolean;
}
