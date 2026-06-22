import { BadRequestException, ForbiddenException, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ThreadType, Zalo, type AttachmentSource, type Message } from 'zca-js';
import { ILike, Repository } from 'typeorm';
import { AuthUser } from '../common/auth';
import { Branch, Customer, Lead, Staff, ZaloAccount, ZaloConversation, ZaloMessage } from '../entities/entities';

type LoginStateStatus = 'IDLE' | 'QR_PENDING' | 'QR_SCANNED' | 'CONNECTED' | 'ERROR';

interface LoginStateSnapshot {
  status: LoginStateStatus;
  qrImage?: string;
  qrCode?: string;
  qrToken?: string;
  scannedDisplayName?: string;
  scannedAvatar?: string;
  error?: string;
  updatedAt: string;
}

interface UploadedBinaryFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

type ZaloRuntimeApi = Awaited<ReturnType<Zalo['loginQR']>>;

@Injectable()
export class ZaloService implements OnModuleInit {
  private readonly loginStates = new Map<string, LoginStateSnapshot>();
  private readonly apis = new Map<string, ZaloRuntimeApi>();
  private readonly listeners = new Map<string, { stop: () => void }>();

  constructor(
    @InjectRepository(ZaloAccount) private readonly accounts: Repository<ZaloAccount>,
    @InjectRepository(ZaloConversation) private readonly conversations: Repository<ZaloConversation>,
    @InjectRepository(ZaloMessage) private readonly messages: Repository<ZaloMessage>,
    @InjectRepository(Staff) private readonly staff: Repository<Staff>,
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(Lead) private readonly leads: Repository<Lead>,
  ) {}

  async onModuleInit() {
    const accounts = await this.accounts.find({ where: { listenerEnabled: true } });
    for (const account of accounts) {
      if (!account.sessionData) continue;
      void this.restoreAccountRuntime(account);
    }
  }

  async listAccounts(user: AuthUser) {
    const rows = await this.accounts.find({
      where: this.accountScope(user),
      order: { updatedAt: 'DESC' },
    });
    return {
      data: rows.map((row) => ({
        ...row,
        loginState: this.loginStates.get(row.id) || null,
      })),
    };
  }

  async createAccount(payload: Record<string, unknown>, user: AuthUser) {
    this.assertAdmin(user);
    const staffId = this.normalizeOptionalString(payload.staffId);
    const branchId = this.normalizeOptionalString(payload.branchId);
    if (staffId) await this.ensureStaff(staffId);
    if (branchId) await this.ensureBranch(branchId);
    const label = String(payload.label || '').trim();
    if (!label) throw new BadRequestException('Tên tài khoản Zalo là bắt buộc');

    const created = await this.accounts.save(
      this.accounts.create({
        label,
        staffId,
        branchId,
        note: this.normalizeOptionalString(payload.note),
        listenerEnabled: Boolean(payload.listenerEnabled),
        connectionStatus: 'DISCONNECTED',
      }),
    );
    return { data: created };
  }

  async updateAccount(id: string, payload: Record<string, unknown>, user: AuthUser) {
    this.assertAdmin(user);
    const account = await this.getAccountOrFail(id);
    const staffId = this.normalizeOptionalString(payload.staffId);
    const branchId = this.normalizeOptionalString(payload.branchId);
    if (staffId) await this.ensureStaff(staffId);
    if (branchId) await this.ensureBranch(branchId);

    if (payload.label !== undefined) {
      const label = String(payload.label || '').trim();
      if (!label) throw new BadRequestException('Tên tài khoản Zalo là bắt buộc');
      account.label = label;
    }
    if (payload.staffId !== undefined) account.staffId = staffId;
    if (payload.branchId !== undefined) account.branchId = branchId;
    if (payload.note !== undefined) account.note = this.normalizeOptionalString(payload.note);
    if (payload.listenerEnabled !== undefined) account.listenerEnabled = Boolean(payload.listenerEnabled);
    const saved = await this.accounts.save(account);
    return { data: saved };
  }

  async removeAccount(id: string, user: AuthUser) {
    this.assertAdmin(user);
    await this.stopListener(id, user).catch(() => undefined);
    this.loginStates.delete(id);
    this.apis.delete(id);
    await this.messages.delete({ accountId: id });
    await this.conversations.delete({ accountId: id });
    await this.accounts.delete({ id });
    return { data: { id } };
  }

  async startLogin(id: string, user: AuthUser) {
    this.assertAdmin(user);
    const account = await this.getAccountOrFail(id);
    this.loginStates.set(id, this.buildLoginState('QR_PENDING'));
    account.connectionStatus = 'QR_PENDING';
    account.listenerActive = false;
    await this.accounts.save(account);
    void this.runLoginFlow(account);
    return { data: { started: true } };
  }

  async getLoginState(id: string, user: AuthUser) {
    this.assertAdmin(user);
    const account = await this.getAccountOrFail(id);
    return {
      data: {
        accountId: id,
        accountStatus: account.connectionStatus,
        listenerActive: account.listenerActive,
        loginState: this.loginStates.get(id) || this.buildLoginState('IDLE'),
      },
    };
  }

  async startListener(id: string, user: AuthUser) {
    this.assertAdmin(user);
    const account = await this.getAccountOrFail(id);
    if (!account.sessionData) {
      throw new BadRequestException('Tài khoản chưa đăng nhập Zalo bằng QR');
    }
    account.listenerEnabled = true;
    await this.accounts.save(account);
    const api = await this.ensureApi(account);
    await this.attachListener(account, api);
    return { data: { started: true } };
  }

  async stopListener(id: string, user: AuthUser) {
    this.assertAdmin(user);
    const account = await this.getAccountOrFail(id);
    const listener = this.listeners.get(id);
    if (listener) {
      listener.stop();
      this.listeners.delete(id);
    }
    account.listenerActive = false;
    account.listenerEnabled = false;
    await this.accounts.save(account);
    return { data: { stopped: true } };
  }

  async listConversations(accountId: string, search: string | undefined, user: AuthUser) {
    const account = await this.assertAccountAccess(accountId, user);
    if (!accountId) throw new BadRequestException('accountId là bắt buộc');
    const where = search
      ? [
          { accountId, displayName: ILike(`%${search}%`) },
          { accountId, lastMessageText: ILike(`%${search}%`) },
        ]
      : { accountId };
    const rows = await this.conversations.find({
      where,
      order: { lastMessageAt: 'DESC', updatedAt: 'DESC' },
      take: 200,
    });
    void account;
    return { data: rows };
  }

  async listMessages(conversationId: string, pageSize: number, user: AuthUser) {
    await this.assertConversationAccess(conversationId, user);
    const limit = Number.isFinite(pageSize) ? Math.min(Math.max(pageSize, 20), 500) : 100;
    const rows = await this.messages.find({
      where: { conversationId },
      order: { sentAt: 'ASC', createdAt: 'ASC' },
      take: limit,
    });
    return { data: rows };
  }

  async linkConversation(
    id: string,
    payload: { customerId?: string; leadId?: string; contactPhone?: string },
    user: AuthUser,
  ) {
    const conversation = await this.assertConversationAccess(id, user);
    if (payload.customerId) await this.ensureCustomer(payload.customerId);
    if (payload.leadId) await this.ensureLead(payload.leadId);
    conversation.customerId = this.normalizeOptionalString(payload.customerId);
    conversation.leadId = this.normalizeOptionalString(payload.leadId);
    conversation.contactPhone = this.normalizeOptionalString(payload.contactPhone);
    const saved = await this.conversations.save(conversation);
    return { data: saved };
  }

  async sendMessage(conversationId: string, text: string | undefined, files: UploadedBinaryFile[], user: AuthUser) {
    const conversation = await this.assertConversationAccess(conversationId, user);
    const account = await this.getAccountOrFail(conversation.accountId);
    const api = await this.ensureApi(account);
    const messageText = (text || '').trim();
    if (!messageText && files.length === 0) {
      throw new BadRequestException('Cần nhập nội dung hoặc chọn ảnh để gửi');
    }

    const attachments = files.map((file) => this.toAttachmentSource(file));
    const response = await api.sendMessage(
      {
        msg: messageText || (attachments.length > 0 ? '[Hình ảnh]' : ''),
        attachments: attachments.length > 0 ? attachments : undefined,
      },
      conversation.threadId,
      this.toThreadType(conversation.threadType),
    );

    const sentAt = new Date();
    const persisted = await this.messages.save(
      this.messages.create({
        accountId: account.id,
        conversationId: conversation.id,
        threadId: conversation.threadId,
        threadType: conversation.threadType,
        messageId: String(response.message?.msgId || response.attachment?.[0]?.msgId || `local-${Date.now()}`),
        clientMessageId: String(Date.now()),
        senderId: account.zaloUserId,
        senderName: account.displayName || account.label,
        direction: 'OUTBOUND',
        contentText: messageText || (attachments.length > 0 ? '[Hình ảnh]' : ''),
        contentJson: attachments.length > 0 ? { attachments: files.map((file) => ({ name: file.originalname, mimeType: file.mimetype })) } as any : {},
        sentAt,
        isSelf: true,
      }),
    );

    conversation.lastMessageAt = sentAt;
    conversation.lastMessageText = messageText || '[Hình ảnh]';
    await this.conversations.save(conversation);
    account.lastMessageAt = sentAt;
    await this.accounts.save(account);

    return { data: persisted };
  }

  async createCustomerFromConversation(
    conversationId: string,
    payload: { fullName?: string; phone?: string; branchId?: string; note?: string },
    user: AuthUser,
  ) {
    const conversation = await this.assertConversationAccess(conversationId, user);
    if (conversation.customerId) {
      throw new BadRequestException('Hội thoại này đã liên kết với khách hàng');
    }

    const account = await this.getAccountOrFail(conversation.accountId);
    const branchId = this.normalizeOptionalString(payload.branchId) || conversation.branchId || account.branchId || user.branchId;
    const phone = this.normalizeOptionalString(payload.phone) || conversation.contactPhone;
    const fullName = this.normalizeOptionalString(payload.fullName) || conversation.displayName || 'Khách Zalo';

    if (!branchId) throw new BadRequestException('Cần chọn chi nhánh để tạo khách hàng');
    if (!phone) throw new BadRequestException('Cần số điện thoại để tạo khách hàng');

    await this.ensureBranch(branchId);
    const customer = await this.customers.save(
      this.customers.create({
        code: await this.generateCustomerCode(),
        fullName,
        phone,
        branchId,
        note: this.normalizeOptionalString(payload.note) || `Tạo từ hội thoại Zalo ${conversation.displayName}`,
        status: 'CONSULTING',
        tier: 'MEMBER',
      }),
    );

    conversation.customerId = customer.id;
    conversation.contactPhone = phone;
    await this.conversations.save(conversation);
    return { data: customer };
  }

  private async runLoginFlow(account: ZaloAccount) {
    try {
      const zalo = new Zalo();
      const api = await zalo.loginQR({}, async (event) => {
        if (event.type === 0) {
          this.loginStates.set(
            account.id,
            {
              ...this.buildLoginState('QR_PENDING'),
              qrCode: event.data.code,
              qrImage: event.data.image,
              qrToken: event.data.token,
            },
          );
          return;
        }
        if (event.type === 2) {
          this.loginStates.set(
            account.id,
            {
              ...this.buildLoginState('QR_SCANNED'),
              scannedDisplayName: event.data.display_name,
              scannedAvatar: event.data.avatar,
            },
          );
          return;
        }
        if (event.type === 4) {
          const nextAccount = await this.getAccountOrFail(account.id);
          nextAccount.sessionData = {
            cookie: event.data.cookie,
            imei: event.data.imei,
            userAgent: event.data.userAgent,
          };
          nextAccount.connectionStatus = 'CONNECTED';
          nextAccount.lastConnectedAt = new Date();
          await this.accounts.save(nextAccount);
          this.loginStates.set(account.id, this.buildLoginState('CONNECTED'));
        }
      });

      if (!api) {
        this.loginStates.set(account.id, {
          ...this.buildLoginState('ERROR'),
          error: 'Đăng nhập QR không thành công',
        });
        return;
      }

      this.apis.set(account.id, api);
      await this.hydrateAccountProfile(account.id, api);
      const saved = await this.getAccountOrFail(account.id);
      saved.connectionStatus = 'CONNECTED';
      saved.lastConnectedAt = new Date();
      await this.accounts.save(saved);
      if (saved.listenerEnabled) {
        await this.attachListener(saved, api);
      }
    } catch (error) {
      const saved = await this.getAccountOrFail(account.id).catch(() => null);
      if (saved) {
        saved.connectionStatus = 'ERROR';
        saved.listenerActive = false;
        await this.accounts.save(saved).catch(() => undefined);
      }
      this.loginStates.set(account.id, {
        ...this.buildLoginState('ERROR'),
        error: error instanceof Error ? error.message : 'Không thể đăng nhập Zalo',
      });
    }
  }

  private async restoreAccountRuntime(account: ZaloAccount) {
    try {
      const api = await this.ensureApi(account);
      if (account.listenerEnabled) {
        await this.attachListener(account, api);
      }
    } catch (error) {
      account.connectionStatus = 'ERROR';
      account.listenerActive = false;
      await this.accounts.save(account).catch(() => undefined);
      this.loginStates.set(account.id, {
        ...this.buildLoginState('ERROR'),
        error: error instanceof Error ? error.message : 'Không thể khôi phục phiên Zalo',
      });
    }
  }

  private async ensureApi(account: ZaloAccount) {
    const cached = this.apis.get(account.id);
    if (cached) return cached;
    if (!account.sessionData) throw new BadRequestException('Tài khoản chưa có session đăng nhập');
    const zalo = new Zalo();
    const api = await zalo.login(account.sessionData as never);
    this.apis.set(account.id, api);
    await this.hydrateAccountProfile(account.id, api);
    account.connectionStatus = 'CONNECTED';
    account.lastConnectedAt = new Date();
    await this.accounts.save(account);
    return api;
  }

  private async attachListener(account: ZaloAccount, api: ZaloRuntimeApi) {
    const current = this.listeners.get(account.id);
    if (current) {
      current.stop();
      this.listeners.delete(account.id);
    }

    const listener = api.listener;
    const onMessage = (message: Message) => {
      void this.persistMessage(account.id, message);
    };
    const onOldMessages = (messages: Message[]) => {
      void this.persistMessages(account.id, messages);
    };
    const onError = (error: unknown) => {
      this.loginStates.set(account.id, {
        ...this.buildLoginState('ERROR'),
        error: error instanceof Error ? error.message : 'Listener Zalo gặp lỗi',
      });
    };
    const onClosed = () => {
      void this.accounts.update({ id: account.id }, { listenerActive: false, connectionStatus: 'DISCONNECTED' });
      this.listeners.delete(account.id);
    };

    listener.on('message', onMessage);
    listener.on('old_messages', onOldMessages);
    listener.on('error', onError);
    listener.on('closed', onClosed);
    listener.on('connected', () => {
      try {
        listener.requestOldMessages(ThreadType.User);
        listener.requestOldMessages(ThreadType.Group);
      } catch {
        // ignore historical sync failures and keep realtime listener alive
      }
    });
    listener.start({ retryOnClose: true });

    this.listeners.set(account.id, {
      stop: () => {
        listener.off('message', onMessage);
        listener.off('old_messages', onOldMessages);
        listener.off('error', onError);
        listener.off('closed', onClosed);
        listener.stop();
      },
    });

    await this.accounts.update(
      { id: account.id },
      { listenerActive: true, listenerEnabled: true, connectionStatus: 'CONNECTED' },
    );
  }

  private async persistMessage(accountId: string, message: Message) {
    const account = await this.getAccountOrFail(accountId);
    const sentAt = new Date(Number(message.data.ts || Date.now()));
    const contentText = typeof message.data.content === 'string' ? message.data.content : undefined;
    const threadType = message.type === ThreadType.Group ? 'GROUP' : 'USER';
    const displayName = String(message.data.dName || message.threadId || 'Hội thoại Zalo');
    const messageId = String(message.data.realMsgId || message.data.msgId || message.data.cliMsgId);
    const conversation = await this.upsertConversation(account, {
      threadId: message.threadId,
      threadType,
      displayName,
      participantId: threadType === 'USER' ? message.threadId : undefined,
      lastMessageAt: sentAt,
      lastMessageText: contentText || this.stringifyContent(message.data.content),
      unreadDelta: message.isSelf ? 0 : 1,
    });

    await this.messages
      .createQueryBuilder()
      .insert()
      .into(ZaloMessage)
      .values({
        accountId,
        conversationId: conversation.id,
        threadId: conversation.threadId,
        threadType,
        messageId,
        clientMessageId: String(message.data.cliMsgId || ''),
        senderId: String(message.data.uidFrom || ''),
        senderName: String(message.data.dName || ''),
        direction: message.isSelf ? 'OUTBOUND' : 'INBOUND',
        contentText,
        contentJson: this.toJsonObject(message.data.content) as any,
        sentAt,
        isSelf: message.isSelf,
      })
      .orIgnore()
      .execute();

    account.lastMessageAt = sentAt;
    await this.accounts.save(account);
  }

  private async persistMessages(accountId: string, messages: Message[]) {
    for (const item of messages) {
      await this.persistMessage(accountId, item);
    }
  }

  private toAttachmentSource(file: UploadedBinaryFile): AttachmentSource {
    return {
      data: file.buffer,
      filename: file.originalname as `${string}.${string}`,
      metadata: {
        totalSize: file.size,
      },
    };
  }

  private toThreadType(value: string) {
    return value === 'GROUP' ? ThreadType.Group : ThreadType.User;
  }

  private async upsertConversation(
    account: ZaloAccount,
    payload: {
      threadId: string;
      threadType: string;
      displayName: string;
      participantId?: string;
      lastMessageAt: Date;
      lastMessageText?: string;
      unreadDelta: number;
    },
  ) {
    let conversation = await this.conversations.findOne({ where: { accountId: account.id, threadId: payload.threadId } });
    if (!conversation) {
      conversation = this.conversations.create({
        accountId: account.id,
        branchId: account.branchId,
        threadId: payload.threadId,
        threadType: payload.threadType,
        displayName: payload.displayName,
        participantId: payload.participantId,
        lastMessageAt: payload.lastMessageAt,
        lastMessageText: payload.lastMessageText,
        unreadCount: payload.unreadDelta,
      });
    } else {
      conversation.displayName = payload.displayName || conversation.displayName;
      conversation.participantId = payload.participantId || conversation.participantId;
      conversation.lastMessageAt = payload.lastMessageAt;
      conversation.lastMessageText = payload.lastMessageText;
      conversation.unreadCount = Number(conversation.unreadCount || 0) + payload.unreadDelta;
    }
    return this.conversations.save(conversation);
  }

  private async hydrateAccountProfile(accountId: string, api: ZaloRuntimeApi) {
    try {
      const info = await api.fetchAccountInfo();
      const profile = info?.profile;
      if (!profile) return;
      await this.accounts.update(
        { id: accountId },
        {
          displayName: profile.displayName || profile.zaloName || profile.username,
          avatarUrl: profile.avatar || undefined,
          zaloUserId: profile.userId || profile.globalId || undefined,
        },
      );
    } catch {
      // keep login successful even when profile hydration fails
    }
  }

  private buildLoginState(status: LoginStateStatus): LoginStateSnapshot {
    return {
      status,
      updatedAt: new Date().toISOString(),
    };
  }

  private stringifyContent(content: unknown) {
    if (typeof content === 'string') return content;
    if (!content || typeof content !== 'object') return '';
    if (typeof (content as Record<string, unknown>).title === 'string') {
      return String((content as Record<string, unknown>).title);
    }
    return '[Tin nhắn đính kèm]';
  }

  private toJsonObject(content: unknown) {
    if (!content || typeof content !== 'object') return {};
    try {
      return JSON.parse(JSON.stringify(content)) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  private normalizeOptionalString(value: unknown) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized || undefined;
  }

  private async getAccountOrFail(id: string) {
    const account = await this.accounts.findOne({ where: { id } });
    if (!account) throw new BadRequestException('Không tìm thấy tài khoản Zalo');
    return account;
  }

  private async ensureStaff(id: string) {
    const row = await this.staff.findOne({ where: { id } });
    if (!row) throw new BadRequestException('Nhân viên được chọn không tồn tại');
  }

  private async ensureBranch(id: string) {
    const row = await this.branches.findOne({ where: { id } });
    if (!row) throw new BadRequestException('Chi nhánh được chọn không tồn tại');
  }

  private async ensureCustomer(id: string) {
    const row = await this.customers.findOne({ where: { id } });
    if (!row) throw new BadRequestException('Khách hàng không tồn tại');
  }

  private async ensureLead(id: string) {
    const row = await this.leads.findOne({ where: { id } });
    if (!row) throw new BadRequestException('Lead không tồn tại');
  }

  private assertAdmin(user: AuthUser | undefined) {
    if (!user || (user.roleMain || user.role) === 'ADMIN') return;
    throw new ForbiddenException('Chỉ ADMIN mới được thao tác Zalo integration');
  }

  private accountScope(user: AuthUser | undefined) {
    if (!user || (user.roleMain || user.role) === 'ADMIN') return {};
    if (user.staffId) return { staffId: user.staffId };
    throw new ForbiddenException('Tài khoản hiện tại chưa được gán nhân viên để dùng Zalo Inbox');
  }

  private async assertAccountAccess(accountId: string, user: AuthUser | undefined) {
    const account = await this.getAccountOrFail(accountId);
    if (!user || (user.roleMain || user.role) === 'ADMIN') return account;
    if (user.staffId && account.staffId === user.staffId) return account;
    throw new ForbiddenException('Bạn không có quyền dùng tài khoản Zalo này');
  }

  private async assertConversationAccess(conversationId: string, user: AuthUser | undefined) {
    const conversation = await this.conversations.findOne({ where: { id: conversationId } });
    if (!conversation) throw new BadRequestException('Không tìm thấy hội thoại');
    await this.assertAccountAccess(conversation.accountId, user);
    return conversation;
  }

  private async generateCustomerCode() {
    let candidate = `KH-ZALO-${Date.now()}`;
    while (await this.customers.findOne({ where: { code: candidate } })) {
      candidate = `KH-ZALO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }
    return candidate;
  }
}
