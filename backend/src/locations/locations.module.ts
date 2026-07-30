import { Module } from '@nestjs/common';
import { TenantOrmModule } from '../tenant/tenant-orm.module';
import { LocationCountry, LocationProvince, LocationWard } from '../entities/entities';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

@Module({ imports: [TenantOrmModule.forFeature([LocationCountry, LocationProvince, LocationWard])], controllers: [LocationsController], providers: [LocationsService] })
export class LocationsModule {}
