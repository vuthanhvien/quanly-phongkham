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
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
    const tenant = await this.tenants.resolveHost(host);
    this.context.run(tenant, next);
  }
}
