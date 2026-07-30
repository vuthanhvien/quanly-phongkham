import { Controller, Get, Query } from '@nestjs/common';
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
