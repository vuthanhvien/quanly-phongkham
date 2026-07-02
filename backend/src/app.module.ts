import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { ENTITIES } from './entities/entities';
import { RecordsModule } from './records/records.module';
import { SeedModule } from './seed/seed.module';
import { SettingsModule } from './settings/settings.module';
import { ZaloModule } from './zalo/zalo.module';
import { CategoriesModule } from './categories/categories.module';
import { PayrollModule } from './payroll/payroll.module';

function resolveDatabaseType(databaseUrl: string) {
  if (databaseUrl.startsWith('mysql://') || databaseUrl.startsWith('mysql2://')) {
    return 'mysql' as const;
  }
  if (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://')) {
    return 'postgres' as const;
  }
  throw new Error('Unsupported DATABASE_URL. Use mysql:// or postgresql://');
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.getOrThrow<string>('DATABASE_URL');
        return {
          type: resolveDatabaseType(databaseUrl),
          url: databaseUrl,
          entities: ENTITIES,
          synchronize: true,
        };
      },
    }),
    AuthModule,
    RecordsModule,
    SettingsModule,
    SeedModule,
    ZaloModule,
    CategoriesModule,
    PayrollModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
