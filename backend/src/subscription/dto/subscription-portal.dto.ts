import { IsUrl, MaxLength } from 'class-validator';

export class SubscriptionPortalDto {
  @IsUrl(
    {
      require_protocol: true,
      protocols: ['https', 'http'],
      require_host: true,
      allow_underscores: false,
    },
    {
      message: 'returnUrl must be a valid URL',
    },
  )
  @MaxLength(2048)
  returnUrl!: string;
}
