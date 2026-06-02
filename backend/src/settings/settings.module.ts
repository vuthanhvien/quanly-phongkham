import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchRoleAssignment, CustomFieldDefinition, DynamicRoleDefinition, LandingFormSubmission, LandingPage, PrintTemplate, User, ViewSetting } from '../entities/entities';
import { RecordsModule } from '../records/records.module';
import { PublicLandingPagesController, SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([CustomFieldDefinition, ViewSetting, PrintTemplate, DynamicRoleDefinition, User, BranchRoleAssignment, LandingPage, LandingFormSubmission]), RecordsModule],
  controllers: [SettingsController, PublicLandingPagesController],
  providers: [SettingsService],
})
export class SettingsModule {}

