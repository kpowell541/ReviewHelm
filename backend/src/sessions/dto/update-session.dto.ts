import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSessionDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  linkedPRId?: string | null;
}
