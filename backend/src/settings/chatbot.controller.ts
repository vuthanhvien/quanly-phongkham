import { Body, Controller, Get, Param, Post, Request } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
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
    description: 'Đề xuất tạo, cập nhật hoặc lưu trữ một bản ghi. KHÔNG tự khẳng định đã thực hiện: CMS sẽ hiển thị nút xác nhận riêng cho người dùng.',
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
    const defaultPrompt = `Bạn là GISCAT, trợ lý vận hành CMS. Trả lời bằng tiếng Việt, ngắn gọn, rõ ràng và dùng Markdown chuẩn (heading, danh sách, in đậm) khi nó làm câu trả lời dễ đọc hơn.
Bạn hỗ trợ nhập liệu, kiểm tra dữ liệu, báo cáo và hướng dẫn sử dụng CMS. Ngữ cảnh màn hình hiện tại: ${JSON.stringify(context)}.
Khi hướng dẫn, hãy gọi open_screen hoặc open_import để CMS hiển thị đường dẫn có thể bấm. Khi cần thay đổi dữ liệu, trước tiên phải hỏi đủ dữ liệu còn thiếu; sau đó gọi propose_record_change. Việc thay đổi chỉ có hiệu lực sau khi người dùng bấm Xác nhận trong CMS. Không tự bịa dữ liệu, không tiết lộ dữ liệu ngoài kết quả công cụ, và không đề xuất thao tác không có quyền.`;
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
        );
        toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify(result) });
      }
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
      response = await this.callClaude(config.adminApiKey, config.model, systemPrompt, messages, enabledTools as typeof TOOL_DEFINITIONS);
    }

    const textBlock = response.content.find((block) => block.type === 'text');
    const answer = String(textBlock?.text || '');
    await this.adminMessages.save(this.adminMessages.create({
      conversationId: conversation.id,
      role: 'assistant',
      content: answer.slice(0, 10000),
      actionsJson: actions.length ? JSON.stringify(actions) : undefined,
    }));
    return { data: { message: answer, actions, conversationId: conversation.id } };
  }

  @Get('admin/chatbot/conversations/:id')
  async getAdminConversation(@Param('id') id: string, @Request() request?: { user?: AuthUser }) {
    const user = request?.user;
    if (!user) return { data: null };
    const conversation = await this.adminConversations.findOne({ where: { id, userId: user.id } });
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
  ) {
    try {
      if (name === 'search_records') {
        const resource = String(input.resource || '');
        const result = await this.records.list(resource, 1, 10, String(input.query || ''), {}, user);
        return { resource, total: result.total, rows: result.data };
      }
      if (name === 'inspect_record') {
        return this.records.find(String(input.resource || ''), String(input.recordId || ''), user);
      }
      if (name === 'get_accounting_report') {
        const params = Object.fromEntries(Object.entries((input.params || {}) as Record<string, unknown>).map(([key, value]) => [key, String(value)]));
        const report = String(input.report || '');
        if (report === 'trial-balance') return this.records.accountingTrialBalance(params, user);
        if (report === 'cash-flow') return this.records.accountingCashFlow(params, user);
        if (report === 'receivables') return this.records.accountingReceivables(params, user);
        if (report === 'payables') return this.records.accountingPayables(params, user);
        if (report === 'general-ledger') return this.records.accountingGeneralLedger(params, user);
        return { error: 'Loại báo cáo không hỗ trợ.' };
      }
      if (name === 'propose_record_change') {
        const operation = String(input.operation || '');
        const resource = String(input.resource || '');
        const recordId = input.recordId ? String(input.recordId) : undefined;
        if (!['create', 'update', 'archive'].includes(operation) || !resource || ((operation === 'update' || operation === 'archive') && !recordId)) {
          return { error: 'Đề xuất thay đổi thiếu operation, resource hoặc recordId.' };
        }
        const action: AdminChatAction = { type: 'mutation', operation: operation as NonNullable<AdminChatAction['operation']>, resource, recordId, values: (input.values || {}) as Record<string, unknown>, summary: String(input.summary || 'Xác nhận thay đổi dữ liệu'), label: operation === 'archive' ? 'Xác nhận lưu trữ' : 'Xác nhận thực hiện' };
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
        id: t.id,
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
        appointmentId: appointment.id,
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

      return {
        date,
        schedules: schedules.map((s) => ({
          staffId: s.staffId,
          shift: s.shiftLabel,
          start: s.startTime,
          end: s.endTime,
        })),
        appointments: dayAppointments.map((a) => ({
          id: a.id,
          doctor: a.doctorStaffId,
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
        return {
          found: true,
          source: 'chatbot',
          appointments: matchedChatbot.map((a) => ({
            id: a.id,
            startTime: a.startTime,
            endTime: a.endTime,
            status: a.status,
            type: a.type,
            doctor: a.doctorStaffId,
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

      return {
        found: true,
        source: 'crm',
        customer: { fullName: matched[0].fullName, phone: matched[0].phone, status: matched[0].status },
        appointments: aptList.map((a) => ({
          id: a.id,
          startTime: a.startTime,
          endTime: a.endTime,
          status: a.status,
          type: a.type,
          doctor: a.doctorStaffId,
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
}
