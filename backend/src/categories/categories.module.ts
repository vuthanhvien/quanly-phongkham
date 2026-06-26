import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemCategory } from '../entities/entities';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({
  imports: [TypeOrmModule.forFeature([ItemCategory])],
  controllers: [CategoriesController],
  providers: [CategoriesService],
})
export class CategoriesModule {}
