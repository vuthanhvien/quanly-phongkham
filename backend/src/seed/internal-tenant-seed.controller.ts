import { Controller, ForbiddenException, Headers, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../common/auth';
import { SeedService } from './seed.service';

@Public()
@Controller('internal/tenants')
export class InternalTenantSeedController {
  constructor(
    private readonly config: ConfigService,
    private readonly seed: SeedService,
  ) {}

  @Post('seed')
  async seedTenant(@Headers('x-platform-internal-secret') secret: string, @Headers('x-tenant-domain') domain: string) {
    const expected = this.config.get<string>('PLATFORM_INTERNAL_SEED_SECRET')
      || this.config.get<string>('PLATFORM_JWT_SECRET')
      || this.config.get<string>('JWT_SECRET');
    if (!expected || secret !== expected) throw new ForbiddenException('Không có quyền khởi tạo tenant');
    if (!domain) throw new ForbiddenException('Thiếu domain tenant');
    await this.seed.seedDomain(domain);
    return { data: { seeded: true } };
  }
}
