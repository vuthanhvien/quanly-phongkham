import { Module } from '@nestjs/common';
import { KpiAssignment, KpiCheckin, KpiCycle, KpiMetric, Staff } from '../entities/entities';
import { TenantOrmModule } from '../tenant/tenant-orm.module';
import { KpiController } from './kpi.controller';
import { KpiService } from './kpi.service';

@Module({
  imports: [TenantOrmModule.forFeature([KpiCycle, KpiMetric, KpiAssignment, KpiCheckin, Staff])],
  controllers: [KpiController],
  providers: [KpiService],
})
export class KpiModule {}
