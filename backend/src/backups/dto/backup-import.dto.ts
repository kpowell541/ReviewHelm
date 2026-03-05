import { IsString, MaxLength } from 'class-validator';

export class BackupImportDto {
  @IsString()
  @MaxLength(20000)
  sourceUrl!: string;
}
