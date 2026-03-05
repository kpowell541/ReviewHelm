import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class SubmitCommentFeedbackDto {
  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsString()
  @MaxLength(300)
  itemId!: string;

  @IsIn(['comment-drafter', 'deep-dive', 'learn'])
  feature!: 'comment-drafter' | 'deep-dive' | 'learn';

  @IsIn(['haiku', 'sonnet', 'opus'])
  model!: 'haiku' | 'sonnet' | 'opus';

  @IsString()
  @MaxLength(12000)
  draftText!: string;

  @IsOptional()
  @IsString()
  @MaxLength(12000)
  finalText?: string;

  @IsIn(['accepted', 'edited', 'rejected'])
  outcome!: 'accepted' | 'edited' | 'rejected';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  editDistance?: number;
}
