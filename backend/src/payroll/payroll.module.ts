import { Module } from '@nestjs/common';
import { TenantOrmModule } from '../tenant/tenant-orm.module';
import { Attendance, LeaveRequest, Payroll, Staff, StaffInsurance, WorkContract } from '../entities/entities';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';

@Module({
  imports: [TenantOrmModule.forFeature([WorkContract, StaffInsurance, Attendance, LeaveRequest, Payroll, Staff])],
  controllers: [PayrollController],
  providers: [PayrollService],
})
export class PayrollModule {}
