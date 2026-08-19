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
    @Query('advanced') advanced?: string,
    @Query() query?: Record<string, string>,
    @Request() request?: ExpressRequest & { user?: AuthUser },
  ) {
    const filters = Object.fromEntries(
      Object.entries(query || {}).filter(([key]) => !['page', 'pageSize', 'search', 'advanced', 'include', 'sort', 'order'].includes(key)),
    );
    return this.records.list(resource, page, pageSize, search, filters, request?.user, request, query?.include, advanced, query?.sort, query?.order);
  }

  @Post('records/:resource/:id/reveal-field')
  revealField(
    @Param('resource') resource: string,
    @Param('id') id: string,
    @Body() payload: { fieldKey?: string; pin?: string },
    @Request() request: { user: AuthUser },
  ) {
    return this.records.revealField(resource, id, String(payload.fieldKey || ''), String(payload.pin || ''), request.user);
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

  @Post('records/staff/:id/create-account')
  createStaffAccount(@Param('id') id: string, @Body() payload: { email?: string; username?: string; password?: string; role?: string; branchId?: string }, @Request() request: { user: AuthUser }) {
    return this.records.createStaffAccount(id, payload, request.user);
  }

  @Post('records/files/upload')
  @UseInterceptors(FilesInterceptor('files', 50))
  uploadFiles(
    @UploadedFiles() files: any[],
    @Body() payload: { folderId?: string; title?: string; note?: string; staffId?: string },
    @Request() request: ExpressRequest & { user: AuthUser },
  ) {
    return this.records.uploadFiles(files, payload, request.user, request);
  }

  @Get('records/service-orders/product-options')
  serviceOrderProductOptions(@Request() request: { user: AuthUser }) {
    return this.records.serviceOrderProductOptions(request.user);
  }

  @Get('records/leave-requests/balance')
  leaveBalance(
    @Query('staffId') staffId: string | undefined,
    @Query('year', new ParseIntPipe({ optional: true })) year: number | undefined,
    @Request() request: { user: AuthUser },
  ) {
    return this.records.leaveBalance(staffId, year, request.user);
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
    @Query('sampleSize') sampleSize?: string,
    @Request() request?: ExpressRequest & { user?: AuthUser },
  ) {
    return this.records.exportImportBundle(resource, template === '1', fake === '1', request?.user, request, Number(sampleSize || 5));
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

  @Get('records/:resource/drafts')
  listDrafts(@Param('resource') resource: string, @Request() request: { user: AuthUser }) {
    return this.records.listDrafts(resource, request.user);
  }

  @Post('records/:resource/drafts')
  createDraft(
    @Param('resource') resource: string,
    @Body() payload: Record<string, unknown>,
    @Request() request: { user: AuthUser },
  ) {
    return this.records.createDraft(resource, payload, request.user);
  }

  @Delete('records/:resource/drafts/:id')
  removeDraft(@Param('resource') resource: string, @Param('id') id: string, @Request() request: { user: AuthUser }) {
    return this.records.removeDraft(resource, id, request.user);
  }

  @Get('records/:resource/:id')
  find(
    @Param('resource') resource: string,
    @Param('id') id: string,
    @Query('include') include: string | undefined,
    @Request() request: ExpressRequest & { user: AuthUser },
  ) {
    return this.records.find(resource, id, request.user, request, include);
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
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
    @Request() request?: { user: AuthUser },
  ) {
    return this.records.audits(page, pageSize, search, sort, order, request?.user);
  }

  @Get('system-error-logs')
  systemErrors(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize = 30,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
    @Request() request?: { user: AuthUser },
  ) {
    return this.records.systemErrors(page, pageSize, search, sort, order, request?.user);
  }
}
