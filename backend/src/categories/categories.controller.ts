import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { ItemCategory } from '../entities/entities';

@Controller('product-categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() body: Partial<ItemCategory>) {
    return this.service.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<ItemCategory>) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
