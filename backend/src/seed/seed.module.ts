import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch, CustomFieldDefinition, PrintTemplate, User, ViewSetting } from '../entities/entities';
import { SeedService } from './seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([Branch, User, CustomFieldDefinition, ViewSetting, PrintTemplate])],
  providers: [SeedService],
})
export class SeedModule {}

