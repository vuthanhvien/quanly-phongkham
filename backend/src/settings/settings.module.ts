import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchPermission, CustomFieldDefinition, DynamicRoleDefinition, PrintTemplate, User, ViewSetting } from '../entities/entities';
import { RecordsModule } from '../records/records.module';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([CustomFieldDefinition, ViewSetting, PrintTemplate, DynamicRoleDefinition, User, BranchPermission]), RecordsModule],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}

