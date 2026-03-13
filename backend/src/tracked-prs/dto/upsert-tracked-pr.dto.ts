import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const STATUSES = [
  'needs-review',
  'in-review',
  'changes-requested',
  'approved',
  'merged',
  'closed',
] as const;

const ROLES = ['author', 'reviewer'] as const;
const PRIORITIES = ['routine', 'low', 'medium', 'high', 'critical'] as const;
const SIZES = ['small', 'medium', 'large'] as const;
const CI_PASSING = ['yes', 'no', 'unknown'] as const;
const ACCEPTANCE_OUTCOMES = ['accepted-clean', 'accepted-with-changes', 'abandoned'] as const;
const REVIEW_OUTCOMES = ['requested-changes', 'no-changes-requested'] as const;

export class UpsertTrackedPRDto {
  @IsString()
  @MaxLength(36)
  id!: string;

  @IsString()
  @MaxLength(500)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  url?: string;

  @IsIn(STATUSES)
  status!: string;

  @IsIn(ROLES)
  role!: string;

  @IsIn(PRIORITIES)
  priority!: string;

  @IsBoolean()
  isEmergency!: boolean;

  @IsOptional()
  @IsIn(SIZES)
  size?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  repo?: string;

  @IsOptional()
  @IsInt()
  prNumber?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  prAuthor?: string;

  @IsOptional()
  dependencies?: unknown[];

  @IsOptional()
  @IsIn(CI_PASSING)
  ciPassing?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  linkedSessionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  notes?: string;

  @IsOptional()
  @IsIn([...ACCEPTANCE_OUTCOMES])
  acceptanceOutcome?: string;

  @IsOptional()
  @IsIn([...REVIEW_OUTCOMES])
  reviewOutcome?: string;

  @IsOptional()
  @IsBoolean()
  selfReviewed?: boolean;

  @IsOptional()
  @IsInt()
  reviewRoundCount?: number;

  @IsOptional()
  @IsBoolean()
  changesEverNeeded?: boolean;

  @IsOptional()
  @IsBoolean()
  reReviewed?: boolean;

  @IsOptional()
  @IsIn(['logic', 'edge-case', 'naming-style', 'performance', 'security', 'test-coverage', 'docs', 'architecture'])
  missCategory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  missNote?: string;

  @IsOptional()
  @IsDateString()
  resolvedAt?: string;

  @IsOptional()
  @IsDateString()
  lastReviewedAt?: string;

  @IsOptional()
  @IsDateString()
  archivedAt?: string;

  @IsDateString()
  createdAt!: string;

  @IsDateString()
  updatedAt!: string;
}
