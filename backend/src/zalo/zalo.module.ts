import { Module } from '@nestjs/common';
import { TenantModule, TenantOrmModule } from '../tenant/tenant-orm.module';
import { Branch, Customer, Lead, Staff, ZaloAccount, ZaloConversation, ZaloMessage } from '../entities/entities';
import { ZaloController } from './zalo.controller';
import { ZaloService } from './zalo.service';

@Module({
  imports: [TenantModule, TenantOrmModule.forFeature([ZaloAccount, ZaloConversation, ZaloMessage, Staff, Branch, Customer, Lead])],
  controllers: [ZaloController],
  providers: [ZaloService],
})
export class ZaloModule {}
