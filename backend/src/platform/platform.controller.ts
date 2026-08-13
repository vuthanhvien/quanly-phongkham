import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { PlatformOnly, Public } from '../common/auth';
import { PlatformService } from './platform.service';

class PlatformLoginDto { @IsString() email: string; @IsString() password: string }
class TenantDto { @IsString() domain: string; @IsString() databaseUrl: string; @IsOptional() @IsBoolean() isActive?: boolean }
class TenantUpdateDto { @IsOptional() @IsString() domain?: string; @IsOptional() @IsString() databaseUrl?: string; @IsOptional() @IsBoolean() isActive?: boolean }

@Controller()
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Public()
  @Post('platform-auth/login')
  login(@Body() payload: PlatformLoginDto) { return this.platform.login(payload.email, payload.password); }

  @PlatformOnly()
  @Get('platform/tenants')
  async listTenants() { return { data: await this.platform.listTenants() }; }

  @PlatformOnly()
  @Post('platform/tenants')
  async createTenant(@Body() payload: TenantDto) { return { data: await this.platform.createTenant(payload) }; }

  @PlatformOnly()
  @Patch('platform/tenants/:id')
  async updateTenant(@Param('id') id: string, @Body() payload: TenantUpdateDto) { return { data: await this.platform.updateTenant(id, payload) }; }
}
