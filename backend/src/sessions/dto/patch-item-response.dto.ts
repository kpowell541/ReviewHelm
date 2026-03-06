import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class PatchItemResponseDto {
  @IsOptional()
  @IsEnum({
    'looks-good': 'looks-good',
    'needs-attention': 'needs-attention',
    na: 'na',
    skipped: 'skipped',
  })
  verdict?: 'looks-good' | 'needs-attention' | 'na' | 'skipped';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsIn([1, 2, 3, 4, 5])
  confidence?: 1 | 2 | 3 | 4 | 5;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  draftedComment?: string;
}
