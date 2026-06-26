import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ItemCategory } from '../entities/entities';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(ItemCategory)
    private readonly repo: Repository<ItemCategory>,
  ) {}

  async list() {
    const cats = await this.repo.find({
      order: { level: 'ASC', sortOrder: 'ASC', name: 'ASC' },
    });
    return { data: cats, total: cats.length };
  }

  async create(payload: Partial<ItemCategory>) {
    if (payload.parentId) {
      const parent = await this.repo.findOne({ where: { id: payload.parentId } });
      if (!parent) throw new NotFoundException('Danh mục cha không tồn tại');
      if (parent.level >= 3) throw new BadRequestException('Tối đa 3 cấp danh mục');
      payload.level = parent.level + 1;
    } else {
      payload.level = 1;
      payload.parentId = undefined;
    }
    const saved = await this.repo.save(this.repo.create(payload));
    return { data: saved };
  }

  async update(id: string, payload: Partial<ItemCategory>) {
    const cat = await this.repo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException('Danh mục không tồn tại');

    if ('parentId' in payload && payload.parentId !== cat.parentId) {
      if (payload.parentId) {
        const parent = await this.repo.findOne({ where: { id: payload.parentId } });
        if (!parent) throw new NotFoundException('Danh mục cha không tồn tại');
        if (parent.level >= 3) throw new BadRequestException('Tối đa 3 cấp danh mục');
        payload.level = parent.level + 1;
      } else {
        payload.level = 1;
      }
    }

    Object.assign(cat, payload);
    const saved = await this.repo.save(cat);
    return { data: saved };
  }

  async remove(id: string) {
    const children = await this.repo.find({ where: { parentId: id } });
    if (children.length > 0) {
      throw new BadRequestException('Không thể xóa danh mục còn danh mục con');
    }
    await this.repo.delete(id);
    return { success: true };
  }

  async importBatch(rows: Array<Partial<ItemCategory> & { parentCode?: string }>) {
    // Pre-load all existing codes → id
    const existing = await this.repo.find({ select: ['id', 'code'] as (keyof ItemCategory)[] });
    const codeMap = new Map<string, string>();
    for (const cat of existing) {
      if (cat.code) codeMap.set(cat.code.trim(), cat.id);
    }

    // Process root rows first (no parentCode), then children
    const sorted = [...rows].sort((a, b) => {
      const aHas = a.parentCode ? 1 : 0;
      const bHas = b.parentCode ? 1 : 0;
      return aHas - bHas;
    });

    const results: Array<ItemCategory & { _action: string }> = [];
    const errors: Array<{ rowIndex: number; code?: string; error: string }> = [];

    for (let i = 0; i < sorted.length; i++) {
      const row = sorted[i];
      try {
        let parentId: string | undefined;
        let level = 1;

        if (row.parentCode?.trim()) {
          const pid = codeMap.get(row.parentCode.trim());
          if (!pid) throw new Error(`Không tìm thấy danh mục cha với mã "${row.parentCode}"`);
          const parent = await this.repo.findOne({ where: { id: pid } });
          if (!parent) throw new Error(`Danh mục cha không còn tồn tại`);
          if (parent.level >= 3) throw new Error('Tối đa 3 cấp danh mục');
          parentId = pid;
          level = parent.level + 1;
        }

        const payload: Partial<ItemCategory> = {
          name: row.name,
          code: row.code?.trim() || undefined,
          description: row.description || undefined,
          sortOrder: row.sortOrder != null ? Number(row.sortOrder) : 0,
          isActive: row.isActive !== false && String(row.isActive) !== '0' && String(row.isActive).toLowerCase() !== 'false',
          parentId,
          level,
        };

        const existingId = row.code ? codeMap.get(row.code.trim()) : undefined;
        if (existingId) {
          const cat = await this.repo.findOne({ where: { id: existingId } });
          if (cat) {
            Object.assign(cat, payload);
            const saved = await this.repo.save(cat);
            if (saved.code) codeMap.set(saved.code, saved.id);
            results.push({ ...saved, _action: 'updated' });
          }
        } else {
          const cat = this.repo.create(payload);
          const saved = await this.repo.save(cat);
          if (saved.code) codeMap.set(saved.code, saved.id);
          results.push({ ...saved, _action: 'created' });
        }
      } catch (err) {
        errors.push({
          rowIndex: i + 1,
          code: row.code,
          error: err instanceof Error ? err.message : 'Lỗi không xác định',
        });
      }
    }

    return { success: results.length, failed: errors.length, results, errors };
  }
}
