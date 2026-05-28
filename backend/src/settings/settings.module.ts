import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchRoleAssignment, CustomFieldDefinition, DynamicRoleDefinition, PrintTemplate, User, ViewSetting } from '../entities/entities';
import { RecordsModule } from '../records/records.module';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([CustomFieldDefinition, ViewSetting, PrintTemplate, DynamicRoleDefinition, User, BranchRoleAssignment]), RecordsModule],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}

