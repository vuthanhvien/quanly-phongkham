import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch, BranchRoleAssignment, CustomFieldDefinition, Department, DynamicRoleDefinition, PrintTemplate, Staff, User, ViewSetting } from '../entities/entities';
import { SeedService } from './seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([Branch, User, Department, Staff, BranchRoleAssignment, DynamicRoleDefinition, CustomFieldDefinition, ViewSetting, PrintTemplate])],
  providers: [SeedService],
})
export class SeedModule {}
