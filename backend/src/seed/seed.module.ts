import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch, BranchPermission, CustomFieldDefinition, Department, DynamicRoleDefinition, PrintTemplate, Staff, User, ViewSetting } from '../entities/entities';
import { SeedService } from './seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([Branch, User, Department, Staff, BranchPermission, DynamicRoleDefinition, CustomFieldDefinition, ViewSetting, PrintTemplate])],
  providers: [SeedService],
})
export class SeedModule {}
