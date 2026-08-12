import { Module } from '@nestjs/common';
import { TenantOrmModule } from '../tenant/tenant-orm.module';
import { LocationCountry, LocationProvince, LocationWard, MasterData } from '../entities/entities';
import { LocationsController, MasterDataController } from './locations.controller';
import { LocationsService } from './locations.service';

@Module({ imports: [TenantOrmModule.forFeature([LocationCountry, LocationProvince, LocationWard, MasterData])], controllers: [LocationsController, MasterDataController], providers: [LocationsService] })
export class LocationsModule {}
