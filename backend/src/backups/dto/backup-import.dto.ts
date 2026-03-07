import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class BackupImportDto {
  @IsString()
  @MaxLength(20000)
  sourceUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  signature?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  signatureTimestamp?: number;
}
