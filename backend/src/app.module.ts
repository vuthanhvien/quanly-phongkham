import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RecordsModule } from './records/records.module';
import { SeedModule } from './seed/seed.module';
import { SettingsModule } from './settings/settings.module';
import { ZaloModule } from './zalo/zalo.module';
import { CategoriesModule } from './categories/categories.module';
import { PayrollModule } from './payroll/payroll.module';
import { LocationsModule } from './locations/locations.module';
import { WorkflowModule } from './workflow/workflow.module';
import { TenantMiddleware } from './tenant/tenant.middleware';
import { TenantModule } from './tenant/tenant-orm.module';
import { CustomerPortalModule } from './customer-portal/customer-portal.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TenantModule,
    AuthModule,
    RecordsModule,
    SettingsModule,
    SeedModule,
    ZaloModule,
    CategoriesModule,
    PayrollModule,
    LocationsModule,
    WorkflowModule,
    CustomerPortalModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
