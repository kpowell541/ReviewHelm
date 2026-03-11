import { IsIn, IsUrl, MaxLength } from 'class-validator';

const ALLOWED_TOPUP_AMOUNTS = [1, 5, 10, 20] as const;

export class SubscriptionTopUpDto {
  @IsIn(ALLOWED_TOPUP_AMOUNTS)
  amountUsd!: number;

  @IsUrl(
    {
      require_protocol: true,
      protocols: ['https', 'http'],
      require_host: true,
      allow_underscores: false,
    },
    {
      message: 'successUrl must be a valid URL',
    },
  )
  @MaxLength(2048)
  successUrl!: string;

  @IsUrl(
    {
      require_protocol: true,
      protocols: ['https', 'http'],
      require_host: true,
      allow_underscores: false,
    },
    {
      message: 'cancelUrl must be a valid URL',
    },
  )
  @MaxLength(2048)
  cancelUrl!: string;
}
