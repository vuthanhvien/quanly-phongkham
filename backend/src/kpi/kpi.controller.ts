import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { KpiService } from './kpi.service';

@Controller('kpi')
export class KpiController {
  constructor(private readonly service: KpiService) {}

  @Get('dashboard') dashboard(@Query('cycleId') cycleId?: string) { return this.service.dashboard(cycleId); }
  @Get('cycles') cycles() { return this.service.cycles(); }
  @Get('metrics') metrics() { return this.service.metrics(); }
  @Post('cycles') createCycle(@Body() body: Record<string, unknown>) { return this.service.createCycle(body); }
  @Post('metrics') createMetric(@Body() body: Record<string, unknown>) { return this.service.createMetric(body); }
  @Post('assignments') createAssignment(@Body() body: Record<string, unknown>) { return this.service.createAssignment(body); }
  @Post('assignments/:id/checkins') checkin(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.checkin(id, body); }
  @Post('cycles/:id/close') closeCycle(@Param('id') id: string) { return this.service.closeCycle(id); }
}
