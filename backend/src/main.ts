import 'reflect-metadata';
import { webcrypto, randomUUID } from 'node:crypto';

// Polyfill globalThis.crypto for jose ES256 verification on Node < 20
// trigger rebuild
if (typeof globalThis.crypto === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).crypto = webcrypto;
}
import express from 'express';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import type { AppEnv } from './config/env.schema';
import type { AuthenticatedUser } from './common/auth/types';
import { SecurityExceptionFilter } from './common/http/safe-exception.filter';
import { RedisService } from './common/redis/redis.service';
import { slog } from './common/logging';

interface RequestWithMeta extends express.Request {
  user?: AuthenticatedUser;
  requestId?: string;
}

function parseCsvList(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeIpAddress(ip: string | undefined): string {
  if (!ip) return '';
  const first = ip.split(',')[0]?.trim() ?? '';
  if (!first) return '';
  if (first === '::1') return '127.0.0.1';
  if (first.startsWith('::ffff:')) {
    return first.slice(7);
  }
  return first;
}

function isIpAllowed(ip: string, allowlist: string[]): boolean {
  return allowlist.length > 0 && allowlist.includes(ip);
}

/** UTC minute bucket string for rate-limit keys (e.g. "202603111423"). */
function minuteBucket(date: Date): string {
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}${String(date.getUTCHours()).padStart(2, '0')}${String(date.getUTCMinutes()).padStart(2, '0')}`;
}

function normalizePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return '/';
  if (trimmed === '/') return '/';
  return trimmed.replace(/\/+$/g, '') || '/';
}

function installProcessSignalLogging(): void {
  process.on('uncaughtException', (error: Error) => {
    slog.error('process', { event: 'uncaught_exception', message: error.message, stack: error.stack });
  });

  process.on('unhandledRejection', (reason: unknown) => {
    slog.error('process', {
      event: 'unhandled_rejection',
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });

  process.on('SIGTERM', () => {
    slog.warn('process', { event: 'sigterm', message: 'Received SIGTERM' });
  });

  process.on('SIGINT', () => {
    slog.warn('process', { event: 'sigint', message: 'Received SIGINT' });
  });
}

async function bootstrap() {
  installProcessSignalLogging();
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const config = app.get(ConfigService<AppEnv, true>);
  const isProduction = config.get('NODE_ENV') === 'production';
  const strictStartupChecks = config.get('STRICT_STARTUP_CHECKS');
  const bodyLimit = config.get('REQUEST_BODY_LIMIT');
  const expressApp = app.getHttpAdapter().getInstance() as express.Express;
  expressApp.disable('x-powered-by');
  expressApp.set('trust proxy', isProduction ? 1 : false);

  // Keep root liveness outside the API prefix for platform probes.
  expressApp.get('/', (_req: express.Request, res: express.Response) => {
    res.status(200).json({
      ok: true,
      service: 'reviewhelm-api',
      status: 'live',
      time: new Date().toISOString(),
    });
  });

  app.setGlobalPrefix(config.get('API_BASE_PATH'));
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; base-uri 'self'; connect-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; form-action 'none'; object-src 'none'; font-src 'self' data:",
    );
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), serial=()',
    );
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    if (isProduction) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });
  // Stripe webhooks require the raw body for signature verification.
  const apiPrefix = config.get('API_BASE_PATH');
  const stripeWebhookPath = `/${apiPrefix}/stripe/webhook`;
  app.use(
    stripeWebhookPath,
    express.raw({ type: 'application/json', limit: bodyLimit }),
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
      (req as any).rawBody = req.body;
      if (!Buffer.isBuffer(req.body)) {
        res.status(400).json({
          statusCode: 400,
          error: 'Invalid webhook body',
          message: 'Stripe webhook payload must be sent as a raw buffer.',
        });
        return;
      }

      try {
        req.body = JSON.parse(req.body.toString('utf-8'));
      } catch {
        res.status(400).json({
          statusCode: 400,
          error: 'Invalid webhook body',
          message: 'Stripe webhook payload must contain valid JSON.',
        });
        return;
      }
      next();
    },
  );
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

  // CORS must be enabled before any middleware that may reject requests (e.g.
  // the US-only region gate), so that error responses still carry the
  // Access-Control-Allow-Origin header and browsers can read them.
  const allowedOrigins = config
    .get('ALLOWED_ORIGINS')
    .split(',')
    .map((origin: string) => origin.trim())
    .filter(Boolean);

  if (isProduction && allowedOrigins.length === 0) {
    if (strictStartupChecks) {
      throw new Error(
        'ALLOWED_ORIGINS is required in production when STRICT_STARTUP_CHECKS=true.',
      );
    }
    slog.warn('startup', { message: 'ALLOWED_ORIGINS is empty in production; browser requests will fail CORS.' });
  }

  app.enableCors({
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key', 'X-Request-ID', 'X-Device-ID'],
    origin:
      allowedOrigins.length > 0
        ? (
            origin: string | undefined,
            callback: (error: Error | null, allow?: boolean) => void,
          ) => {
            const corsCallback = callback;
            const corsOrigin = origin;
            const allowed = !!corsOrigin && allowedOrigins.includes(corsOrigin);

            if (!corsOrigin) {
              // Native app requests typically do not send an Origin header.
              corsCallback(null, true);
              return;
            }

            corsCallback(
              allowed ? null : new Error('Origin not allowed by CORS'),
              allowed,
            );
          }
        : !isProduction,
    credentials: true,
  });

  // Global IP-based rate limit — catches unauthenticated brute-force attempts
  // before they reach NestJS guards and JWKS verification.
  const globalIpLimit = config.get('GLOBAL_IP_RATE_LIMIT_PER_MINUTE');
  const redis = app.get(RedisService);
  app.use(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.method === 'OPTIONS') {
      next();
      return;
    }
    const ip = normalizeIpAddress(req.ip);
    if (!ip) {
      next();
      return;
    }
    const now = new Date();
    const bucket = minuteBucket(now);
    const key = `ratelimit:global:ip:${ip}:${bucket}`;
    try {
      const hits = await redis.incrementWithWindow(key, 90);
      if (hits > globalIpLimit) {
        const retryAfter = Math.max(1, 60 - now.getUTCSeconds());
        res.setHeader('Retry-After', String(retryAfter));
        res.status(429).json({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Global rate limit exceeded. Please retry shortly.',
        });
        return;
      }
    } catch {
      // Redis unavailable — fail open
    }
    next();
  });

  const usOnlyMode = config.get('US_ONLY_MODE');
  const usAllowedCountries = parseCsvList(config.get('US_ALLOWED_COUNTRIES'));
  const usGeoHeader = String(config.get('US_GEO_HEADER') ?? 'cf-ipcountry').trim();
  const usOnlyBypassIps = parseCsvList(config.get('US_ONLY_BYPASS_IPS'));
  const regionStatusPath = `/${apiPrefix}/region/status`;
  const usOnlyBypassPaths = new Set([
    '/',
    `/${apiPrefix}/health`,
    `/${apiPrefix}/health/ready`,
    stripeWebhookPath,
    regionStatusPath,
  ]);

  if (usOnlyMode) {
    app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      // Always allow CORS preflight requests through.
      if (req.method === 'OPTIONS') {
        next();
        return;
      }

      const requestPath = normalizePath(req.path);
      if (usOnlyBypassPaths.has(requestPath)) {
        next();
        return;
      }

      const requestIp = normalizeIpAddress(req.ip);
      if (requestIp && isIpAllowed(requestIp, usOnlyBypassIps)) {
        next();
        return;
      }

      const rawCountry = req.header(usGeoHeader);
      const country = typeof rawCountry === 'string' ? rawCountry.trim().toLowerCase() : '';

      if (!country) {
        if (!isProduction) {
          next();
          return;
        }
        res.status(403).json({
          statusCode: 403,
          error: 'forbidden',
          code: 'REGION_COUNTRY_UNAVAILABLE',
          message:
            'ReviewHelm is currently available only in the United States. Country detection is unavailable for this request.',
        });
        return;
      }

      if (!usAllowedCountries.includes(country)) {
        res.status(403).json({
          statusCode: 403,
          error: 'forbidden',
          code: 'REGION_NOT_SUPPORTED',
          message: 'ReviewHelm is currently available only in the United States.',
          country: country.toUpperCase(),
          allowedCountries: usAllowedCountries.map((entry) => entry.toUpperCase()),
        });
        return;
      }

      next();
    });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new SecurityExceptionFilter());

  app.use((req: RequestWithMeta, res: express.Response, next: express.NextFunction) => {
    const incomingId = req.header('x-request-id');
    const sanitizedIncomingId =
      typeof incomingId === 'string'
        ? incomingId.trim()
        : '';
    const requestId =
      sanitizedIncomingId.length > 0 &&
      sanitizedIncomingId.length <= 128 &&
      /^[A-Za-z0-9._-]+$/.test(sanitizedIncomingId)
        ? sanitizedIncomingId
        : randomUUID();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    const startedAt = Date.now();

    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      const payload = {
        level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
        type: 'http_request',
        requestId,
        method: req.method,
        path: req.originalUrl ?? req.url,
        statusCode: res.statusCode,
        durationMs,
        userId: req.user?.supabaseUserId,
        ip: req.ip,
        deviceId: req.header('x-device-id') || undefined,
        userAgent: req.header('user-agent'),
        at: new Date().toISOString(),
      };
      const line = JSON.stringify(payload);
      if (res.statusCode >= 500) {
        console.error(line);
      } else if (res.statusCode >= 400) {
        console.warn(line);
      } else {
        console.info(line);
      }
    });

    next();
  });

  const enableSwaggerDocs = config.get('ENABLE_SWAGGER_DOCS');
  const allowSwaggerInProduction = config.get('ALLOW_SWAGGER_DOCS_IN_PRODUCTION');
  const swaggerAllowedIps = parseCsvList(config.get('SWAGGER_DOCS_ALLOWED_IPS'));
  const shouldEnableSwagger = enableSwaggerDocs && (!isProduction || allowSwaggerInProduction);

  if (shouldEnableSwagger) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('ReviewHelm API')
      .setDescription('ReviewHelm backend API contract')
      .setVersion(config.get('APP_VERSION'))
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          in: 'header',
        },
        'bearerAuth',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);

    if (isProduction && swaggerAllowedIps.length > 0) {
      app.use(
        '/docs',
        (req: express.Request, res: express.Response, next: express.NextFunction) => {
          const requestIp = normalizeIpAddress(req.ip);
          if (!isIpAllowed(requestIp, swaggerAllowedIps)) {
            res.status(403).json({
              statusCode: 403,
              error: 'forbidden',
              message: 'Swagger docs are restricted to allowed IPs.',
            });
            return;
          }
          next();
        },
      );
    }

    if (isProduction && swaggerAllowedIps.length === 0) {
      slog.warn('startup', { message: 'Swagger docs are enabled in production without IP allowlist. Configure SWAGGER_DOCS_ALLOWED_IPS.' });
    }
  }

  const port = config.get('PORT');
  await app.listen(port, '0.0.0.0');
  slog.info('startup', { message: `ReviewHelm API listening on 0.0.0.0:${port}` });
}

void bootstrap().catch((error: unknown) => {
  slog.error('startup', {
    message: 'Bootstrap failed',
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
});
