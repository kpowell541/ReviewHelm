import { IsInt, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreditLedgerQueryDto {
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
