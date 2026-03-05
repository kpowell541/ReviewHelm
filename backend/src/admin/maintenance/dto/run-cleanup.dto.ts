import { IsBoolean, IsOptional } from 'class-validator';

export class RunCleanupDto {
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
