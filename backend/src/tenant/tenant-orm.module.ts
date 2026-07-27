import { DynamicModule, Module, Provider, Type } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityTarget } from 'typeorm';
import { TenantDataSourceService } from './tenant-data-source.service';
import { TenantContextService } from './tenant-context.service';
import { TenantRepositoryFactory } from './tenant-repository.factory';

@Module({
  providers: [TenantContextService, TenantDataSourceService, TenantRepositoryFactory],
  exports: [TenantContextService, TenantDataSourceService, TenantRepositoryFactory],
})
export class TenantModule {}

export class TenantOrmModule {
  static forFeature(entities: EntityTarget<object>[]): DynamicModule {
    const providers: Provider[] = entities.map((entity) => ({
      provide: getRepositoryToken(entity as any),
      inject: [TenantRepositoryFactory],
      useFactory: (factory: TenantRepositoryFactory) => factory.create(entity),
    }));
    return { module: TenantOrmModule, imports: [TenantModule], providers, exports: providers };
  }
}
