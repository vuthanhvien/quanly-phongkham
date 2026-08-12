import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Public } from '../common/auth';
import { LocationsService } from './locations.service';

@Public()
@Controller('locations')
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}
  @Get('countries') countries() { return this.locations.countries(); }
  @Get('provinces') provinces(@Query('countryCode') countryCode = 'VN') { return this.locations.provinces(countryCode); }
  @Get('wards') wards(@Query('provinceCode') provinceCode: string) { return this.locations.wards(provinceCode); }
}

@Controller('master-data')
export class MasterDataController {
  constructor(private readonly locations: LocationsService) {}

  @Get('groups')
  async groups() { return { data: await this.locations.masterDataGroups() }; }

  @Get()
  async list(@Query('group') group: string) { return { data: await this.locations.masterData(group) }; }

  @Post()
  async create(@Body() payload: Record<string, unknown>) { return { data: await this.locations.createMasterData(payload as Partial<import('../entities/entities').MasterData>) }; }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() payload: Record<string, unknown>) { return { data: await this.locations.updateMasterData(id, payload as Partial<import('../entities/entities').MasterData>) }; }

  @Delete(':id')
  async remove(@Param('id') id: string) { await this.locations.removeMasterData(id); return { data: true }; }

  @Post('seed')
  async seed(@Body('items') items: Array<{ group: string; name: string; value: string }> = []) { return { data: await this.locations.seedMasterData(items) }; }
}
