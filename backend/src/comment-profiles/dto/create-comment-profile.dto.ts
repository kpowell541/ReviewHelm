import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCommentProfileDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  @IsString()
  @MaxLength(80)
  tone!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  strictness!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  verbosity!: number;

  @IsOptional()
  @IsBoolean()
  includePraise?: boolean;

  @IsOptional()
  @IsBoolean()
  includeActionItems?: boolean;
}
