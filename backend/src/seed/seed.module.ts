import { Module } from '@nestjs/common';
import { TenantModule, TenantOrmModule } from '../tenant/tenant-orm.module';
import { ENTITIES } from '../entities/entities';
import { SeedService } from './seed.service';

@Module({
  imports: [TenantModule, TenantOrmModule.forFeature(ENTITIES)],
  providers: [SeedService],
})
export class SeedModule {}
