import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Handlebars from 'handlebars';
import { Repository } from 'typeorm';
import { CustomFieldDefinition, PrintTemplate, ViewSetting } from '../entities/entities';
import { RecordsService } from '../records/records.service';

const DEFAULT_ROLE_SCOPE = 'ALL';

function normalizeRole(role?: string) {
  return role?.trim().toUpperCase() || DEFAULT_ROLE_SCOPE;
}

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(CustomFieldDefinition) private readonly fields: Repository<CustomFieldDefinition>,
    @InjectRepository(ViewSetting) private readonly views: Repository<ViewSetting>,
    @InjectRepository(PrintTemplate) private readonly templates: Repository<PrintTemplate>,
    private readonly records: RecordsService,
  ) {}

  listFields(entityType?: string) {
    return this.fields.find({ where: entityType ? { entityType } : {}, order: { entityType: 'ASC', sortOrder: 'ASC' } });
  }

  async createField(payload: Partial<CustomFieldDefinition>) {
    if (!payload.entityType || !payload.key || !payload.label) {
      throw new BadRequestException('entityType, key va label la bat buoc');
    }
    const key = payload.key.replace(/[^a-zA-Z0-9_]/g, '_');
    const exists = await this.fields.findOne({ where: { entityType: payload.entityType, key } });
    if (exists) throw new BadRequestException('Key da ton tai tren model nay');
    return this.fields.save(this.fields.create({ ...payload, key }));
  }

  async updateField(id: string, payload: Partial<CustomFieldDefinition>) {
    const field = await this.fields.findOne({ where: { id } });
    if (!field) throw new NotFoundException('Khong tim thay custom field');
    return this.fields.save(this.fields.merge(field, payload));
  }

  async deleteField(id: string) {
    const field = await this.fields.findOne({ where: { id } });
    if (!field) throw new NotFoundException('Khong tim thay custom field');
    await this.fields.remove(field);
    return { id };
  }

  listViews(entityType?: string) {
    return this.views.find({ where: entityType ? { entityType } : {}, order: { entityType: 'ASC', viewType: 'ASC', role: 'ASC' } });
  }

  async saveView(entityType: string, viewType: string, config: Record<string, unknown>, role?: string) {
    const normalizedRole = normalizeRole(role);
    let setting = await this.views.findOne({ where: { entityType, viewType, role: normalizedRole } });
    if (!setting) setting = this.views.create({ entityType, viewType, role: normalizedRole, config });
    setting.role = normalizedRole;
    setting.config = config;
    return this.views.save(setting);
  }

  listTemplates(entityType?: string) {
    return this.templates.find({ where: entityType ? { entityType } : {}, order: { name: 'ASC' } });
  }

  saveTemplate(payload: Partial<PrintTemplate>) {
    if (!payload.entityType || !payload.name || !payload.htmlTemplate) {
      throw new BadRequestException('Model, ten va HTML template la bat buoc');
    }
    return this.templates.save(this.templates.create(payload));
  }

  async updateTemplate(id: string, payload: Partial<PrintTemplate>) {
    const template = await this.templates.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Khong tim thay mau in');
    return this.templates.save(this.templates.merge(template, payload));
  }

  async renderTemplate(templateId: string, recordId: string) {
    const template = await this.templates.findOne({ where: { id: templateId, isActive: true } });
    if (!template) throw new NotFoundException('Khong tim thay mau in');
    const record = await this.records.findRaw(template.entityType, recordId);
    const data = { ...record, ...(record.customFields || {}) };
    return Handlebars.compile(template.htmlTemplate)(data);
  }
}

