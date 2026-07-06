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
    @Query() query?: Record<string, string>,
    @Request() request?: ExpressRequest & { user?: AuthUser },
  ) {
    const filters = Object.fromEntries(
      Object.entries(query || {}).filter(([key]) => !['page', 'pageSize', 'search'].includes(key)),
    );
    return this.records.list(resource, page, pageSize, search, filters, request?.user, request);
  }

  @Post('records/customers/:id/reveal-phone')
  revealPhone(@Param('id') id: string, @Request() request: { user: AuthUser }) {
    return this.records.revealPhone(id, request.user);
  }

  @Post('records/leads/:id/convert-to-customer')
  convertLeadToCustomer(@Param('id') id: string, @Request() request: { user: AuthUser }) {
    return this.records.convertLeadToCustomer(id, request.user);
  }

  @Post('records/accounting-vouchers/:id/post')
  postAccountingVoucher(@Param('id') id: string, @Request() request: { user: AuthUser }) {
    return this.records.postAccountingVoucher(id, request.user);
  }

  @Post('records/accounting-vouchers/:id/unpost')
  unpostAccountingVoucher(@Param('id') id: string, @Request() request: { user: AuthUser }) {
    return this.records.unpostAccountingVoucher(id, request.user);
  }

  @Post('records/accounting/bootstrap-vn')
  bootstrapVietnameseAccounting(@Request() request: { user: AuthUser }) {
    return this.records.bootstrapVietnameseAccounting(request.user);
  }

  @Post('records/invoices/:id/generate-accounting-voucher')
  generateInvoiceAccountingVoucher(@Param('id') id: string, @Request() request: { user: AuthUser }) {
    return this.records.generateSourceAccountingVoucher('invoices', id, request.user);
  }

  @Post('records/expenses/:id/generate-accounting-voucher')
  generateExpenseAccountingVoucher(@Param('id') id: string, @Request() request: { user: AuthUser }) {
    return this.records.generateSourceAccountingVoucher('expenses', id, request.user);
  }

  @Post('records/payrolls/:id/generate-accounting-voucher')
  generatePayrollAccountingVoucher(@Param('id') id: string, @Request() request: { user: AuthUser }) {
    return this.records.generateSourceAccountingVoucher('payrolls', id, request.user);
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

  @Get('reports/accounting/general-ledger')
  accountingGeneralLedger(
    @Query() query: Record<string, string>,
    @Request() request?: ExpressRequest & { user?: AuthUser },
  ) {
    return this.records.accountingGeneralLedger(query || {}, request?.user);
  }

  @Get('reports/accounting/trial-balance')
  accountingTrialBalance(
    @Query() query: Record<string, string>,
    @Request() request?: ExpressRequest & { user?: AuthUser },
  ) {
    return this.records.accountingTrialBalance(query || {}, request?.user);
  }

  @Get('reports/accounting/cash-flow')
  accountingCashFlow(
    @Query() query: Record<string, string>,
    @Request() request?: ExpressRequest & { user?: AuthUser },
  ) {
    return this.records.accountingCashFlow(query || {}, request?.user);
  }

  @Get('reports/accounting/receivables')
  accountingReceivables(
    @Query() query: Record<string, string>,
    @Request() request?: ExpressRequest & { user?: AuthUser },
  ) {
    return this.records.accountingReceivables(query || {}, request?.user);
  }

  @Get('reports/accounting/payables')
  accountingPayables(
    @Query() query: Record<string, string>,
    @Request() request?: ExpressRequest & { user?: AuthUser },
  ) {
    return this.records.accountingPayables(query || {}, request?.user);
  }

  @Get('reports/accounting/cash-book')
  accountingCashBook(
    @Query() query: Record<string, string>,
    @Request() request?: ExpressRequest & { user?: AuthUser },
  ) {
    return this.records.accountingCashBook(query || {}, request?.user);
  }

  @Get('reports/accounting/bank-book')
  accountingBankBook(
    @Query() query: Record<string, string>,
    @Request() request?: ExpressRequest & { user?: AuthUser },
  ) {
    return this.records.accountingBankBook(query || {}, request?.user);
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
