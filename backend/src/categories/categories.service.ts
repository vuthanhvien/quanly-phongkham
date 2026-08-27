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
      where: { isArchived: false },
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
    const category = await this.repo.findOne({ where: { id, isArchived: false } });
    if (!category) throw new NotFoundException('Danh mục không tồn tại');
    category.isArchived = true;
    await this.repo.save(category);
    return { success: true };
  }

  async importBatch(rows: Array<Partial<ItemCategory> & { parentCode?: string }>) {
    // Pre-load all existing codes → id. Codes are mandatory in the import
    // format because child rows refer to their parent by code.
    const existing = await this.repo.find({
      where: { isArchived: false },
      select: ['id', 'code'] as (keyof ItemCategory)[],
    });
    const codeMap = new Map<string, string>();
    for (const cat of existing) {
      if (cat.code) codeMap.set(cat.code.trim(), cat.id);
    }

    const results: Array<ItemCategory & { _action: string }> = [];
    const errors: Array<{ rowIndex: number; code?: string; error: string }> = [];
    const pending = rows.map((row, index) => ({ row, index }));

    // A file does not need to be sorted by hierarchy. Keep processing rows
    // whose parents are known until no further progress can be made.
    while (pending.length > 0) {
      let progressed = false;
      for (let cursor = pending.length - 1; cursor >= 0; cursor--) {
        const { row, index } = pending[cursor];
        const code = String(row.code || '').trim();
        const parentCode = String(row.parentCode || '').trim();
        if (!code) {
          errors.push({ rowIndex: index + 1, error: 'Mã danh mục là bắt buộc' });
          pending.splice(cursor, 1);
          continue;
        }
        if (!String(row.name || '').trim()) {
          errors.push({ rowIndex: index + 1, code, error: 'Tên danh mục là bắt buộc' });
          pending.splice(cursor, 1);
          continue;
        }
        if (parentCode && !codeMap.has(parentCode)) continue;

        try {
        let parentId: string | undefined;
        let level = 1;

        if (parentCode) {
          const pid = codeMap.get(parentCode);
          if (!pid) throw new Error(`Không tìm thấy danh mục cha với mã "${parentCode}"`);
          const parent = await this.repo.findOne({ where: { id: pid } });
          if (!parent) throw new Error(`Danh mục cha không còn tồn tại`);
          if (parent.level >= 3) throw new Error('Tối đa 3 cấp danh mục');
          parentId = pid;
          level = parent.level + 1;
        }

        const payload: Partial<ItemCategory> = {
          name: row.name,
          code,
          description: row.description || undefined,
          sortOrder: row.sortOrder != null ? Number(row.sortOrder) : 0,
          isActive: row.isActive !== false && String(row.isActive) !== '0' && String(row.isActive).toLowerCase() !== 'false',
          parentId,
          level,
        };

        const existingId = codeMap.get(code);
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
          pending.splice(cursor, 1);
          progressed = true;
        } catch (err) {
          errors.push({
            rowIndex: index + 1,
            code,
            error: err instanceof Error ? err.message : 'Lỗi không xác định',
          });
          pending.splice(cursor, 1);
        }
      }

      if (!progressed) {
        pending.forEach(({ row, index }) => errors.push({
          rowIndex: index + 1,
          code: String(row.code || '').trim() || undefined,
          error: `Không tìm thấy danh mục cha với mã "${String(row.parentCode || '').trim()}"`,
        }));
        break;
      }
    }

    return { success: results.length, failed: errors.length, results, errors };
  }
}
