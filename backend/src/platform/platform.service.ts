import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { TenantDataSourceService } from '../tenant/tenant-data-source.service';
import { PlatformAdmin } from '../tenant/tenant.entity';

@Injectable()
export class PlatformService {
  constructor(
    private readonly tenants: TenantDataSourceService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const admin = await this.adminRepository().findOne({ where: { email: String(email || '').trim().toLowerCase(), isActive: true } });
    if (!admin || !(await compare(password, admin.passwordHash))) throw new UnauthorizedException('Thông tin đăng nhập hoặc mật khẩu không đúng');
    const user = { kind: 'platform' as const, id: admin.id, email: admin.email, fullName: admin.fullName, role: 'SUPER_ADMIN' };
    return { accessToken: this.jwt.sign(user), user };
  }

  async ensureInitialAdmin() {
    if (!this.tenants.isManagementEnabled()) return;
    const repository = this.adminRepository();
    if (await repository.exist()) return;
    const email = String(this.config.get<string>('PLATFORM_ADMIN_EMAIL') || '').trim().toLowerCase();
    const password = String(this.config.get<string>('PLATFORM_ADMIN_PASSWORD') || '');
    if (!email || !password) return;
    await repository.save(repository.create({ email, passwordHash: await hash(password, 10), fullName: this.config.get<string>('PLATFORM_ADMIN_NAME', 'Super Admin'), isActive: true }));
  }

  listTenants() {
    return this.tenants.listTenants();
  }

  async createTenant(payload: { domain: string; databaseUrl: string; isActive?: boolean }) {
    if (!String(payload.domain || '').trim() || !String(payload.databaseUrl || '').trim()) throw new BadRequestException('Domain và database URL là bắt buộc');
    return this.tenants.createTenant({ domain: payload.domain, databaseUrl: payload.databaseUrl, isActive: payload.isActive !== false });
  }

  async updateTenant(id: string, payload: { domain?: string; databaseUrl?: string; isActive?: boolean }) {
    if (payload.domain !== undefined && !String(payload.domain).trim()) throw new BadRequestException('Domain không được để trống');
    return this.tenants.updateTenant(id, payload);
  }

  private adminRepository() {
    return this.tenants.managementDataSource().getRepository(PlatformAdmin);
  }
}
