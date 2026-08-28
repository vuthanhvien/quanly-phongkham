import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { KpiService } from './kpi.service';

@Controller('kpi')
export class KpiController {
  constructor(private readonly service: KpiService) {}

  @Get('dashboard') dashboard(@Query('cycleId') cycleId?: string) { return this.service.dashboard(cycleId); }
  @Get('cycles') cycles() { return this.service.cycles(); }
  @Get('metrics') metrics() { return this.service.metrics(); }
  @Post('cycles') createCycle(@Body() body: Record<string, unknown>) { return this.service.createCycle(body); }
  @Post('metrics') createMetric(@Body() body: Record<string, unknown>) { return this.service.createMetric(body); }
  @Patch('cycles/:id') updateCycle(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.updateCycle(id, body); }
  @Patch('metrics/:id') updateMetric(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.updateMetric(id, body); }
  @Post('assignments') createAssignment(@Body() body: Record<string, unknown>) { return this.service.createAssignment(body); }
  @Patch('assignments/:id') updateAssignment(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.updateAssignment(id, body); }
  @Delete('assignments/:id') deleteAssignment(@Param('id') id: string) { return this.service.deleteAssignment(id); }
  @Get('assignments/:id/checkins') checkins(@Param('id') id: string) { return this.service.checkins(id); }
  @Post('assignments/:id/checkins') checkin(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.checkin(id, body); }
  @Patch('checkins/:id') updateCheckin(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.updateCheckin(id, body); }
  @Delete('checkins/:id') deleteCheckin(@Param('id') id: string) { return this.service.deleteCheckin(id); }
  @Post('assignments/:id/sync-source') syncSource(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.syncSource(id, body); }
  @Post('cycles/:id/close') closeCycle(@Param('id') id: string) { return this.service.closeCycle(id); }
  @Get('cycles/:id/export') exportCycle(@Param('id') id: string) { return this.service.exportCycle(id); }
  @Post('cycles/:id/import') importCycle(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.importCycle(id, body); }
  @Get('checkins/export') exportCheckins() { return this.service.exportCheckins(); }
  @Post('checkins/import') importCheckins(@Body() body: Record<string, unknown>) { return this.service.importCheckins(body); }
  @Post('cycles/:id/clone-assignments') cloneAssignments(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.cloneAssignments(id, body); }
}
