import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppEnv } from '../config/env.schema';
import { Public } from '../common/auth/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly config: ConfigService<AppEnv, true>,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @Public()
  getHealth() {
    return {
      ok: true,
      service: 'reviewhelm-api',
      version: this.config.get('APP_VERSION'),
      time: new Date().toISOString(),
    };
  }

  @Get('ready')
  @Public()
  async getReadiness() {
    const checks = {
      database: false,
      redis: false,
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch {
      checks.database = false;
    }

    try {
      const pong = await this.redis.command<string>(['PING']);
      checks.redis = pong === 'PONG';
    } catch {
      checks.redis = false;
    }

    return {
      ok: checks.database && checks.redis,
      service: 'reviewhelm-api',
      checks,
      time: new Date().toISOString(),
    };
  }
}
