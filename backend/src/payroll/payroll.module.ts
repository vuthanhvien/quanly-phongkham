import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attendance, LeaveRequest, Payroll, Staff, StaffInsurance, WorkContract } from '../entities/entities';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';

@Module({
  imports: [TypeOrmModule.forFeature([WorkContract, StaffInsurance, Attendance, LeaveRequest, Payroll, Staff])],
  controllers: [PayrollController],
  providers: [PayrollService],
})
export class PayrollModule {}
