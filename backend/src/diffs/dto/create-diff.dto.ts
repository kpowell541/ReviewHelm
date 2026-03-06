import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDiffDto {
  @IsString()
  @MaxLength(500_000)
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;
}
