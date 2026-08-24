import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { appendFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { Request, Response } from 'express';
import { SystemErrorLog } from '../entities/entities';
import { TenantContextService } from '../tenant/tenant-context.service';

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

const MAX_LOG_STRING_LENGTH = 2000;
const MAX_LOG_ARRAY_ITEMS = 30;
const MAX_LOG_OBJECT_KEYS = 80;

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

function compactForLog(value: unknown): unknown {
  const redacted = redact(value);
  if (typeof redacted === 'string') {
    return redacted.length > MAX_LOG_STRING_LENGTH
      ? `${redacted.slice(0, MAX_LOG_STRING_LENGTH)}... [truncated]`
      : redacted;
  }
  if (Array.isArray(redacted)) return redacted.slice(0, MAX_LOG_ARRAY_ITEMS).map(compactForLog);
  if (!redacted || typeof redacted !== 'object') return redacted;
  return Object.fromEntries(
    Object.entries(redacted as Record<string, unknown>)
      .slice(0, MAX_LOG_OBJECT_KEYS)
      .map(([key, child]) => [key, compactForLog(child)]),
  );
}

function uploadedFilesInfo(request: Request) {
  const files = (request as Request & { files?: unknown; file?: unknown }).files;
  const file = (request as Request & { files?: unknown; file?: unknown }).file;
  const items = Array.isArray(files) ? files : file ? [file] : [];
  return items.map((item) => {
    const upload = item as { originalname?: string; mimetype?: string; size?: number; fieldname?: string };
    return {
      fieldname: upload.fieldname,
      originalname: upload.originalname,
      mimetype: upload.mimetype,
      size: upload.size,
    };
  });
}

@Catch()
export class ErrorLogExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorLogExceptionFilter.name);

  constructor(private readonly tenantContext?: TenantContextService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<Request & { user?: { id?: string; email?: string } }>();
    const response = http.getResponse<Response>();
    const externalStatus = typeof exception === 'object' && exception !== null
      ? Number((exception as { status?: unknown }).status)
      : NaN;
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : Number.isInteger(externalStatus) && externalStatus >= 400 && externalStatus < 600
        ? externalStatus
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const error = exception instanceof Error ? exception : undefined;
      const tenant = this.tenantContext?.get();
      this.logger.error(
        `${request.method} ${request.originalUrl || request.url} failed with ${status}${tenant ? ` [tenant=${tenant.domain}]` : ''}: ${error?.message || String(exception)}`,
        error?.stack,
      );
      // Logging deliberately happens asynchronously: an unavailable disk must
      // never delay or replace the application's HTTP error response.
      void this.writeErrorLog(exception, status, request).catch(() => undefined);
    }

    const body = this.responseBody(exception, status);
    response.status(status).json(body);
  }

  private responseBody(exception: unknown, status: number) {
    if (!(exception instanceof HttpException)) {
      return {
        statusCode: status,
        message: status === HttpStatus.PAYLOAD_TOO_LARGE ? 'Dữ liệu import vượt quá giới hạn cho phép' : 'Internal server error',
      };
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
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const logDirectory = process.env.ERROR_LOG_DIR || join(process.cwd(), 'storage', 'logs');
    const error = exception instanceof Error ? exception : undefined;
    const entry = {
      timestamp: now.toISOString(),
      level: 'error',
      status,
      method: request.method,
      path: request.originalUrl || request.url,
      requestId: request.headers['x-request-id'],
      tenant: this.tenantContext?.get()?.domain,
      user: request.user ? { id: request.user.id, email: request.user.email } : undefined,
      params: compactForLog(request.params),
      query: compactForLog(request.query),
      body: compactForLog(request.body),
      headers: compactForLog({
        origin: request.headers.origin,
        referer: request.headers.referer,
        userAgent: request.headers['user-agent'],
        contentType: request.headers['content-type'],
      }),
      files: uploadedFilesInfo(request),
      error: {
        name: error?.name || 'UnknownException',
        message: error?.message || String(exception),
        stack: error?.stack,
      },
    };

    // Persist in the tenant database as well, so administrators can inspect
    // production errors in CMS without terminal or container-log access.
    const dataSource = this.tenantContext?.get()?.dataSource;
    const tasks: Promise<unknown>[] = [
      mkdir(logDirectory, { recursive: true })
        .then(() => appendFile(join(logDirectory, `error-${date}.jsonl`), `${JSON.stringify(entry)}\n`, 'utf8')),
    ];
    if (dataSource?.isInitialized) {
      const repository = dataSource.getRepository(SystemErrorLog);
      tasks.push(repository.save(repository.create({
        status,
        method: request.method,
        path: request.originalUrl || request.url,
        userId: request.user?.id,
        userEmail: request.user?.email,
        requestId: typeof request.headers['x-request-id'] === 'string' ? request.headers['x-request-id'] : undefined,
        errorName: entry.error.name,
        message: entry.error.message,
        stack: entry.error.stack,
        params: entry.params as Record<string, unknown>,
        query: entry.query as Record<string, unknown>,
        body: entry.body as Record<string, unknown>,
        headers: entry.headers as Record<string, unknown>,
        files: entry.files as Record<string, unknown>[],
      })));
    }
    await Promise.allSettled(tasks);
  }
}
