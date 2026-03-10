import { Controller, Get, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { Public } from '../common/auth/public.decorator';
import type { AppEnv } from '../config/env.schema';

function parseCountries(raw: string): string[] {
  return raw
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

@Controller('region')
export class RegionController {
  constructor(private readonly config: ConfigService<AppEnv, true>) {}

  @Public()
  @Get('status')
  getStatus(@Req() req: Request) {
    const isUsOnlyMode = this.config.get('US_ONLY_MODE');
    const allowedCountries = parseCountries(this.config.get('US_ALLOWED_COUNTRIES'));
    const geoHeader = String(this.config.get('US_GEO_HEADER') ?? 'cf-ipcountry');
    const isProduction = this.config.get('NODE_ENV') === 'production';
    const rawCountry = req.header(geoHeader);
    const country = typeof rawCountry === 'string' ? rawCountry.trim().toLowerCase() : '';

    if (!isUsOnlyMode) {
      return {
        ok: true,
        allowed: true,
        mode: 'global',
        country: country || null,
        allowedCountries: allowedCountries.map((entry) => entry.toUpperCase()),
      };
    }

    if (!country) {
      return {
        ok: true,
        allowed: !isProduction,
        mode: 'us_only',
        country: null,
        allowedCountries: allowedCountries.map((entry) => entry.toUpperCase()),
        reason: isProduction ? 'missing_country_header' : null,
      };
    }

    return {
      ok: true,
      allowed: allowedCountries.includes(country),
      mode: 'us_only',
      country: country.toUpperCase(),
      allowedCountries: allowedCountries.map((entry) => entry.toUpperCase()),
      reason: allowedCountries.includes(country) ? null : 'country_not_allowed',
    };
  }
}
