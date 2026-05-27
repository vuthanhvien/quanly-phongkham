import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { CustomFieldDefinition, PrintTemplate } from '../entities/entities';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('custom-fields')
  async fields(@Query('entityType') entityType?: string) {
    return { data: await this.settings.listFields(entityType) };
  }

  @Post('custom-fields')
  async createField(@Body() payload: Partial<CustomFieldDefinition>) {
    return { data: await this.settings.createField(payload) };
  }

  @Patch('custom-fields/:id')
  async updateField(@Param('id') id: string, @Body() payload: Partial<CustomFieldDefinition>) {
    return { data: await this.settings.updateField(id, payload) };
  }

  @Delete('custom-fields/:id')
  async removeField(@Param('id') id: string) {
    return { data: await this.settings.deleteField(id) };
  }

  @Get('views')
  async views(@Query('entityType') entityType?: string) {
    return { data: await this.settings.listViews(entityType) };
  }

  @Put('views/:entityType/:viewType')
  async saveView(
    @Param('entityType') entityType: string,
    @Param('viewType') viewType: string,
    @Body() payload: { config: Record<string, unknown> },
  ) {
    return { data: await this.settings.saveView(entityType, viewType, payload.config) };
  }

  @Get('print-templates')
  async templates(@Query('entityType') entityType?: string) {
    return { data: await this.settings.listTemplates(entityType) };
  }

  @Post('print-templates')
  async createTemplate(@Body() payload: Partial<PrintTemplate>) {
    return { data: await this.settings.saveTemplate(payload) };
  }

  @Patch('print-templates/:id')
  async updateTemplate(@Param('id') id: string, @Body() payload: Partial<PrintTemplate>) {
    return { data: await this.settings.updateTemplate(id, payload) };
  }

  @Get('print-templates/:id/render/:recordId')
  @Header('Content-Type', 'text/html; charset=utf-8')
  render(@Param('id') id: string, @Param('recordId') recordId: string) {
    return this.settings.renderTemplate(id, recordId);
  }
}
