import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Appointment,
  AuditLog,
  BranchPermission,
  Branch,
  Commission,
  CustomFieldDefinition,
  Customer,
  Department,
  DynamicRoleDefinition,
  Expense,
  Invoice,
  MedicalEpisode,
  Product,
  Staff,
  StockBatch,
  Supplier,
  Treatment,
  User,
} from '../entities/entities';
import { RecordsController } from './records.controller';
import { RecordsService } from './records.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Branch,
      Department,
      Staff,
      BranchPermission,
      User,
      DynamicRoleDefinition,
      Customer,
      Supplier,
      Product,
      MedicalEpisode,
      Appointment,
      StockBatch,
      Invoice,
      Expense,
      Treatment,
      Commission,
      CustomFieldDefinition,
      AuditLog,
    ]),
  ],
  controllers: [RecordsController],
  providers: [RecordsService],
  exports: [RecordsService],
})
export class RecordsModule {}
