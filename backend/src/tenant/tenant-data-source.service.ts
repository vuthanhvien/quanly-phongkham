import { Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { ENTITIES } from '../entities/entities';
import { PlatformAdmin, Tenant } from './tenant.entity';
import { TenantConnection, TenantContextService } from './tenant-context.service';

type TenantBootstrapConfig = { domain: string; databaseUrl: string };

function databaseType(databaseUrl: string): 'mysql' | 'postgres' {
  if (databaseUrl.startsWith('mysql://') || databaseUrl.startsWith('mysql2://')) return 'mysql';
  if (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://')) return 'postgres';
  throw new Error('Unsupported database URL. Use mysql:// or postgresql://');
}

function connectionOptions(databaseUrl: string, entities: DataSourceOptions['entities']): DataSourceOptions {
  const type = databaseType(databaseUrl);
  return {
    type,
    url: databaseUrl,
    entities,
    // Required for Vietnamese labels/defaults in both the management DB and
    // tenant DBs. This affects new connections; existing databases should
    // still have their default charset migrated to utf8mb4 once.
    ...(type === 'mysql' ? { charset: 'utf8mb4' } : {}),
  } as DataSourceOptions;
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
  /** A database may legitimately be mapped to aliases such as a.vienvu.com and dev1.vienvu.com. */
  private readonly dataSources = new Map<string, DataSource>();
  private readonly initializing = new Map<string, Promise<DataSource>>();
  private readonly domainCache = new Map<string, { tenant?: Tenant; expiresAt: number }>();
  private readonly domainCacheTtlMs: number;
  private readonly isMultiTenant: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly context: TenantContextService,
  ) {
    this.isMultiTenant = Boolean(this.config.get<string>('MANAGEMENT_DATABASE_URL'));
    this.domainCacheTtlMs = Math.max(1_000, Number(this.config.get<string>('TENANT_DOMAIN_CACHE_TTL_MS', '300000')) || 300_000);
  }

  async onModuleInit() {
    if (!this.isMultiTenant) return;

    const managementUrl = this.config.getOrThrow<string>('MANAGEMENT_DATABASE_URL');
    this.management = new DataSource({
      ...connectionOptions(managementUrl, [Tenant, PlatformAdmin]),
      synchronize: this.shouldSynchronize(),
    });
    await this.management.initialize();
    await this.importBootstrapTenants();
  }

  async onModuleDestroy() {
    await Promise.all([...this.dataSources.values()].map((dataSource) => dataSource.destroy()));
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
    const tenant = await this.findActiveTenantByDomain(domain);
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

  isManagementEnabled() {
    return this.isMultiTenant;
  }

  managementDataSource() {
    if (!this.management?.isInitialized) throw new Error('Management database is not configured');
    return this.management;
  }

  async listTenants() {
    return this.managementDataSource().getRepository(Tenant).find({ order: { domain: 'ASC' } });
  }

  async createTenant(input: Pick<Tenant, 'domain' | 'databaseUrl' | 'isActive'>) {
    const tenant = this.managementDataSource().getRepository(Tenant).create({ ...input, domain: normalizeDomain(input.domain) });
    const saved = await this.managementDataSource().getRepository(Tenant).save(tenant);
    this.invalidateTenant(saved);
    return saved;
  }

  async updateTenant(id: string, input: Partial<Pick<Tenant, 'domain' | 'databaseUrl' | 'isActive'>>) {
    const repository = this.managementDataSource().getRepository(Tenant);
    const existing = await repository.findOneBy({ id });
    if (!existing) throw new NotFoundException('Không tìm thấy tenant');
    const saved = await repository.save({ ...existing, ...input, domain: input.domain === undefined ? existing.domain : normalizeDomain(input.domain) });
    this.invalidateTenant(existing);
    this.invalidateTenant(saved);
    return saved;
  }

  private async findActiveTenantByDomain(domain: string) {
    const cached = this.domainCache.get(domain);
    if (cached && cached.expiresAt > Date.now()) return cached.tenant;
    const tenant = await this.management!.getRepository(Tenant).findOne({ where: { domain, isActive: true } });
    this.domainCache.set(domain, { tenant: tenant || undefined, expiresAt: Date.now() + this.domainCacheTtlMs });
    return tenant || undefined;
  }

  private invalidateTenant(tenant: Pick<Tenant, 'id' | 'domain'>) {
    this.domainCache.delete(tenant.domain);
    const connection = this.connections.get(tenant.id);
    if (connection) {
      this.connections.delete(tenant.id);
      const isStillUsed = [...this.connections.values()].some(({ dataSource }) => dataSource === connection.dataSource);
      if (!isStillUsed) {
        for (const [databaseUrl, dataSource] of this.dataSources) {
          if (dataSource === connection.dataSource) this.dataSources.delete(databaseUrl);
        }
        void connection.dataSource.destroy();
      }
    }
  }

  private async connect(tenant: Pick<Tenant, 'id' | 'domain' | 'databaseUrl'>): Promise<TenantConnection> {
    const cached = this.connections.get(tenant.id);
    if (cached) return cached;

    const databaseKey = tenant.databaseUrl;
    let dataSource = this.dataSources.get(databaseKey);
    if (!dataSource) {
      let pending = this.initializing.get(databaseKey);
      if (!pending) {
        pending = (async () => {
          const options: DataSourceOptions = {
            ...connectionOptions(tenant.databaseUrl, ENTITIES),
            synchronize: this.shouldSynchronize(),
          };
          const source = new DataSource(options);
          await source.initialize();
          this.dataSources.set(databaseKey, source);
          return source;
        })();
        this.initializing.set(databaseKey, pending);
      }
      try {
        dataSource = await pending;
      } finally {
        this.initializing.delete(databaseKey);
      }
    }

    const connection = { id: tenant.id, domain: tenant.domain, dataSource };
    this.connections.set(tenant.id, connection);
    return connection;
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
      this.domainCache.delete(domain);
    }
  }
}
