import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TenantModule, TenantOrmModule } from '../tenant/tenant-orm.module';
import { Appointment, Branch, Customer, CustomerOtp, Invoice, Staff, User } from '../entities/entities';
import { CustomerAuthController } from './customer-auth.controller';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerPortalController } from './customer-portal.controller';
import { CustomerJwtAuthGuard } from './customer-jwt-auth.guard';
import { SmsService } from './sms.service';

const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '30d') as `${number}${'s' | 'm' | 'h' | 'd'}`;

@Module({
  imports: [
    TenantOrmModule.forFeature([Customer, CustomerOtp, Appointment, Invoice, Branch, Staff, User]),
    TenantModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'development-only-secret',
      signOptions: { expiresIn: JWT_EXPIRES_IN },
    }),
  ],
  controllers: [CustomerAuthController, CustomerPortalController],
  providers: [CustomerAuthService, SmsService, CustomerJwtAuthGuard],
})
export class CustomerPortalModule {}
