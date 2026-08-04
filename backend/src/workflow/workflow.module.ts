import { Module } from '@nestjs/common';
import { TenantOrmModule } from '../tenant/tenant-orm.module';
import {
  Attendance,
  AttendanceAdjustmentRequest,
  BranchRoleAssignment,
  BusinessTripRequest,
  Department,
  LeaveRequest,
  PaymentRequest,
  Staff,
  User,
  WorkflowAction,
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowStep,
  WorkflowTask,
} from '../entities/entities';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';

@Module({
  imports: [
    TenantOrmModule.forFeature([
      Attendance,
      AttendanceAdjustmentRequest,
      BranchRoleAssignment,
      BusinessTripRequest,
      Department,
      LeaveRequest,
      PaymentRequest,
      Staff,
      User,
      WorkflowAction,
      WorkflowDefinition,
      WorkflowInstance,
      WorkflowStep,
      WorkflowTask,
    ]),
  ],
  controllers: [WorkflowController],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
