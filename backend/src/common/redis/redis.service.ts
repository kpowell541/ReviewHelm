import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppEnv } from '../../config/env.schema';

interface UpstashResponse<T = unknown> {
  result?: T;
  error?: string;
}

@Injectable()
export class RedisService {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly requestTimeoutMs = 2_000;

  constructor(private readonly config: ConfigService<AppEnv, true>) {
    this.baseUrl = this.config.get('UPSTASH_REDIS_REST_URL');
    this.token = this.config.get('UPSTASH_REDIS_REST_TOKEN');
  }

  async command<T = unknown>(args: Array<string | number>): Promise<T | null> {
    const abortController = new AbortController();
    const timeout = setTimeout(() => {
      abortController.abort(new Error('Upstash request timed out'));
    }, this.requestTimeoutMs);

    let response: Response;
    try {
      response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(args),
        signal: abortController.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new InternalServerErrorException('Redis command failed');
    }

    const payload = (await response.json()) as UpstashResponse<T>;
    if (payload.error) {
      throw new InternalServerErrorException('Redis command returned error');
    }

    return payload.result ?? null;
  }

  async incrementWithWindow(key: string, ttlSeconds: number): Promise<number> {
    const next = await this.command<number>(['INCR', key]);
    const count = typeof next === 'number' ? next : Number(next ?? 0);
    if (count === 1) {
      await this.command(['EXPIRE', key, ttlSeconds]);
    }
    return count;
  }

  async trySetCooldown(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const result = await this.command<string>(['SET', key, value, 'EX', ttlSeconds, 'NX']);
    return result === 'OK';
  }

  async getTtlSeconds(key: string): Promise<number> {
    const ttl = await this.command<number>(['TTL', key]);
    if (typeof ttl === 'number') return ttl;
    const parsed = Number(ttl ?? -1);
    return Number.isFinite(parsed) ? parsed : -1;
  }

  async get(key: string): Promise<string | null> {
    const value = await this.command<string | number | null>(['GET', key]);
    if (value === null || value === undefined) return null;
    return String(value);
  }

  async delete(key: string): Promise<void> {
    await this.command(['DEL', key]);
  }
}
