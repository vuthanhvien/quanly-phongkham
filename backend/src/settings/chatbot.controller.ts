import { Body, Controller, Get, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Public } from '../common/auth';
import { Appointment, Customer, Treatment, WorkSchedule } from '../entities/entities';
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

@Controller('public/chatbot')
export class ChatbotController {
  constructor(
    private readonly settings: SettingsService,
    @InjectRepository(Treatment) private readonly treatments: Repository<Treatment>,
    @InjectRepository(Appointment) private readonly appointments: Repository<Appointment>,
    @InjectRepository(WorkSchedule) private readonly workSchedules: Repository<WorkSchedule>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
  ) {}

  @Public()
  @Get('config')
  async getConfig() {
    return { data: await this.settings.getChatbotPublicConfig() };
  }

  @Public()
  @Post('chat')
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
      const appointment = this.appointments.create({
        customerId: 'pending',
        branchId: 'default',
        type: 'CONSULTATION',
        startTime,
        endTime,
        status: 'SCHEDULED',
        doctorName: input.doctorName,
        note: `[Đặt qua chatbot] Tên: ${input.customerName}, SĐT: ${input.customerPhone}${input.note ? '. ' + input.note : ''}`,
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
      const schedules = await this.workSchedules.find({
        where: input.doctorName
          ? { workDate: date, staffId: ILike(`%${input.doctorName}%`) }
          : { workDate: date },
        take: 10,
      });

      const bookedAppointments = await this.appointments.find({
        where: input.doctorName ? { doctorName: ILike(`%${input.doctorName}%`) } : {},
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
          doctor: a.doctorName,
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
            doctor: a.doctorName,
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
          doctor: a.doctorName,
          note: a.note,
        })),
      };
    }

    return { error: 'Unknown tool' };
  }
}
