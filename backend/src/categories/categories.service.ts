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
}
