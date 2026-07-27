import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { DataSource } from 'typeorm';

export type TenantConnection = {
  id: string;
  domain: string;
  dataSource: DataSource;
};

@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantConnection>();

  run<T>(tenant: TenantConnection, callback: () => T): T {
    return this.storage.run(tenant, callback);
  }

  get(): TenantConnection | undefined {
    return this.storage.getStore();
  }

  require(): TenantConnection {
    const tenant = this.get();
    if (!tenant) {
      throw new Error('No tenant database is bound to this execution context');
    }
    return tenant;
  }
}
