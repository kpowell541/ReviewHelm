import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
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

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<AppEnv, true>);
  const isProduction = config.get('NODE_ENV') === 'production';
  const bodyLimit = config.get('REQUEST_BODY_LIMIT');

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
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: bodyLimit }));
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
    throw new Error('ALLOWED_ORIGINS must be configured in production.');
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

  if (config.get('ENABLE_SWAGGER_DOCS')) {
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
  }

  await app.listen(config.get('PORT'));
}

void bootstrap();
