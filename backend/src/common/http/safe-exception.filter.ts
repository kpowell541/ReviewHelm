import {
  Catch,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Response, Request } from 'express';

/** Paths whose error details must never leak request body content. */
const SENSITIVE_PATHS = new Set([
  '/api-keys/anthropic',
  '/auth/',
]);

function isSensitivePath(url: string | undefined): boolean {
  if (!url) return false;
  return Array.from(SENSITIVE_PATHS).some((p) => url.includes(p));
}

@Catch()
export class SecurityExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();

    const isProduction = process.env.NODE_ENV === 'production';
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'Internal Server Error';
    let message = 'An internal error occurred.';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        exceptionResponse &&
        typeof exceptionResponse === 'object'
      ) {
        const responseBody = exceptionResponse as Record<string, unknown>;
        if (typeof responseBody.error === 'string') {
          error = responseBody.error;
        }
        const responseMessage = responseBody.message;
        if (typeof responseMessage === 'string' && responseMessage.length > 0) {
          message = responseMessage;
        } else if (Array.isArray(responseMessage)) {
          details = responseMessage;
          message = status < 500 ? 'Invalid request' : message;
        } else {
          message = status < 500 ? 'Request failed' : message;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      if (!isProduction) {
        error = 'UnhandledError';
      }
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR && isProduction) {
      message = 'An internal error occurred.';
      error = 'Internal Server Error';
      details = undefined;
    }

    // Extra redaction for sensitive endpoints — never leak details
    if (isSensitivePath(request?.url)) {
      details = undefined;
    }

    const payload: Record<string, unknown> = {
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
    };

    if (request.requestId) {
      payload.requestId = request.requestId;
    }

    if (details !== undefined) {
      payload.details = details;
    }

    console.error(
      JSON.stringify({
        level: 'error',
        type: 'unhandled_exception',
        status,
        requestId: request.requestId,
        path: request?.url,
        message,
        error,
        at: new Date().toISOString(),
      }),
    );

    response.status(status).json(payload);
  }
}
