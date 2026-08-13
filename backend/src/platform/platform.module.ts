import { Module, OnModuleInit } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TenantModule } from '../tenant/tenant-orm.module';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';

const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '30d') as `${number}${'s' | 'm' | 'h' | 'd'}`;

@Module({
  imports: [TenantModule, JwtModule.register({ secret: process.env.JWT_SECRET || 'development-only-secret', signOptions: { expiresIn: JWT_EXPIRES_IN } })],
  controllers: [PlatformController],
  providers: [PlatformService],
})
export class PlatformModule implements OnModuleInit {
  constructor(private readonly platform: PlatformService) {}
  async onModuleInit() { await this.platform.ensureInitialAdmin(); }
}
