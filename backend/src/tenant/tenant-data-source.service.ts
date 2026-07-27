import { Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { ENTITIES } from '../entities/entities';
import { Tenant } from './tenant.entity';
import { TenantConnection, TenantContextService } from './tenant-context.service';

type TenantBootstrapConfig = { domain: string; databaseUrl: string };

function databaseType(databaseUrl: string): 'mysql' | 'postgres' {
  if (databaseUrl.startsWith('mysql://') || databaseUrl.startsWith('mysql2://')) return 'mysql';
  if (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://')) return 'postgres';
  throw new Error('Unsupported database URL. Use mysql:// or postgresql://');
}

function normalizeDomain(value: string) {
  return String(value || '')
    .split(',')[0]
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/:\d+$/, '')
    .replace(/\.$/, '');
}

@Injectable()
export class TenantDataSourceService implements OnModuleInit, OnModuleDestroy {
  private management?: DataSource;
  private readonly connections = new Map<string, TenantConnection>();
  private readonly initializing = new Map<string, Promise<TenantConnection>>();
  private readonly isMultiTenant: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly context: TenantContextService,
  ) {
    this.isMultiTenant = Boolean(this.config.get<string>('MANAGEMENT_DATABASE_URL'));
  }

  async onModuleInit() {
    if (!this.isMultiTenant) return;

    const managementUrl = this.config.getOrThrow<string>('MANAGEMENT_DATABASE_URL');
    this.management = new DataSource({
      type: databaseType(managementUrl),
      url: managementUrl,
      entities: [Tenant],
      synchronize: this.shouldSynchronize(),
    });
    await this.management.initialize();
    await this.importBootstrapTenants();
  }

  async onModuleDestroy() {
    await Promise.all([...this.connections.values()].map(({ dataSource }) => dataSource.destroy()));
    if (this.management?.isInitialized) await this.management.destroy();
  }

  async resolveHost(host: string): Promise<TenantConnection> {
    if (!this.isMultiTenant) {
      return this.connect({
        id: 'default',
        domain: normalizeDomain(host) || 'default',
        databaseUrl: this.config.getOrThrow<string>('DATABASE_URL'),
      });
    }

    const domain = normalizeDomain(host);
    const tenant = await this.management!.getRepository(Tenant).findOne({ where: { domain, isActive: true } });
    if (!tenant) throw new NotFoundException(`Không tìm thấy tenant đang hoạt động cho domain: ${domain || '(trống)'}`);
    return this.connect(tenant);
  }

  async activeTenants(): Promise<TenantConnection[]> {
    if (!this.isMultiTenant) return [await this.resolveHost('default')];
    const tenants = await this.management!.getRepository(Tenant).find({ where: { isActive: true } });
    return Promise.all(tenants.map((tenant) => this.connect(tenant)));
  }

  async runWithTenant<T>(tenant: TenantConnection, callback: () => Promise<T>): Promise<T> {
    return this.context.run(tenant, callback);
  }

  private async connect(tenant: Pick<Tenant, 'id' | 'domain' | 'databaseUrl'>): Promise<TenantConnection> {
    const cached = this.connections.get(tenant.id);
    if (cached) return cached;

    const pending = this.initializing.get(tenant.id);
    if (pending) return pending;

    const initialization = (async () => {
      const options: DataSourceOptions = {
        type: databaseType(tenant.databaseUrl),
        url: tenant.databaseUrl,
        entities: ENTITIES,
        synchronize: this.shouldSynchronize(),
      };
      const dataSource = new DataSource(options);
      await dataSource.initialize();
      const connection = { id: tenant.id, domain: tenant.domain, dataSource };
      this.connections.set(tenant.id, connection);
      return connection;
    })();
    this.initializing.set(tenant.id, initialization);
    try {
      return await initialization;
    } finally {
      this.initializing.delete(tenant.id);
    }
  }

  private shouldSynchronize() {
    return this.config.get<string>('TYPEORM_SYNCHRONIZE', 'true').toLowerCase() === 'true';
  }

  private async importBootstrapTenants() {
    const raw = this.config.get<string>('TENANTS_JSON');
    if (!raw) return;
    let entries: TenantBootstrapConfig[];
    try {
      entries = JSON.parse(raw);
    } catch {
      throw new Error('TENANTS_JSON must be a JSON array of { domain, databaseUrl } objects');
    }
    if (!Array.isArray(entries)) throw new Error('TENANTS_JSON must be a JSON array');

    const repository = this.management!.getRepository(Tenant);
    for (const entry of entries) {
      const domain = normalizeDomain(entry.domain);
      if (!domain || !entry.databaseUrl) throw new Error('Each TENANTS_JSON item needs domain and databaseUrl');
      await repository.upsert({ domain, databaseUrl: entry.databaseUrl, isActive: true }, ['domain']);
    }
  }
}
