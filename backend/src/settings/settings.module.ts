import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment, AppUiSetting, BranchRoleAssignment, ChatbotSetting, Customer, CustomFieldDefinition, DynamicRoleDefinition, LandingFormSubmission, LandingGlobalSetting, LandingPage, LandingThemeSetting, PrintTemplate, Treatment, User, ViewSetting, WorkSchedule } from '../entities/entities';
import { RecordsModule } from '../records/records.module';
import { ChatbotController } from './chatbot.controller';
import { PublicLandingPagesController, PublicLandingThemeController, SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([CustomFieldDefinition, ViewSetting, PrintTemplate, DynamicRoleDefinition, User, BranchRoleAssignment, LandingPage, LandingFormSubmission, AppUiSetting, ChatbotSetting, LandingThemeSetting, LandingGlobalSetting, Treatment, Appointment, WorkSchedule, Customer]), RecordsModule],
  controllers: [SettingsController, PublicLandingPagesController, PublicLandingThemeController, ChatbotController],
  providers: [SettingsService],
})
export class SettingsModule {}
