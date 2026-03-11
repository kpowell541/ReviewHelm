import { IsBoolean, IsIn, IsOptional, IsUrl, MaxLength } from 'class-validator';

export class SubscriptionSubscribeDto {
  @IsIn(['starter', 'pro', 'premium'])
  plan!: 'starter' | 'pro' | 'premium';

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

  @IsOptional()
  @IsBoolean()
  trial?: boolean;
}
