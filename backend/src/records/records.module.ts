import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Appointment,
  AuditLog,
  Branch,
  Commission,
  CustomFieldDefinition,
  Customer,
  Expense,
  Invoice,
  MedicalEpisode,
  Product,
  StockBatch,
  Supplier,
  Treatment,
} from '../entities/entities';
import { RecordsController } from './records.controller';
import { RecordsService } from './records.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Branch,
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

