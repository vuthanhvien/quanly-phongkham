import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request } from '@nestjs/common';
import { AuthUser } from '../common/auth';
import { ZaloService } from './zalo.service';

@Controller('zalo')
export class ZaloController {
  constructor(private readonly zalo: ZaloService) {}

  @Get('accounts')
  listAccounts(@Request() request: { user: AuthUser }): Promise<any> {
    return this.zalo.listAccounts(request.user);
  }

  @Post('accounts')
  createAccount(@Body() payload: Record<string, unknown>, @Request() request: { user: AuthUser }): Promise<any> {
    return this.zalo.createAccount(payload, request.user);
  }

  @Patch('accounts/:id')
  updateAccount(
    @Param('id') id: string,
    @Body() payload: Record<string, unknown>,
    @Request() request: { user: AuthUser },
  ): Promise<any> {
    return this.zalo.updateAccount(id, payload, request.user);
  }

  @Delete('accounts/:id')
  removeAccount(@Param('id') id: string, @Request() request: { user: AuthUser }): Promise<any> {
    return this.zalo.removeAccount(id, request.user);
  }

  @Post('accounts/:id/login/start')
  startLogin(@Param('id') id: string, @Request() request: { user: AuthUser }): Promise<any> {
    return this.zalo.startLogin(id, request.user);
  }

  @Get('accounts/:id/login-state')
  getLoginState(@Param('id') id: string, @Request() request: { user: AuthUser }): Promise<any> {
    return this.zalo.getLoginState(id, request.user);
  }

  @Post('accounts/:id/listener/start')
  startListener(@Param('id') id: string, @Request() request: { user: AuthUser }): Promise<any> {
    return this.zalo.startListener(id, request.user);
  }

  @Post('accounts/:id/listener/stop')
  stopListener(@Param('id') id: string, @Request() request: { user: AuthUser }): Promise<any> {
    return this.zalo.stopListener(id, request.user);
  }

  @Get('conversations')
  listConversations(
    @Query('accountId') accountId: string,
    @Query('search') search: string | undefined,
    @Request() request: { user: AuthUser },
  ): Promise<any> {
    return this.zalo.listConversations(accountId, search, request.user);
  }

  @Patch('conversations/:id/link')
  linkConversation(
    @Param('id') id: string,
    @Body() payload: { customerId?: string; leadId?: string; contactPhone?: string },
    @Request() request: { user: AuthUser },
  ): Promise<any> {
    return this.zalo.linkConversation(id, payload, request.user);
  }

  @Get('conversations/:id/messages')
  listMessages(
    @Param('id') id: string,
    @Query('pageSize') pageSize: string | undefined,
    @Request() request: { user: AuthUser },
  ): Promise<any> {
    return this.zalo.listMessages(id, Number(pageSize || 100), request.user);
  }
}
