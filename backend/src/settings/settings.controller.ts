import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Put, Query, Request } from '@nestjs/common';
import { AuthUser } from '../common/auth';
import { BranchPermission, CustomFieldDefinition, DynamicRoleDefinition, PrintTemplate } from '../entities/entities';
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
  async createBranchRoleAssignment(@Body() payload: Partial<BranchPermission>, @Request() request?: { user: AuthUser }) {
    return { data: await this.settings.createBranchRoleAssignment(payload, request?.user) };
  }

  @Patch('branch-role-assignments/:id')
  async updateBranchRoleAssignment(@Param('id') id: string, @Body() payload: Partial<BranchPermission>, @Request() request?: { user: AuthUser }) {
    return { data: await this.settings.updateBranchRoleAssignment(id, payload, request?.user) };
  }

  @Delete('branch-role-assignments/:id')
  async removeBranchRoleAssignment(@Param('id') id: string, @Request() request?: { user: AuthUser }) {
    return { data: await this.settings.deleteBranchRoleAssignment(id, request?.user) };
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
