import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Request } from '@nestjs/common';
import { AuthUser } from '../common/auth';
import { RecordsService } from './records.service';

@Controller()
export class RecordsController {
  constructor(private readonly records: RecordsService) {}

  @Get('records/:resource')
  list(
    @Param('resource') resource: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize = 20,
    @Query('search') search?: string,
    @Request() request?: { user: AuthUser },
  ) {
    return this.records.list(resource, page, pageSize, search, request?.user);
  }

  @Post('records/customers/:id/reveal-phone')
  revealPhone(@Param('id') id: string, @Request() request: { user: AuthUser }) {
    return this.records.revealPhone(id, request.user);
  }

  @Get('records/:resource/:id')
  find(@Param('resource') resource: string, @Param('id') id: string, @Request() request: { user: AuthUser }) {
    return this.records.find(resource, id, request.user);
  }

  @Post('records/:resource')
  create(
    @Param('resource') resource: string,
    @Body() payload: Record<string, unknown>,
    @Request() request: { user: AuthUser },
  ) {
    return this.records.create(resource, payload, request.user);
  }

  @Patch('records/:resource/:id')
  update(
    @Param('resource') resource: string,
    @Param('id') id: string,
    @Body() payload: Record<string, unknown>,
    @Request() request: { user: AuthUser },
  ) {
    return this.records.update(resource, id, payload, request.user);
  }

  @Delete('records/:resource/:id')
  remove(@Param('resource') resource: string, @Param('id') id: string, @Request() request: { user: AuthUser }) {
    return this.records.remove(resource, id, request.user);
  }

  @Get('audit-logs')
  audits(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize = 30,
    @Request() request?: { user: AuthUser },
  ) {
    return this.records.audits(page, pageSize, request?.user);
  }
}
