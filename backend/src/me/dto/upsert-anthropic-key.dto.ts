import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UpsertAnthropicKeyDto {
  @IsString()
  @MinLength(20)
  @MaxLength(256)
  @Matches(/^sk-ant-[A-Za-z0-9_\-]+$/, {
    message: 'Anthropic API key must start with sk-ant-',
  })
  apiKey!: string;
}
