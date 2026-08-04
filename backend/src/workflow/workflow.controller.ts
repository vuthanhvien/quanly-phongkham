import { Body, Controller, Get, Param, Post, Request } from '@nestjs/common';
import { AuthUser } from '../common/auth';
import { WorkflowService } from './workflow.service';

@Controller('workflow')
export class WorkflowController {
  constructor(private readonly workflow: WorkflowService) {}

  @Get('definitions')
  definitions(@Request() request: { user: AuthUser }) {
    return this.workflow.listDefinitions(request.user);
  }

  @Post('bootstrap-defaults')
  bootstrapDefaults(@Request() request: { user: AuthUser }) {
    return this.workflow.bootstrapDefaults(request.user);
  }

  @Get('tasks/my')
  myTasks(@Request() request: { user: AuthUser }) {
    return this.workflow.myTasks(request.user);
  }

  @Get('instances/:id')
  instance(@Param('id') id: string, @Request() request: { user: AuthUser }) {
    return this.workflow.instanceDetail(id, request.user);
  }

  @Post('instances/:id/approve')
  approve(@Param('id') id: string, @Body() payload: { note?: string }, @Request() request: { user: AuthUser }) {
    return this.workflow.approve(id, payload?.note, request.user);
  }

  @Post('instances/:id/reject')
  reject(@Param('id') id: string, @Body() payload: { note?: string }, @Request() request: { user: AuthUser }) {
    return this.workflow.reject(id, payload?.note, request.user);
  }

  @Post('instances/:id/cancel')
  cancel(@Param('id') id: string, @Body() payload: { note?: string }, @Request() request: { user: AuthUser }) {
    return this.workflow.cancel(id, payload?.note, request.user);
  }
}
