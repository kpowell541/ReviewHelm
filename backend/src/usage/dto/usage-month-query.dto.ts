import { IsOptional, Matches } from 'class-validator';

export class UsageMonthQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  month?: string;
}
