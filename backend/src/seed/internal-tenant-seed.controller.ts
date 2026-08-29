import { Body, Controller, ForbiddenException, Headers, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../common/auth';
import { SeedService } from './seed.service';
import { TenantDataSourceService } from '../tenant/tenant-data-source.service';

@Public()
@Controller('internal/tenants')
export class InternalTenantSeedController {
  constructor(
    private readonly config: ConfigService,
    private readonly seed: SeedService,
    private readonly tenants: TenantDataSourceService,
  ) {}

  private assertInternalSecret(secret: string) {
    const expected = this.config.get<string>('PLATFORM_INTERNAL_SEED_SECRET')
      || this.config.get<string>('PLATFORM_JWT_SECRET')
      || this.config.get<string>('JWT_SECRET');
    if (!expected || secret !== expected) throw new ForbiddenException('Không có quyền khởi tạo tenant');
  }

  @Post('sync')
  async syncTenant(
    @Headers('x-platform-internal-secret') secret: string,
    @Body() payload: { domain?: string; databaseUrl?: string; isActive?: boolean },
  ) {
    this.assertInternalSecret(secret);
    const tenant = await this.tenants.syncTenantFromPlatform({
      domain: String(payload.domain || ''),
      databaseUrl: String(payload.databaseUrl || ''),
      isActive: payload.isActive !== false,
    });
    return { data: { domain: tenant.domain, isActive: tenant.isActive, synced: true } };
  }

  @Post('seed')
  async seedTenant(@Headers('x-platform-internal-secret') secret: string, @Headers('x-tenant-domain') domain: string) {
    this.assertInternalSecret(secret);
    if (!domain) throw new ForbiddenException('Thiếu domain tenant');
    await this.seed.seedDomain(domain);
    return { data: { seeded: true } };
  }
}
