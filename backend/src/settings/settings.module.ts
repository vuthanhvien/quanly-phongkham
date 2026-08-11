import { Module } from '@nestjs/common';
import { TenantOrmModule } from '../tenant/tenant-orm.module';
import { AdminChatbotConversation, AdminChatbotMessage, Appointment, AppUiSetting, BranchRoleAssignment, ChatbotSetting, Customer, CustomFieldDefinition, CustomTable, CustomTableColumn, CustomTableRow, DynamicRoleDefinition, GoogleDriveConnection, ItemCategory, LandingDomain, LandingForm, LandingFormSubmission, LandingGlobalSetting, LandingPage, LandingThemeSetting, PrintTemplate, Product, Staff, Treatment, Unit, User, ViewSetting, WorkSchedule } from '../entities/entities';
import { RecordsModule } from '../records/records.module';
import { ChatbotController } from './chatbot.controller';
import { PublicLandingPagesController, PublicLandingThemeController, SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [TenantOrmModule.forFeature([CustomFieldDefinition, CustomTable, CustomTableColumn, CustomTableRow, ViewSetting, PrintTemplate, DynamicRoleDefinition, User, BranchRoleAssignment, LandingPage, LandingDomain, LandingForm, LandingFormSubmission, AppUiSetting, GoogleDriveConnection, ChatbotSetting, AdminChatbotConversation, AdminChatbotMessage, LandingThemeSetting, LandingGlobalSetting, Treatment, Appointment, WorkSchedule, Customer, Staff, Unit, ItemCategory, Product]), RecordsModule],
  controllers: [SettingsController, PublicLandingPagesController, PublicLandingThemeController, ChatbotController],
  providers: [SettingsService],
})
export class SettingsModule {}
