import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Request, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Request as ExpressRequest } from 'express';
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
    @Request() request?: ExpressRequest & { user?: AuthUser },
  ) {
    return this.records.list(resource, page, pageSize, search, request?.user, request);
  }

  @Post('records/customers/:id/reveal-phone')
  revealPhone(@Param('id') id: string, @Request() request: { user: AuthUser }) {
    return this.records.revealPhone(id, request.user);
  }

  @Post('records/leads/:id/convert-to-customer')
  convertLeadToCustomer(@Param('id') id: string, @Request() request: { user: AuthUser }) {
    return this.records.convertLeadToCustomer(id, request.user);
  }

  @Post('records/files/upload')
  @UseInterceptors(FilesInterceptor('files', 50))
  uploadFiles(
    @UploadedFiles() files: any[],
    @Body() payload: { folderId?: string; title?: string; note?: string },
    @Request() request: ExpressRequest & { user: AuthUser },
  ) {
    return this.records.uploadFiles(files, payload, request.user, request);
  }

  @Get('records/service-orders/product-options')
  serviceOrderProductOptions(@Request() request: { user: AuthUser }) {
    return this.records.serviceOrderProductOptions(request.user);
  }

  @Get('records/stock-batches/form-options')
  stockBatchFormOptions(@Request() request: { user: AuthUser }) {
    return this.records.stockBatchFormOptions(request.user);
  }

  @Post('records/stock-batches/receipt')
  receiptStock(@Body() payload: Record<string, unknown>, @Request() request: { user: AuthUser }) {
    return this.records.receiptStock(payload, request.user);
  }

  @Post('records/stock-batches/issue')
  issueStock(@Body() payload: Record<string, unknown>, @Request() request: { user: AuthUser }) {
    return this.records.issueStock(payload, request.user);
  }

  @Get('records/:resource/import-bundle')
  exportImportBundle(
    @Param('resource') resource: string,
    @Query('template') template?: string,
    @Query('fake') fake?: string,
    @Request() request?: ExpressRequest & { user?: AuthUser },
  ) {
    return this.records.exportImportBundle(resource, template === '1', fake === '1', request?.user, request);
  }

  @Post('records/:resource/import-bundle')
  importBundle(
    @Param('resource') resource: string,
    @Body() payload: { sheets?: Record<string, Array<Record<string, unknown>>> },
    @Request() request: { user: AuthUser },
  ) {
    return this.records.importBundle(resource, payload?.sheets || {}, request.user);
  }

  @Post('records/:resource/import-upsert')
  importUpsert(
    @Param('resource') resource: string,
    @Body() payload: Record<string, unknown>,
    @Request() request: { user: AuthUser },
  ) {
    return this.records.importUpsert(resource, payload, request.user);
  }

  @Get('records/:resource/:id')
  find(@Param('resource') resource: string, @Param('id') id: string, @Request() request: ExpressRequest & { user: AuthUser }) {
    return this.records.find(resource, id, request.user, request);
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
