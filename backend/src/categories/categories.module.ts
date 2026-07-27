import { Module } from '@nestjs/common';
import { TenantOrmModule } from '../tenant/tenant-orm.module';
import { ItemCategory } from '../entities/entities';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({
  imports: [TenantOrmModule.forFeature([ItemCategory])],
  controllers: [CategoriesController],
  providers: [CategoriesService],
})
export class CategoriesModule {}
