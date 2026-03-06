import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class RotateProviderKeysDto {
  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
