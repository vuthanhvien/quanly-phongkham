import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { TenantDataSourceService } from './tenant-data-source.service';
import { TenantContextService } from './tenant-context.service';
import { parseGoogleDriveOAuthState } from './google-drive-oauth-state';

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
    const isGoogleDriveCallback = req.originalUrl.split('?')[0].endsWith('/settings/google-drive/callback');
    const isInternalTenantSeed = req.originalUrl.split('?')[0].endsWith('/internal/tenants/seed');
    const callbackDomain = isGoogleDriveCallback ? parseGoogleDriveOAuthState(typeof req.query.state === 'string' ? req.query.state : undefined)?.domain : undefined;
    const seedDomain = isInternalTenantSeed ? String(req.headers['x-tenant-domain'] || '').trim() : undefined;
    // Google redirects to the one shared API domain and has no browser Origin.
    // In that specific callback, the signed/verified OAuth state tells us which
    // tenant database owns the connection.
    // Provisioning runs server-to-server, therefore it has no Origin. Its
    // internal-secret-protected endpoint explicitly supplies the target tenant.
    const host = callbackDomain || seedDomain || originHost || String(req.headers['x-forwarded-host'] || req.headers.host || '');
    const tenant = await this.tenants.resolveHost(host);
    this.context.run(tenant, next);
  }
}
