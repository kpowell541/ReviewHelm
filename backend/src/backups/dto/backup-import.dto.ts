import { IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class BackupImportDto {
  @IsString()
  @MaxLength(20000)
  @Matches(/^(data:|https?:\/\/)[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]+$/i, {
    message: 'sourceUrl must start with https:// or data:',
  })
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
