import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { appendFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { Request, Response } from 'express';

const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'password',
  'passwordhash',
  'token',
  'access_token',
  'refresh_token',
  'jwt',
  'secret',
]);

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, child]) => [
      key,
      SENSITIVE_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : redact(child),
    ]),
  );
}

@Catch()
export class ErrorLogExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<Request & { user?: { id?: string; email?: string } }>();
    const response = http.getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      // Logging deliberately happens asynchronously: an unavailable disk must
      // never delay or replace the application's HTTP error response.
      void this.writeErrorLog(exception, status, request).catch(() => undefined);
    }

    const body = this.responseBody(exception, status);
    response.status(status).json(body);
  }

  private responseBody(exception: unknown, status: number) {
    if (!(exception instanceof HttpException)) {
      return { statusCode: status, message: 'Internal server error' };
    }

    const exceptionResponse = exception.getResponse();
    if (typeof exceptionResponse === 'string') {
      return { statusCode: status, message: exceptionResponse };
    }
    return exceptionResponse;
  }

  private async writeErrorLog(exception: unknown, status: number, request: Request & { user?: { id?: string; email?: string } }) {
    if (process.env.ERROR_LOG_ENABLED?.toLowerCase() === 'false') return;

    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const logDirectory = process.env.ERROR_LOG_DIR || join(process.cwd(), 'storage', 'logs');
    const error = exception instanceof Error ? exception : undefined;
    const entry = {
      timestamp: now.toISOString(),
      level: 'error',
      status,
      method: request.method,
      path: request.originalUrl || request.url,
      requestId: request.headers['x-request-id'],
      user: request.user ? { id: request.user.id, email: request.user.email } : undefined,
      query: redact(request.query),
      body: redact(request.body),
      error: {
        name: error?.name || 'UnknownException',
        message: error?.message || String(exception),
        stack: error?.stack,
      },
    };

    await mkdir(logDirectory, { recursive: true });
    await appendFile(join(logDirectory, `error-${date}.jsonl`), `${JSON.stringify(entry)}\n`, 'utf8');
  }
}
