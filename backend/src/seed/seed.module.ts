import { Module } from '@nestjs/common';
import { TenantModule, TenantOrmModule } from '../tenant/tenant-orm.module';
import { RecordsModule } from '../records/records.module';
import { ENTITIES } from '../entities/entities';
import { SeedService } from './seed.service';
import { InternalTenantSeedController } from './internal-tenant-seed.controller';

@Module({
  imports: [TenantModule, RecordsModule, TenantOrmModule.forFeature(ENTITIES)],
  providers: [SeedService],
  exports: [SeedService],
  controllers: [InternalTenantSeedController],
})
export class SeedModule {}
