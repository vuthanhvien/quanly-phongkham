import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Put, Query, Request, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AuthUser, Public } from '../common/auth';
import { AppUiSetting, BranchRoleAssignment, ChatbotSetting, CustomFieldDefinition, CustomTable, CustomTableColumn, DynamicRoleDefinition, LandingForm, LandingPage, LandingThemeSetting, PrintTemplate } from '../entities/entities';
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

  @Get('custom-tables')
  async customTables(@Query('includeRows') includeRows?: string, @Request() request?: { user: AuthUser }) { return { data: await this.settings.listCustomTables(request?.user, includeRows === 'true') }; }

  @Post('custom-tables')
  async createCustomTable(@Body() payload: Partial<CustomTable> & { columns?: Partial<CustomTableColumn>[] }, @Request() request?: { user: AuthUser }) { return { data: await this.settings.createCustomTable(payload, request?.user) }; }

  @Patch('custom-tables/:id')
  async updateCustomTable(@Param('id') id: string, @Body() payload: Partial<CustomTable> & { columns?: Partial<CustomTableColumn>[] }, @Request() request?: { user: AuthUser }) { return { data: await this.settings.updateCustomTable(id, payload, request?.user) }; }

  @Delete('custom-tables/:id')
  async removeCustomTable(@Param('id') id: string, @Request() request?: { user: AuthUser }) { return { data: await this.settings.deleteCustomTable(id, request?.user) }; }

  @Get('custom-tables/:id/rows')
  async customTableRows(@Param('id') id: string, @Request() request?: { user: AuthUser }) { return { data: await this.settings.listCustomTableRows(id, request?.user) }; }

  @Post('custom-tables/:id/rows')
  async createCustomTableRow(@Param('id') id: string, @Body('values') values: Record<string, unknown>, @Request() request?: { user: AuthUser }) { return { data: await this.settings.createCustomTableRow(id, values || {}, request?.user) }; }

  @Patch('custom-tables/:tableId/rows/:id')
  async updateCustomTableRow(@Param('tableId') tableId: string, @Param('id') id: string, @Body('values') values: Record<string, unknown>, @Request() request?: { user: AuthUser }) { return { data: await this.settings.updateCustomTableRow(tableId, id, values || {}, request?.user) }; }

  @Delete('custom-tables/:tableId/rows/:id')
  async removeCustomTableRow(@Param('tableId') tableId: string, @Param('id') id: string, @Request() request?: { user: AuthUser }) { return { data: await this.settings.deleteCustomTableRow(tableId, id, request?.user) }; }

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

  @Get('landing-forms')
  async landingForms(@Request() request?: { user: AuthUser }) {
    return { data: await this.settings.listLandingForms(request?.user) };
  }

  @Post('landing-forms')
  async createLandingForm(@Body() payload: Partial<LandingForm>, @Request() request?: { user: AuthUser }) {
    return { data: await this.settings.createLandingForm(payload, request?.user) };
  }

  @Patch('landing-forms/:id')
  async updateLandingForm(@Param('id') id: string, @Body() payload: Partial<LandingForm>, @Request() request?: { user: AuthUser }) {
    return { data: await this.settings.updateLandingForm(id, payload, request?.user) };
  }

  @Get('landing-forms/:id/submissions')
  async landingFormSubmissions(@Param('id') id: string, @Request() request?: { user: AuthUser }) {
    return { data: await this.settings.listLandingFormSubmissions(id, request?.user) };
  }

  @Post('landing-form-submissions/:id/approve')
  async approveLandingFormSubmission(@Param('id') id: string, @Request() request?: { user: AuthUser }) {
    return { data: await this.settings.approveLandingFormSubmission(id, request?.user) };
  }

  @Get('landing-domains')
  async landingDomains(@Request() request?: { user: AuthUser }) {
    return { data: await this.settings.listLandingDomains(request?.user) };
  }

  @Post('landing-domains')
  async createLandingDomain(@Body() payload: { domain?: string; landingPageId?: string }, @Request() request?: { user: AuthUser }) {
    return { data: await this.settings.createLandingDomain(payload, request?.user) };
  }

  @Patch('landing-domains/:domain')
  async updateLandingDomain(@Param('domain') domain: string, @Body() payload: { domain?: string; landingPageId?: string }, @Request() request?: { user: AuthUser }) {
    return { data: await this.settings.updateLandingDomain(domain, payload, request?.user) };
  }

  @Delete('landing-domains/:domain')
  async removeLandingDomain(@Param('domain') domain: string, @Request() request?: { user: AuthUser }) {
    return { data: await this.settings.deleteLandingDomain(domain, request?.user) };
  }

  @Public()
  @Get('app-ui')
  async appUi(@Request() request?: { user: AuthUser }) {
    return { data: request?.user ? await this.settings.getAppUiSettings(request?.user) : await this.settings.getPublicAppUiSettings() };
  }

  @Public()
  @Patch('app-ui')
  async updateAppUi(@Body() payload: Partial<AppUiSetting>, @Request() request?: { user: AuthUser }) {
    return { data: await this.settings.updateAppUiSettings(payload, request?.user) };
  }

  @Post('app-ui/initialize-industry-data')
  async initializeIndustryData(@Body() payload: { companyType?: string }, @Request() request?: { user: AuthUser }) {
    return { data: await this.settings.initializeIndustryData(payload?.companyType, request?.user) };
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

  @Get('landing-menu')
  getLandingMenu() {
    return this.settings.getLandingMenuSettings();
  }

  @Put('landing-menu')
  updateLandingMenu(@Body() payload: { menuItems?: Record<string, unknown>[] }) {
    return this.settings.updateLandingMenuSettings(payload?.menuItems ?? []);
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

  @Post('print-templates/docx')
  @UseInterceptors(FileInterceptor('file'))
  async createDocxTemplate(@UploadedFile() file: any, @Body() payload: { entityType?: string; name?: string }, @Request() request?: { user: AuthUser }) {
    return { data: await this.settings.saveDocxTemplate(file, payload, request?.user) };
  }

  @Get('print-templates/:id/render/:recordId')
  @Header('Content-Type', 'text/html; charset=utf-8')
  render(@Param('id') id: string, @Param('recordId') recordId: string) {
    return this.settings.renderTemplate(id, recordId);
  }

  @Get('print-templates/:id/docx/:recordId')
  async renderDocx(@Param('id') id: string, @Param('recordId') recordId: string, @Res() response: Response) {
    const result = await this.settings.renderDocxTemplate(id, recordId);
    response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    response.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.filename)}"`);
    response.send(result.buffer);
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
  @Get('menu')
  getLandingMenu() {
    return this.settings.getLandingMenuSettings();
  }

  @Public()
  @Get('resolve')
  async resolve(@Query('path') path?: string, @Query('domain') domain?: string, @Request() request?: { headers?: Record<string, string | string[] | undefined> }) {
    const requestDomain = String(request?.headers?.['x-forwarded-host'] || request?.headers?.host || '').split(',')[0];
    return { data: await this.settings.findPublishedLandingPageByPath(path, domain || requestDomain) };
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
