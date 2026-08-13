import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { TenantDataSourceService } from './tenant-data-source.service';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly tenants: TenantDataSourceService,
    private readonly context: TenantContextService,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    // The API may be reached through an internal host (for example 127.0.0.1)
    // while the browser's Origin contains the tenant domain.
    const origin = String(req.headers.origin || '').split(',')[0].trim();
    let originHost = '';
    try { originHost = origin ? new URL(origin).host : ''; } catch { /* fall back to proxy/direct host */ }
    const host = originHost || String(req.headers['x-forwarded-host'] || req.headers.host || '');
    const tenant = await this.tenants.resolveHost(host);
    this.context.run(tenant, next);
  }
}
