import { Injectable } from '@nestjs/common';
import { EntityTarget, Repository } from 'typeorm';
import { TenantContextService } from './tenant-context.service';

/** A Repository proxy resolves its real repository from the current request's tenant. */
@Injectable()
export class TenantRepositoryFactory {
  constructor(private readonly context: TenantContextService) {}

  create<Entity extends object>(entity: EntityTarget<Entity>): Repository<Entity> {
    return new Proxy({} as Repository<Entity>, {
      get: (_target, property) => {
        // Nest checks providers for a `then` property while constructing them.
        // A repository proxy must not resolve a request tenant at that stage.
        if (
          property === 'then' ||
          property === 'onModuleInit' ||
          property === 'onApplicationBootstrap' ||
          property === 'onModuleDestroy' ||
          property === 'beforeApplicationShutdown' ||
          property === 'onApplicationShutdown'
        ) return undefined;
        const repository = this.context.require().dataSource.getRepository(entity) as Repository<Entity>;
        const value = Reflect.get(repository, property, repository);
        return typeof value === 'function' ? value.bind(repository) : value;
      },
      set: (_target, property, value) => {
        const repository = this.context.require().dataSource.getRepository(entity) as Repository<Entity>;
        return Reflect.set(repository, property, value, repository);
      },
    });
  }
}
