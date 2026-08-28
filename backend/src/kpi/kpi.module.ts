import { Module } from '@nestjs/common';
import { Appointment, Attendance, Commission, Consultation, Department, Expense, Invoice, KpiAssignment, KpiCheckin, KpiCheckinRecord, KpiCycle, KpiMetric, Lead, LeaveRequest, ServiceOrder, Staff, Task, Treatment } from '../entities/entities';
import { TenantOrmModule } from '../tenant/tenant-orm.module';
import { KpiController } from './kpi.controller';
import { KpiService } from './kpi.service';

@Module({
  imports: [TenantOrmModule.forFeature([KpiCycle, KpiMetric, KpiAssignment, KpiCheckin, KpiCheckinRecord, Staff, Department, Task, ServiceOrder, Invoice, Appointment, Consultation, Treatment, Attendance, LeaveRequest, Lead, Commission, Expense])],
  controllers: [KpiController],
  providers: [KpiService],
})
export class KpiModule {}
