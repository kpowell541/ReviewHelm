import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class TutorMessageInputDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @MaxLength(20000)
  content!: string;
}

export class AiTutorDto {
  @IsOptional()
  @IsString()
  sessionId?: string | null;

  @IsIn(['learn', 'deep-dive', 'comment-drafter'])
  feature!: 'learn' | 'deep-dive' | 'comment-drafter';

  @IsOptional()
  @IsIn(['haiku', 'sonnet', 'opus'])
  model?: 'haiku' | 'sonnet' | 'opus';

  @IsIn([
    'concept-explainer',
    'qa',
    'comment-drafter',
    'exercise-generator',
    'anti-bias-challenger',
  ])
  role!:
    | 'concept-explainer'
    | 'qa'
    | 'comment-drafter'
    | 'exercise-generator'
    | 'anti-bias-challenger';

  @IsString()
  @MaxLength(300)
  itemId!: string;

  @IsString()
  @MaxLength(2000)
  itemText!: string;

  @IsString()
  @MaxLength(200)
  stackLabel!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  confidence!: 1 | 2 | 3 | 4 | 5;

  @IsArray()
  @ArrayMaxSize(60)
  @ValidateNested({ each: true })
  @Type(() => TutorMessageInputDto)
  messages!: TutorMessageInputDto[];

  @IsOptional()
  @IsBoolean()
  allowResponseCache?: boolean;

  @IsOptional()
  @IsBoolean()
  allowEscalation?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  diffId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500000)
  diffText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8192)
  apiKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  commentStyleProfileId?: string;
}
