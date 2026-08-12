import { Body, Controller, ForbiddenException, Get, Param, Post, Request } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { AuthUser, Public } from '../common/auth';
import { RecordsService } from '../records/records.service';
import { AdminChatbotConversation, AdminChatbotMessage, Appointment, Customer, Staff, Treatment, User, WorkSchedule } from '../entities/entities';
import { SettingsService } from './settings.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContent[];
}

interface AnthropicContent {
  type: string;
  [key: string]: unknown;
}

interface AnthropicResponse {
  content: AnthropicContent[];
  stop_reason: string;
}

interface AdminChatAction {
  type: 'navigate' | 'mutation';
  label: string;
  summary?: string;
  path?: string;
  operation?: 'create' | 'update' | 'archive';
  resource?: string;
  recordId?: string;
  values?: Record<string, unknown>;
}

const ADMIN_TOOL_DEFINITIONS = [
  {
    name: 'search_records',
    description: 'Tra cứu dữ liệu trong một phân hệ CMS mà người dùng có quyền xem.',
    input_schema: { type: 'object', properties: { resource: { type: 'string', description: 'Tên phân hệ, ví dụ customers, appointments, products, invoices' }, query: { type: 'string', description: 'Từ khóa cần tìm (có thể để trống để xem danh sách gần đây)' } }, required: ['resource'] },
  },
  {
    name: 'inspect_record',
    description: 'Xem chi tiết một bản ghi khi đã có resource và recordId.',
    input_schema: { type: 'object', properties: { resource: { type: 'string' }, recordId: { type: 'string' } }, required: ['resource', 'recordId'] },
  },
  {
    name: 'get_accounting_report',
    description: 'Lấy số liệu báo cáo kế toán. Chỉ dùng khi người dùng yêu cầu báo cáo.',
    input_schema: { type: 'object', properties: { report: { type: 'string', enum: ['trial-balance', 'cash-flow', 'receivables', 'payables', 'general-ledger'] }, params: { type: 'object', description: 'Các bộ lọc dạng chuỗi, ví dụ fromDate, toDate, branchId, accountNumber' } }, required: ['report'] },
  },
  {
    name: 'propose_record_change',
    description: 'THỰC HIỆN tạo, cập nhật hoặc lưu trữ một bản ghi. Với create/update, công cụ ghi dữ liệu ngay lập tức: chỉ gọi khi ý định và dữ liệu đã rõ, sau đó thông báo kết quả đã thực hiện; không đề xuất hay yêu cầu xác nhận. Chỉ archive mới trả về nút xác nhận riêng trong CMS.',
    input_schema: { type: 'object', properties: { operation: { type: 'string', enum: ['create', 'update', 'archive'] }, resource: { type: 'string' }, recordId: { type: 'string', description: 'Bắt buộc khi update hoặc archive' }, values: { type: 'object', description: 'Các trường cần tạo/cập nhật; chỉ gửi các trường đã được người dùng cung cấp hoặc xác nhận' }, summary: { type: 'string', description: 'Mô tả ngắn, chính xác nội dung thay đổi để người dùng xác nhận' } }, required: ['operation', 'resource', 'summary'] },
  },
  {
    name: 'open_screen',
    description: 'Mở đúng màn hình CMS để hướng dẫn người dùng thao tác. Có thể dùng để chỉ đường dẫn.',
    input_schema: { type: 'object', properties: { path: { type: 'string', description: 'Đường dẫn nội bộ, ví dụ /customers hoặc /appointments' }, label: { type: 'string' } }, required: ['path', 'label'] },
  },
  {
    name: 'open_import',
    description: 'Mở màn hình import Excel của một phân hệ.',
    input_schema: { type: 'object', properties: { resource: { type: 'string' } }, required: ['resource'] },
  },
];

const TOOL_DEFINITIONS = [
  {
    name: 'search_services',
    description: 'Tìm kiếm các dịch vụ, liệu trình điều trị của phòng khám theo từ khóa.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Từ khóa tìm kiếm dịch vụ hoặc liệu trình' },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_appointment',
    description: 'Đặt lịch hẹn cho khách hàng tại phòng khám.',
    input_schema: {
      type: 'object',
      properties: {
        customerName: { type: 'string', description: 'Tên khách hàng' },
        customerPhone: { type: 'string', description: 'Số điện thoại khách hàng' },
        startTime: { type: 'string', description: 'Thời gian hẹn (ISO 8601, ví dụ 2024-06-15T09:00:00)' },
        note: { type: 'string', description: 'Ghi chú thêm (tuỳ chọn)' },
        doctorName: { type: 'string', description: 'Tên bác sĩ mong muốn (tuỳ chọn)' },
      },
      required: ['customerName', 'customerPhone', 'startTime'],
    },
  },
  {
    name: 'check_doctor_schedule',
    description: 'Kiểm tra lịch làm việc của bác sĩ trong một ngày cụ thể.',
    input_schema: {
      type: 'object',
      properties: {
        doctorName: { type: 'string', description: 'Tên bác sĩ cần kiểm tra' },
        date: { type: 'string', description: 'Ngày cần kiểm tra (định dạng YYYY-MM-DD)' },
      },
      required: ['date'],
    },
  },
  {
    name: 'lookup_customer_appointments',
    description: 'Tra cứu lịch hẹn của khách hàng dựa trên số điện thoại và tên. Chỉ dùng khi khách hàng cung cấp đủ cả tên và số điện thoại.',
    input_schema: {
      type: 'object',
      properties: {
        customerPhone: { type: 'string', description: 'Số điện thoại của khách hàng' },
        customerName: { type: 'string', description: 'Tên khách hàng (để xác minh danh tính)' },
      },
      required: ['customerPhone', 'customerName'],
    },
  },
];

@Controller()
export class ChatbotController {
  constructor(
    private readonly settings: SettingsService,
    @InjectRepository(Treatment) private readonly treatments: Repository<Treatment>,
    @InjectRepository(Appointment) private readonly appointments: Repository<Appointment>,
    @InjectRepository(WorkSchedule) private readonly workSchedules: Repository<WorkSchedule>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(Staff) private readonly staff: Repository<Staff>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(AdminChatbotConversation) private readonly adminConversations: Repository<AdminChatbotConversation>,
    @InjectRepository(AdminChatbotMessage) private readonly adminMessages: Repository<AdminChatbotMessage>,
    private readonly records: RecordsService,
  ) {}

  @Public()
  @Get('public/chatbot/config')
  async getConfig() {
    return { data: await this.settings.getChatbotPublicConfig() };
  }

  @Public()
  @Post('public/chatbot/chat')
  async chat(@Body() body: { messages: ChatMessage[] }) {
    const config = await this.settings.getChatbotInternalConfig();

    if (!config.apiKey) {
      return { data: { message: 'Chatbot chưa được cấu hình. Vui lòng liên hệ quản trị viên.' } };
    }

    const enabledTools = TOOL_DEFINITIONS.filter((tool) => {
      if (tool.name === 'search_services') return config.toolSearchServices;
      if (tool.name === 'create_appointment') return config.toolCreateAppointment;
      if (tool.name === 'check_doctor_schedule') return config.toolCheckDoctorSchedule;
      if (tool.name === 'lookup_customer_appointments') return config.toolLookupAppointments;
      return false;
    });

    const systemPrompt = config.systemPrompt || 'Bạn là trợ lý tư vấn dịch vụ của phòng khám Thiện Chánh. Hãy trả lời thân thiện, ngắn gọn bằng tiếng Việt. Hỗ trợ khách hàng tìm hiểu dịch vụ và đặt lịch hẹn.';

    const messages: ChatMessage[] = (body.messages || []).filter(
      (msg) => msg.role === 'user' || msg.role === 'assistant',
    );

    let response = await this.callClaude(config.apiKey, config.model, systemPrompt, messages, enabledTools);

    while (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter((block) => block.type === 'tool_use');
      const toolResults: AnthropicContent[] = [];

      for (const toolUse of toolUseBlocks) {
        const result = await this.executeTool(toolUse.name as string, toolUse.input as Record<string, string>);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }

      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });

      response = await this.callClaude(config.apiKey, config.model, systemPrompt, messages, enabledTools);
    }

    const textBlock = response.content.find((block) => block.type === 'text');
    return { data: { message: textBlock?.text || '' } };
  }

  @Get('admin/chatbot/config')
  async getAdminConfig() {
    const config = await this.settings.getChatbotInternalConfig();
    return { data: { enabled: Boolean(config.adminEnabled && config.adminApiKey) } };
  }

  @Post('admin/chatbot/chat')
  async adminChat(
    @Body() body: { messages: ChatMessage[]; context?: Record<string, unknown>; conversationId?: string },
    @Request() request?: { user?: AuthUser },
  ) {
    const user = request?.user;
    if (!user) return { data: { message: 'Phiên đăng nhập đã hết hạn.' } };

    const config = await this.settings.getChatbotInternalConfig();
    if (!config.adminEnabled || !config.adminApiKey) {
      return { data: { message: 'Trợ lý CMS chưa được bật hoặc chưa có API key. Vào Công cụ hệ thống → Trợ lý chat để cấu hình.' } };
    }

    const enabledTools = ADMIN_TOOL_DEFINITIONS.filter((tool) => {
      if (tool.name === 'search_records' || tool.name === 'inspect_record') return config.adminToolReadData;
      if (tool.name === 'get_accounting_report') return config.adminToolReports;
      if (tool.name === 'propose_record_change') return config.adminToolMutations;
      if (tool.name === 'open_import') return config.adminToolImport;
      return true;
    });
    const actions: AdminChatAction[] = [];
    const mutationState = { changed: false };
    const conversation = await this.resolveConversation(user.id, body.conversationId);
    const messages: ChatMessage[] = (body.messages || []).filter((msg) => msg.role === 'user' || msg.role === 'assistant');
    const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user');
    if (latestUserMessage?.content) {
      await this.adminMessages.save(this.adminMessages.create({
        conversationId: conversation.id,
        role: 'user',
        content: String(latestUserMessage.content).slice(0, 10000),
      }));
      if (!conversation.title) {
        conversation.title = String(latestUserMessage.content).trim().slice(0, 120);
        await this.adminConversations.save(conversation);
      }
    }
    const context = this.cleanAdminContext(body.context);
    const defaultPrompt = `Bạn là GIS AI, trợ lý vận hành CMS. Trả lời bằng tiếng Việt, ngắn gọn, rõ ràng và dùng Markdown chuẩn (heading, danh sách, in đậm) khi nó làm câu trả lời dễ đọc hơn.
Bạn hỗ trợ nhập liệu, kiểm tra dữ liệu, báo cáo và hướng dẫn sử dụng CMS. Ngữ cảnh màn hình hiện tại: ${JSON.stringify(context)}.
Nếu ngữ cảnh có resource và recordId, đó chính là bản ghi mà người dùng đang xem; các cách nói như “khách hàng này”, “ca này”, “bản ghi này” phải được hiểu là bản ghi đó. Không hỏi lại mã hoặc ID; khi cần kiểm tra dữ liệu, gọi inspect_record với resource và recordId trước. Các tool tra cứu, xem chi tiết, tạo và cập nhật sẽ tự sinh nút link CMS; không cần tự viết URL hoặc UUID trong câu trả lời. Khi hướng dẫn, hãy gọi open_screen hoặc open_import để CMS hiển thị đường dẫn có thể bấm. Khi yêu cầu tạo hoặc cập nhật đã rõ và đủ dữ liệu, BẮT BUỘC gọi propose_record_change ngay. Create/update được thực hiện ngay bởi công cụ, vì vậy sau khi gọi hãy chỉ thông báo “đã tạo/đã cập nhật”, tuyệt đối không nói “đề xuất”, không yêu cầu bấm xác nhận và không hỏi lại. Chỉ hỏi khi thiếu dữ liệu bắt buộc hoặc ý định thực sự mơ hồ. Lưu trữ/xóa luôn cần xác nhận trong CMS. Không tự bịa dữ liệu, không tiết lộ dữ liệu ngoài kết quả công cụ, và không đề xuất thao tác không có quyền.
QUY TẮC HIỂN THỊ DỮ LIỆU: Tuyệt đối không hiển thị UUID/ID kỹ thuật cho người dùng, kể cả trong Markdown, ví dụ hay ghi chú. Với bất kỳ dữ liệu liên kết nào, luôn gọi bằng tên hiển thị đã được trả về (khách hàng, bác sĩ, nhân viên, sản phẩm, chi nhánh…), không gọi bằng trường kết thúc bằng Id. Các mã tham chiếu nội bộ trong kết quả công cụ chỉ phục vụ cho việc gọi công cụ tiếp theo. Khi trình bày danh sách bằng bảng Markdown, chỉ chọn tối đa 4 cột thực sự hữu ích cho câu hỏi; ưu tiên tên, thời gian, trạng thái và thông tin cần quyết định. Không đưa cột #, ID, chi nhánh hay trường kỹ thuật trừ khi người dùng yêu cầu rõ.`;
    const systemPrompt = `${defaultPrompt}\n\n${config.adminSystemPrompt || ''}`.trim();
    let response = await this.callClaude(config.adminApiKey, config.model, systemPrompt, messages, enabledTools as typeof TOOL_DEFINITIONS);

    while (response.stop_reason === 'tool_use') {
      const toolResults: AnthropicContent[] = [];
      for (const toolUse of response.content.filter((block) => block.type === 'tool_use')) {
        const result = await this.executeAdminTool(
          String(toolUse.name || ''),
          (toolUse.input || {}) as Record<string, unknown>,
          user,
          actions,
          mutationState,
        );
        toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify(result) });
      }
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
      response = await this.callClaude(config.adminApiKey, config.model, systemPrompt, messages, enabledTools as typeof TOOL_DEFINITIONS);
    }

    const textBlock = response.content.find((block) => block.type === 'text');
    const answer = this.redactTechnicalIds(String(textBlock?.text || ''));
    await this.adminMessages.save(this.adminMessages.create({
      conversationId: conversation.id,
      role: 'assistant',
      content: answer.slice(0, 10000),
      actionsJson: actions.length ? JSON.stringify(actions) : undefined,
    }));
    return { data: { message: answer, actions, conversationId: conversation.id, reload: mutationState.changed } };
  }

  @Get('admin/chatbot/conversations/:id')
  async getAdminConversation(@Param('id') id: string, @Request() request?: { user?: AuthUser }) {
    const user = request?.user;
    if (!user) return { data: null };
    const isAdmin = (user.roleMain || user.role) === 'ADMIN';
    const conversation = await this.adminConversations.findOne({ where: isAdmin ? { id } : { id, userId: user.id } });
    if (!conversation) return { data: null };
    const messages = await this.adminMessages.find({ where: { conversationId: id }, order: { createdAt: 'ASC' }, take: 100 });
    return {
      data: {
        id: conversation.id,
        messages: messages.map((message) => ({
          role: message.role,
          content: message.content,
          actions: message.actionsJson ? JSON.parse(message.actionsJson) : [],
        })),
      },
    };
  }

  @Get('admin/chatbot/conversations')
  async listAdminConversations(@Request() request?: { user?: AuthUser }) {
    const user = request?.user;
    if (!user) throw new ForbiddenException('Phiên đăng nhập đã hết hạn');
    const isAdmin = (user.roleMain || user.role) === 'ADMIN';
    const conversations = await this.adminConversations.find({
      where: isAdmin ? {} : { userId: user.id },
      order: { updatedAt: 'DESC' },
      take: 100,
    });
    const userIds = [...new Set(conversations.map((conversation) => conversation.userId))];
    const users = userIds.length ? await this.users.find({ where: { id: In(userIds) }, select: ['id', 'fullName', 'email', 'username'] }) : [];
    const userById = new Map(users.map((item) => [item.id, item]));
    const messages = conversations.length
      ? await this.adminMessages.find({ where: { conversationId: In(conversations.map((conversation) => conversation.id)) }, order: { createdAt: 'DESC' } })
      : [];
    const latestMessageByConversation = new Map<string, AdminChatbotMessage>();
    for (const message of messages) {
      if (!latestMessageByConversation.has(message.conversationId)) latestMessageByConversation.set(message.conversationId, message);
    }
    return {
      data: conversations.map((conversation) => {
        const owner = userById.get(conversation.userId);
        const latest = latestMessageByConversation.get(conversation.id);
        return {
          id: conversation.id,
          title: conversation.title,
          userId: conversation.userId,
          userName: owner?.fullName || owner?.username || owner?.email || conversation.userId,
          updatedAt: conversation.updatedAt,
          latestMessage: latest?.content || '',
        };
      }),
    };
  }

  @Post('admin/chatbot/action')
  async executeAdminAction(
    @Body() action: AdminChatAction,
    @Request() request?: { user?: AuthUser },
  ) {
    const user = request?.user;
    if (!user) return { data: { message: 'Phiên đăng nhập đã hết hạn.' } };
    const config = await this.settings.getChatbotInternalConfig();
    if (!config.adminEnabled || !config.adminToolMutations || !config.adminApiKey) {
      return { data: { message: 'Thao tác dữ liệu bằng trợ lý CMS hiện chưa được bật.' } };
    }
    if (action.type !== 'mutation' || !action.operation || !action.resource) {
      return { data: { message: 'Thao tác không hợp lệ.' } };
    }
    if (action.operation === 'create') return this.records.create(action.resource, action.values || {}, user);
    if (action.operation === 'update' && action.recordId) return this.records.update(action.resource, action.recordId, action.values || {}, user);
    if (action.operation === 'archive' && action.recordId) return this.records.remove(action.resource, action.recordId, user);
    return { data: { message: 'Thiếu thông tin bản ghi cần thao tác.' } };
  }

  private cleanAdminContext(context?: Record<string, unknown>) {
    return {
      path: String(context?.path || '/').slice(0, 200),
      resource: String(context?.resource || '').slice(0, 80),
      recordId: String(context?.recordId || '').slice(0, 100),
      query: typeof context?.query === 'object' && context.query ? context.query : {},
    };
  }

  private async resolveConversation(userId: string, conversationId?: string) {
    if (conversationId) {
      const existing = await this.adminConversations.findOne({ where: { id: conversationId, userId } });
      if (existing) return existing;
    }
    return this.adminConversations.save(this.adminConversations.create({ userId }));
  }

  private async executeAdminTool(
    name: string,
    input: Record<string, unknown>,
    user: AuthUser,
    actions: AdminChatAction[],
    mutationState: { changed: boolean },
  ) {
    try {
      if (name === 'search_records') {
        const resource = String(input.resource || '');
        const result = await this.records.list(resource, 1, 10, String(input.query || ''), {}, user, undefined, '*');
        actions.push({ type: 'navigate', path: `/${resource}`, label: 'Mở danh sách' });
        result.data.slice(0, 5).forEach((row) => {
          const record = row as unknown as Record<string, unknown>;
          const recordId = String(record.id || '');
          const label = this.recordDisplayName(record);
          if (recordId && label) actions.push({ type: 'navigate', path: `/${resource}/${recordId}/full`, label: `Xem: ${label}` });
        });
        return { resource, total: result.total, rows: result.data.map((row) => this.toChatbotReadableData(row, true)) };
      }
      if (name === 'inspect_record') {
        const resource = String(input.resource || '');
        const recordId = String(input.recordId || '');
        const result = await this.records.find(resource, recordId, user, undefined, '*');
        actions.push({ type: 'navigate', path: `/${resource}/${recordId}/full`, label: 'Mở chi tiết' });
        return { data: this.toChatbotReadableData(result.data) };
      }
      if (name === 'get_accounting_report') {
        const params = Object.fromEntries(Object.entries((input.params || {}) as Record<string, unknown>).map(([key, value]) => [key, String(value)]));
        const report = String(input.report || '');
        if (report === 'trial-balance') return this.toChatbotReadableData(await this.records.accountingTrialBalance(params, user));
        if (report === 'cash-flow') return this.toChatbotReadableData(await this.records.accountingCashFlow(params, user));
        if (report === 'receivables') return this.toChatbotReadableData(await this.records.accountingReceivables(params, user));
        if (report === 'payables') return this.toChatbotReadableData(await this.records.accountingPayables(params, user));
        if (report === 'general-ledger') return this.toChatbotReadableData(await this.records.accountingGeneralLedger(params, user));
        return { error: 'Loại báo cáo không hỗ trợ.' };
      }
      if (name === 'propose_record_change') {
        const operation = String(input.operation || '');
        const resource = String(input.resource || '');
        const recordId = input.recordId ? String(input.recordId) : undefined;
        if (!['create', 'update', 'archive'].includes(operation) || !resource || ((operation === 'update' || operation === 'archive') && !recordId)) {
          return { error: 'Đề xuất thay đổi thiếu operation, resource hoặc recordId.' };
        }
        const values = (input.values || {}) as Record<string, unknown>;
        if (operation === 'create') {
          const result = await this.records.create(resource, values, user);
          mutationState.changed = true;
          const createdId = String(((result as Record<string, unknown>)?.data as Record<string, unknown> | undefined)?.id || '');
          if (createdId) actions.push({ type: 'navigate', path: `/${resource}/${createdId}/full`, label: 'Xem bản ghi vừa tạo' });
          return { executed: true, operation, resource, result: this.toChatbotReadableData(result) };
        }
        if (operation === 'update' && recordId) {
          const result = await this.records.update(resource, recordId, values, user);
          mutationState.changed = true;
          actions.push({ type: 'navigate', path: `/${resource}/${recordId}/full`, label: 'Xem bản ghi đã cập nhật' });
          return { executed: true, operation, resource, result: this.toChatbotReadableData(result) };
        }
        const summary = String(input.summary || 'Xác nhận lưu trữ dữ liệu');
        const action: AdminChatAction = {
          type: 'mutation',
          operation: 'archive',
          resource,
          recordId,
          values,
          summary,
          label: await this.archiveActionLabel(resource, recordId!, user, summary),
        };
        actions.push(action);
        return { proposed: true, summary: action.summary, confirmationRequired: true };
      }
      if (name === 'open_screen') {
        const path = String(input.path || '');
        if (!path.startsWith('/') || path.startsWith('//')) return { error: 'Đường dẫn không hợp lệ.' };
        actions.push({ type: 'navigate', path, label: String(input.label || 'Mở màn hình') });
        return { path, openedByUser: true };
      }
      if (name === 'open_import') {
        const resource = String(input.resource || '');
        const path = `/${resource}/import`;
        actions.push({ type: 'navigate', path, label: `Mở Import ${resource}` });
        return { path, openedByUser: true };
      }
      return { error: 'Công cụ không hỗ trợ.' };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Không thể thực hiện yêu cầu.' };
    }
  }

  private async callClaude(
    apiKey: string,
    model: string,
    system: string,
    messages: ChatMessage[],
    tools: typeof TOOL_DEFINITIONS,
  ): Promise<AnthropicResponse> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-6',
        max_tokens: 1024,
        system,
        messages,
        tools: tools.length ? tools : undefined,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Anthropic API error: ${error}`);
    }

    return res.json() as Promise<AnthropicResponse>;
  }

  /** Convert hydrated record relations to their human labels before sending them to the LLM. */
  private toChatbotReadableData(value: unknown, keepRecordReference = false): unknown {
    if (value === null || value === undefined) return value;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') return this.isTechnicalId(value) ? undefined : value;
    if (typeof value !== 'object') return value;
    if (Array.isArray(value)) return value
      .map((item) => this.toChatbotReadableData(item, keepRecordReference))
      .filter((item) => item !== undefined);

    const source = value as Record<string, unknown>;
    const relationObjectKeys = new Set<string>();
    const result: Record<string, unknown> = {};
    for (const [key, related] of Object.entries(source)) {
      if (!key.endsWith('Id') || !related) continue;
      const relationKey = key.slice(0, -2);
      const relatedObject = source[relationKey];
      if (!relatedObject || typeof relatedObject !== 'object' || Array.isArray(relatedObject)) continue;
      const label = this.recordDisplayName(relatedObject as Record<string, unknown>);
      if (label) result[relationKey] = label;
      relationObjectKeys.add(relationKey);
    }

    for (const [key, item] of Object.entries(source)) {
      if (key === 'id') {
        // The model may need this only to follow up on a search result; it is explicitly forbidden from displaying it.
        if (keepRecordReference && typeof item === 'string') result.recordRef = item;
        continue;
      }
      if (key.endsWith('Id') || relationObjectKeys.has(key)) continue;
      const normalized = this.toChatbotReadableData(item);
      if (normalized !== undefined) result[key] = normalized;
    }
    return result;
  }

  private recordDisplayName(record: Record<string, unknown>) {
    return ['fullName', 'name', 'title', 'display_title', 'serviceName', 'accountNumber', 'code', 'email', 'username', 'slug']
      .map((key) => record[key])
      .find((value) => typeof value === 'string' && value.trim());
  }

  private isTechnicalId(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
  }

  private redactTechnicalIds(value: string) {
    return value
      .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, '')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\(\s*\)/g, '');
  }

  private async archiveActionLabel(resource: string, recordId: string, user: AuthUser, fallback: string) {
    try {
      const result = await this.records.find(resource, recordId, user, undefined, '*');
      const record = result.data as unknown as Record<string, unknown>;
      const linkedName = ['customer', 'staff', 'doctorStaff', 'supplier', 'product', 'project']
        .map((key) => record[key])
        .find((value): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value));
      const name = this.recordDisplayName(record) || (linkedName ? this.recordDisplayName(linkedName) : undefined);
      const timeValue = record.startTime || record.workDate || record.date;
      const time = timeValue ? new Date(String(timeValue)).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '';
      if (name || time) return `Lưu trữ: ${name || 'bản ghi'}${time ? ` · ${time}` : ''}`.slice(0, 96);
    } catch {
      // The action itself still has the validated resource and record ID.
    }
    return fallback.replace(/^xác nhận\s*/i, '').trim() || 'Xác nhận lưu trữ';
  }

  private async executeTool(name: string, input: Record<string, string>) {
    if (name === 'search_services') {
      const query = input.query || '';
      const results = await this.treatments.find({
        where: { name: ILike(`%${query}%`) },
        take: 5,
        order: { createdAt: 'DESC' },
      });
      if (!results.length) return { message: 'Không tìm thấy dịch vụ phù hợp.' };
      return results.map((t) => ({
        name: t.name,
        totalSessions: t.totalSessions,
        status: t.status,
      }));
    }

    if (name === 'create_appointment') {
      const startTime = new Date(input.startTime);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
      const doctorStaffId = input.doctorName ? await this.findDoctorStaffIdByName(input.doctorName) : undefined;
      const appointment = this.appointments.create({
        customerId: 'pending',
        branchId: 'default',
        type: 'CONSULTATION',
        startTime,
        endTime,
        status: 'SCHEDULED',
        doctorStaffId,
        note: `[Đặt qua chatbot] Tên: ${input.customerName}, SĐT: ${input.customerPhone}${input.doctorName ? `. Bác sĩ mong muốn: ${input.doctorName}` : ''}${input.note ? '. ' + input.note : ''}`,
      });
      await this.appointments.save(appointment);
      return {
        success: true,
        message: `Đã đặt lịch thành công vào ${startTime.toLocaleString('vi-VN')} cho ${input.customerName}.`,
      };
    }

    if (name === 'check_doctor_schedule') {
      const date = input.date;
      const doctorStaffId = input.doctorName ? await this.findDoctorStaffIdByName(input.doctorName) : undefined;
      const schedules = await this.workSchedules.find({
        where: doctorStaffId ? { workDate: date, staffId: doctorStaffId } : { workDate: date },
        take: 10,
      });

      const bookedAppointments = await this.appointments.find({
        where: doctorStaffId ? { doctorStaffId } : {},
        take: 20,
        order: { startTime: 'ASC' },
      });

      const dayAppointments = bookedAppointments.filter((apt) => {
        const aptDate = apt.startTime?.toISOString().slice(0, 10);
        return aptDate === date;
      });
      const staffNames = await this.staffNamesById([
        ...schedules.map((item) => item.staffId),
        ...dayAppointments.map((item) => item.doctorStaffId),
      ]);

      return {
        date,
        schedules: schedules.map((s) => ({
          staff: staffNames.get(s.staffId) || 'Chưa xác định',
          shift: s.shiftLabel,
          start: s.startTime,
          end: s.endTime,
        })),
        appointments: dayAppointments.map((a) => ({
          doctor: staffNames.get(a.doctorStaffId || '') || 'Chưa xác định',
          start: a.startTime,
          end: a.endTime,
          status: a.status,
        })),
      };
    }

    if (name === 'lookup_customer_appointments') {
      const phone = input.customerPhone?.trim().replace(/\D/g, '');
      const nameQuery = input.customerName?.trim();

      if (!phone || !nameQuery) {
        return { error: 'Cần cung cấp đủ số điện thoại và tên.' };
      }

      // Tìm customer trùng SĐT (chuẩn hóa số)
      const allCustomers = await this.customers.find({
        where: { phone: ILike(`%${phone.slice(-9)}%`) },
        take: 10,
      });

      // Xác minh tên: so khớp mềm (tên chứa hoặc chứa trong nameQuery)
      const matched = allCustomers.filter((c) => {
        const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        return normalize(c.fullName).includes(normalize(nameQuery)) ||
               normalize(nameQuery).includes(normalize(c.fullName));
      });

      if (!matched.length) {
        // Cũng tra các lịch hẹn được đặt qua chatbot (customerId = 'pending', tên+SĐT trong note)
        const chatbotApts = await this.appointments.find({
          where: { note: ILike(`%${phone.slice(-9)}%`) },
          order: { startTime: 'ASC' },
          take: 10,
        });
        const matchedChatbot = chatbotApts.filter((a) =>
          a.note?.toLowerCase().includes(nameQuery.toLowerCase().split(' ').pop() || ''),
        );
        if (!matchedChatbot.length) {
          return { found: false, message: 'Không tìm thấy khách hàng với thông tin đã cung cấp. Vui lòng kiểm tra lại tên và số điện thoại.' };
        }
        const staffNames = await this.staffNamesById(matchedChatbot.map((item) => item.doctorStaffId));
        return {
          found: true,
          source: 'chatbot',
          appointments: matchedChatbot.map((a) => ({
            startTime: a.startTime,
            endTime: a.endTime,
            status: a.status,
            type: a.type,
            doctor: staffNames.get(a.doctorStaffId || '') || 'Chưa xác định',
            note: a.note,
          })),
        };
      }

      // Lấy appointments của tất cả customer matched
      const customerIds = matched.map((c) => c.id);
      const aptList = await this.appointments.find({
        where: customerIds.map((id) => ({ customerId: id })),
        order: { startTime: 'ASC' },
        take: 20,
      });
      const staffNames = await this.staffNamesById(aptList.map((item) => item.doctorStaffId));

      return {
        found: true,
        source: 'crm',
        customer: { fullName: matched[0].fullName, phone: matched[0].phone, status: matched[0].status },
        appointments: aptList.map((a) => ({
          startTime: a.startTime,
          endTime: a.endTime,
          status: a.status,
          type: a.type,
          doctor: staffNames.get(a.doctorStaffId || '') || 'Chưa xác định',
          note: a.note,
        })),
      };
    }

    return { error: 'Unknown tool' };
  }

  private async findDoctorStaffIdByName(doctorName: string) {
    const normalized = doctorName.trim();
    if (!normalized) return undefined;

    const doctorUsers = await this.users.find({
      where: { role: 'DOCTOR' },
      select: ['staffId'],
      take: 500,
    });
    const staffIds = doctorUsers.map((item) => item.staffId).filter(Boolean) as string[];
    if (!staffIds.length) return undefined;

    const doctors = await this.staff.find({ where: staffIds.map((id) => ({ id })) });
    const match = doctors.find((item) => item.fullName.toLowerCase().includes(normalized.toLowerCase()));
    return match?.id;
  }

  private async staffNamesById(ids: Array<string | undefined>) {
    const uniqueIds = [...new Set(ids.filter(Boolean) as string[])];
    if (!uniqueIds.length) return new Map<string, string>();
    const rows = await this.staff.find({ where: { id: In(uniqueIds) }, select: ['id', 'fullName'] });
    return new Map(rows.map((item) => [item.id, item.fullName]));
  }
}
