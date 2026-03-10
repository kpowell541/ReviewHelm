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

function normalizePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return '/';
  if (trimmed === '/') return '/';
  return trimmed.replace(/\/+$/g, '') || '/';
}

function installProcessSignalLogging(): void {
  process.on('uncaughtException', (error: Error) => {
    console.error(
      JSON.stringify({
        level: 'error',
        type: 'process',
        event: 'uncaught_exception',
        message: error.message,
        stack: error.stack,
        at: new Date().toISOString(),
      }),
    );
  });

  process.on('unhandledRejection', (reason: unknown) => {
    console.error(
      JSON.stringify({
        level: 'error',
        type: 'process',
        event: 'unhandled_rejection',
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
        at: new Date().toISOString(),
      }),
    );
  });

  process.on('SIGTERM', () => {
    console.warn(
      JSON.stringify({
        level: 'warn',
        type: 'process',
        event: 'sigterm',
        message: 'Received SIGTERM',
        at: new Date().toISOString(),
      }),
    );
  });

  process.on('SIGINT', () => {
    console.warn(
      JSON.stringify({
        level: 'warn',
        type: 'process',
        event: 'sigint',
        message: 'Received SIGINT',
        at: new Date().toISOString(),
      }),
    );
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
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
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
    (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      (req as any).rawBody = req.body;
      if (Buffer.isBuffer(req.body)) {
        req.body = JSON.parse(req.body.toString('utf-8'));
      }
      next();
    },
  );
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: bodyLimit }));
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
      const requestPath = normalizePath(req.path);
      if (usOnlyBypassPaths.has(requestPath)) {
        next();
        return;
      }

      const forwarded = req.headers['x-forwarded-for'];
      const incomingIp = Array.isArray(forwarded)
        ? forwarded[0]
        : typeof forwarded === 'string'
          ? forwarded
          : req.ip;
      const requestIp = normalizeIpAddress(incomingIp);
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
    console.warn(
      JSON.stringify({
        level: 'warn',
        type: 'startup',
        message:
          'ALLOWED_ORIGINS is empty in production; browser requests will fail CORS.',
        at: new Date().toISOString(),
      }),
    );
  }

  app.enableCors({
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

  app.use((req: RequestWithMeta, res: express.Response, next: express.NextFunction) => {
    const incomingId = req.header('x-request-id');
    const requestId = incomingId && incomingId.length <= 128 ? incomingId : randomUUID();
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
          const forwarded = req.headers['x-forwarded-for'];
          const incomingIp = Array.isArray(forwarded)
            ? forwarded[0]
            : typeof forwarded === 'string'
              ? forwarded
              : req.ip;
          const requestIp = normalizeIpAddress(incomingIp);
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
      console.warn(
        JSON.stringify({
          level: 'warn',
          type: 'startup',
          message:
            'Swagger docs are enabled in production without IP allowlist. Configure SWAGGER_DOCS_ALLOWED_IPS.',
          at: new Date().toISOString(),
        }),
      );
    }
  }

  const port = config.get('PORT');
  await app.listen(port, '0.0.0.0');
  console.info(
    JSON.stringify({
      level: 'info',
      type: 'startup',
      message: `ReviewHelm API listening on 0.0.0.0:${port}`,
      at: new Date().toISOString(),
    }),
  );
}

void bootstrap().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      level: 'error',
      type: 'startup',
      message: 'Bootstrap failed',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      at: new Date().toISOString(),
    }),
  );
  process.exit(1);
});
