import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Put, Query, Request, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthUser, Public } from '../common/auth';
import { AppUiSetting, BranchRoleAssignment, ChatbotSetting, CustomFieldDefinition, DynamicRoleDefinition, LandingPage, LandingThemeSetting, PrintTemplate } from '../entities/entities';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('custom-fields')
  async fields(@Query('entityType') entityType?: string, @Request() request?: { user: AuthUser }) {
    return { data: await this.settings.listFields(entityType, request?.user) };
  }

  @Post('custom-fields')
  async createField(@Body() payload: Partial<CustomFieldDefinition>, @Request() request?: { user: AuthUser }) {
    return { data: await this.settings.createField(payload, request?.user) };
  }

  @Patch('custom-fields/:id')
  async updateField(@Param('id') id: string, @Body() payload: Partial<CustomFieldDefinition>, @Request() request?: { user: AuthUser }) {
    return { data: await this.settings.updateField(id, payload, request?.user) };
  }

  @Delete('custom-fields/:id')
  async removeField(@Param('id') id: string, @Request() request?: { user: AuthUser }) {
    return { data: await this.settings.deleteField(id, request?.user) };
  }

  @Get('views')
  async views(@Query('entityType') entityType?: string, @Request() request?: { user: AuthUser }) {
    return { data: await this.settings.listViews(entityType, request?.user) };
  }

  @Put('views/:entityType/:viewType')
  async saveView(
    @Param('entityType') entityType: string,
    @Param('viewType') viewType: string,
    @Body() payload: { config: Record<string, unknown>; role?: string },
    @Request() request?: { user: AuthUser },
  ) {
    return { data: await this.settings.saveView(entityType, viewType, payload.config, payload.role, request?.user) };
  }

  @Delete('views/:entityType')
  async deleteViews(
    @Param('entityType') entityType: string,
    @Query('role') role?: string,
    @Request() request?: { user: AuthUser },
  ) {
    return { data: await this.settings.deleteViews(entityType, role, request?.user) };
  }

  @Get('print-templates')
  async templates(@Query('entityType') entityType?: string, @Request() request?: { user: AuthUser }) {
    return { data: await this.settings.listTemplates(entityType, request?.user) };
  }

  @Get('dynamic-roles')
  async roles(@Request() request?: { user: AuthUser }) {
    return { data: await this.settings.listRoles(request?.user) };
  }

  @Post('dynamic-roles')
  async createRole(@Body() payload: Partial<DynamicRoleDefinition>, @Request() request?: { user: AuthUser }) {
    return { data: await this.settings.createRole(payload, request?.user) };
  }

  @Patch('dynamic-roles/:id')
  async updateRole(@Param('id') id: string, @Body() payload: Partial<DynamicRoleDefinition>, @Request() request?: { user: AuthUser }) {
    return { data: await this.settings.updateRole(id, payload, request?.user) };
  }

  @Delete('dynamic-roles/:id')
  async removeRole(@Param('id') id: string, @Request() request?: { user: AuthUser }) {
    return { data: await this.settings.deleteRole(id, request?.user) };
  }

  @Get('branch-role-assignments')
  async branchRoleAssignments(@Request() request?: { user: AuthUser }) {
    return { data: await this.settings.listBranchRoleAssignments(request?.user) };
  }

  @Post('branch-role-assignments')
  async createBranchRoleAssignment(@Body() payload: Partial<BranchRoleAssignment>, @Request() request?: { user: AuthUser }) {
    return { data: await this.settings.createBranchRoleAssignment(payload, request?.user) };
  }

  @Patch('branch-role-assignments/:id')
  async updateBranchRoleAssignment(@Param('id') id: string, @Body() payload: Partial<BranchRoleAssignment>, @Request() request?: { user: AuthUser }) {
    return { data: await this.settings.updateBranchRoleAssignment(id, payload, request?.user) };
  }

  @Delete('branch-role-assignments/:id')
  async removeBranchRoleAssignment(@Param('id') id: string, @Request() request?: { user: AuthUser }) {
    return { data: await this.settings.deleteBranchRoleAssignment(id, request?.user) };
  }

  @Get('landing-pages')
  async landingPages(@Request() request?: { user: AuthUser }) {
    return { data: await this.settings.listLandingPages(request?.user) };
  }

  @Get('app-ui')
  async appUi(@Request() request?: { user: AuthUser }) {
    return { data: await this.settings.getAppUiSettings(request?.user) };
  }

  @Patch('app-ui')
  async updateAppUi(@Body() payload: Partial<AppUiSetting>, @Request() request?: { user: AuthUser }) {
    return { data: await this.settings.updateAppUiSettings(payload, request?.user) };
  }

  @Get('chatbot')
  async getChatbotSettings(@Request() request?: { user: AuthUser }) {
    return { data: await this.settings.getChatbotSettings(request?.user) };
  }

  @Put('chatbot')
  async updateChatbotSettings(@Body() payload: Partial<ChatbotSetting>, @Request() request?: { user: AuthUser }) {
    return { data: await this.settings.updateChatbotSettings(payload, request?.user) };
  }

  @Get('landing-theme')
  async getLandingTheme(@Request() request?: { user: AuthUser }) {
    return { data: await this.settings.getLandingThemeSettings(request?.user) };
  }

  @Put('landing-theme')
  async updateLandingTheme(@Body() payload: Partial<LandingThemeSetting>, @Request() request?: { user: AuthUser }) {
    return { data: await this.settings.updateLandingThemeSettings(payload, request?.user) };
  }

  @Get('landing-theme/presets')
  async getLandingThemePresets() {
    return { data: await this.settings.getLandingThemePresets() };
  }

  @Get('landing-global')
  getLandingGlobal() {
    return this.settings.getLandingGlobalSettings();
  }

  @Put('landing-global')
  updateLandingGlobal(@Body() payload: Record<string, unknown>) {
    return this.settings.updateLandingGlobalSettings(payload as any);
  }

  @Post('landing-pages')
  async createLandingPage(@Body() payload: Partial<LandingPage>, @Request() request?: { user: AuthUser }) {
    return { data: await this.settings.createLandingPage(payload, request?.user) };
  }

  @Patch('landing-pages/:id')
  async updateLandingPage(@Param('id') id: string, @Body() payload: Partial<LandingPage>, @Request() request?: { user: AuthUser }) {
    return { data: await this.settings.updateLandingPage(id, payload, request?.user) };
  }

  @Delete('landing-pages/:id')
  async removeLandingPage(@Param('id') id: string, @Request() request?: { user: AuthUser }) {
    return { data: await this.settings.deleteLandingPage(id, request?.user) };
  }

  @Post('print-templates')
  async createTemplate(@Body() payload: Partial<PrintTemplate>, @Request() request?: { user: AuthUser }) {
    return { data: await this.settings.saveTemplate(payload, request?.user) };
  }

  @Patch('print-templates/:id')
  async updateTemplate(@Param('id') id: string, @Body() payload: Partial<PrintTemplate>, @Request() request?: { user: AuthUser }) {
    return { data: await this.settings.updateTemplate(id, payload, request?.user) };
  }

  @Get('print-templates/:id/render/:recordId')
  @Header('Content-Type', 'text/html; charset=utf-8')
  render(@Param('id') id: string, @Param('recordId') recordId: string) {
    return this.settings.renderTemplate(id, recordId);
  }
}

@Controller('public/landing-theme')
export class PublicLandingThemeController {
  constructor(private readonly settings: SettingsService) {}

  @Public()
  @Get('style.css')
  async getThemeCss(@Res() res: Response) {
    const css = await this.settings.getLandingThemeCss();
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');
    res.send(css);
  }
}

@Controller('public/landing-pages')
export class PublicLandingPagesController {
  constructor(private readonly settings: SettingsService) {}

  @Public()
  @Get('global')
  getLandingGlobal() {
    return this.settings.getLandingGlobalSettings();
  }

  @Public()
  @Get('resolve')
  async resolve(@Query('path') path?: string) {
    return { data: await this.settings.findPublishedLandingPageByPath(path) };
  }

  @Public()
  @Post(':slug/forms/:blockId/submissions')
  async submitForm(
    @Param('slug') slug: string,
    @Param('blockId') blockId: string,
    @Body() payload: Record<string, unknown>,
  ) {
    return { data: await this.settings.submitLandingForm(slug, blockId, payload) };
  }
}
