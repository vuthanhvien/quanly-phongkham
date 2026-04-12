import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function phoneHash(phone: string) {
  return createHash("sha256").update(phone.trim()).digest("hex");
}

function nextCustomerCode(last: string | null): string {
  if (!last) return "KH00001";
  const num = parseInt(last.replace("KH", "")) + 1;
  return "KH" + String(num).padStart(5, "0");
}

const SYSTEM_PROMPT = `Bạn là trợ lý đặt lịch của Phòng Khám Thẩm Mỹ. Nhiệm vụ của bạn là giúp khách hàng đặt lịch tư vấn và thực hiện dịch vụ.

Luôn trả lời bằng tiếng Việt, thân thiện và chuyên nghiệp.

Các dịch vụ phổ biến:
- Tư vấn thẩm mỹ (miễn phí)
- Nâng mũi, sửa mũi
- Cắt mí mắt, làm dày môi
- Căng da mặt, xóa nếp nhăn
- Tiêm filler, botox
- Triệt lông laser
- Điều trị da, trẻ hóa da

Quy trình đặt lịch bắt buộc:
1. Hỏi số điện thoại của khách (BẮT BUỘC trước tiên)
2. Hỏi năm sinh của khách (BẮT BUỘC, chỉ cần năm, VD: 1995)
3. Gọi tool check_phone với SĐT và năm sinh để kiểm tra hệ thống
4. Nếu khách chưa có: hỏi họ tên đầy đủ
5. Hỏi dịch vụ quan tâm
6. Hỏi ngày giờ mong muốn (tùy chọn, định dạng YYYY-MM-DDTHH:mm)
7. Hỏi ghi chú đặc biệt (tùy chọn)
8. Gọi tool create_booking để xác nhận đặt lịch
9. Xác nhận lại thông tin cho khách

Quy trình tra cứu lịch:
- Khi khách hỏi về lịch đã đặt: hỏi SĐT + năm sinh
- Gọi tool lookup_bookings để tìm lịch hẹn
- Hiển thị danh sách lịch đã đặt cho khách

Lưu ý:
- Luôn hỏi SĐT và NĂM SINH trước, cả hai đều bắt buộc.
- Nếu tool check_phone trả về thông tin khách (đã có trong hệ thống), dùng tên đó, không hỏi lại.
- Khi đã có đủ SĐT + năm sinh + tên + dịch vụ, gọi create_booking ngay.
- Ngày giờ nếu khách không cung cấp thì bỏ qua (không bắt buộc).`;

const tools: Anthropic.Tool[] = [
  {
    name: "get_branches",
    description: "Lấy danh sách chi nhánh phòng khám để khách chọn chi nhánh",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "check_phone",
    description: "Kiểm tra SĐT + năm sinh xem khách đã có trong hệ thống chưa. Gọi khi đã có cả SĐT và năm sinh.",
    input_schema: {
      type: "object" as const,
      properties: {
        phone: {
          type: "string",
          description: "Số điện thoại của khách hàng",
        },
        birthYear: {
          type: "string",
          description: "Năm sinh của khách (chỉ cần năm, VD: 1995)",
        },
      },
      required: ["phone", "birthYear"],
    },
  },
  {
    name: "lookup_bookings",
    description: "Tra cứu lịch hẹn đã đặt của khách bằng SĐT và năm sinh. Dùng khi khách hỏi về lịch đã đặt.",
    input_schema: {
      type: "object" as const,
      properties: {
        phone: {
          type: "string",
          description: "Số điện thoại của khách hàng",
        },
        birthYear: {
          type: "string",
          description: "Năm sinh của khách (VD: 1995)",
        },
      },
      required: ["phone", "birthYear"],
    },
  },
  {
    name: "create_booking",
    description: "Tạo booking cho khách hàng. Tự động tạo hồ sơ khách mới nếu chưa có. Gọi khi đã đủ: SĐT + họ tên + dịch vụ.",
    input_schema: {
      type: "object" as const,
      properties: {
        fullName: {
          type: "string",
          description: "Họ và tên đầy đủ của khách hàng",
        },
        phone: {
          type: "string",
          description: "Số điện thoại liên hệ (bắt buộc)",
        },
        serviceInterest: {
          type: "string",
          description: "Dịch vụ khách quan tâm (VD: Nâng mũi, Tiêm filler, Tư vấn thẩm mỹ...)",
        },
        preferredDateTime: {
          type: "string",
          description: "Ngày giờ mong muốn theo định dạng ISO 8601 (VD: 2026-04-15T09:00). Tùy chọn.",
        },
        note: {
          type: "string",
          description: "Ghi chú thêm của khách (tùy chọn)",
        },
        birthYear: {
          type: "string",
          description: "Năm sinh của khách (VD: 1995). Bắt buộc để lưu hồ sơ.",
        },
        branchId: {
          type: "string",
          description: "ID chi nhánh (tùy chọn, mặc định chi nhánh đầu tiên)",
        },
      },
      required: ["fullName", "phone", "birthYear", "serviceInterest"],
    },
  },
];

async function handleToolCall(toolName: string, toolInput: Record<string, string>): Promise<string> {
  if (toolName === "get_branches") {
    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      select: { id: true, name: true, address: true, phone: true },
    });
    return JSON.stringify(branches);
  }

  if (toolName === "check_phone") {
    const hash = phoneHash(toolInput.phone);
    const birthYear = parseInt(toolInput.birthYear);
    const customer = await prisma.customer.findFirst({
      where: { phoneHash: hash },
      select: { id: true, fullName: true, code: true, dateOfBirth: true, branch: { select: { name: true } } },
    });
    if (!customer) return JSON.stringify({ exists: false });

    // Xác minh năm sinh nếu khách đã có dateOfBirth
    if (customer.dateOfBirth) {
      const storedYear = new Date(customer.dateOfBirth).getFullYear();
      if (!isNaN(birthYear) && storedYear !== birthYear) {
        return JSON.stringify({
          exists: true,
          verified: false,
          message: "Năm sinh không khớp với hồ sơ, vui lòng kiểm tra lại",
        });
      }
    } else if (!isNaN(birthYear)) {
      // Lưu lại năm sinh nếu chưa có
      await prisma.customer.update({
        where: { id: customer.id },
        data: { dateOfBirth: new Date(`${birthYear}-01-01`) },
      });
    }

    return JSON.stringify({
      exists: true,
      verified: true,
      customerId: customer.id,
      fullName: customer.fullName,
      code: customer.code,
      branch: customer.branch?.name,
    });
  }

  if (toolName === "lookup_bookings") {
    const hash = phoneHash(toolInput.phone);
    const birthYear = parseInt(toolInput.birthYear);
    const customer = await prisma.customer.findFirst({
      where: { phoneHash: hash },
      select: { id: true, fullName: true, dateOfBirth: true },
    });
    if (!customer) return JSON.stringify({ found: false, message: "Không tìm thấy hồ sơ với số điện thoại này" });

    // Xác minh năm sinh
    if (customer.dateOfBirth) {
      const storedYear = new Date(customer.dateOfBirth).getFullYear();
      if (!isNaN(birthYear) && storedYear !== birthYear) {
        return JSON.stringify({ found: false, message: "Năm sinh không khớp, không thể tra cứu lịch hẹn" });
      }
    }

    const bookings = await prisma.publicBookingRequest.findMany({
      where: {
        phone: toolInput.phone.trim(),
        status: { not: "CANCELLED" },
      },
      orderBy: { submittedAt: "desc" },
      take: 5,
      select: {
        id: true,
        serviceInterest: true,
        preferredDate: true,
        status: true,
        submittedAt: true,
        note: true,
        branch: { select: { name: true } },
      },
    });

    if (bookings.length === 0) {
      return JSON.stringify({ found: true, fullName: customer.fullName, bookings: [], message: "Chưa có lịch hẹn nào" });
    }
    return JSON.stringify({ found: true, fullName: customer.fullName, bookings });
  }

  if (toolName === "create_booking") {
    try {
      const phone = toolInput.phone?.trim();
      const fullName = toolInput.fullName?.trim();
      if (!phone || !fullName) {
        return JSON.stringify({ error: "Thiếu số điện thoại hoặc họ tên" });
      }

      // Lấy chi nhánh
      let branchId = toolInput.branchId;
      if (!branchId) {
        const branch = await prisma.branch.findFirst({ where: { isActive: true } });
        if (!branch) return JSON.stringify({ error: "Không tìm thấy chi nhánh khả dụng" });
        branchId = branch.id;
      }

      // Tìm hoặc tạo khách hàng
      const hash = phoneHash(phone);
      let customer = await prisma.customer.findFirst({ where: { phoneHash: hash } });

      if (!customer) {
        // Cần system user để tạo customer — lấy user RECEPTIONIST/ADMIN đầu tiên
        const systemUser = await prisma.user.findFirst({
          where: { isActive: true, role: { name: { in: ["RECEPTIONIST", "ADMIN", "SUPER_ADMIN"] } } },
          select: { id: true },
          orderBy: { createdAt: "asc" },
        });
        if (!systemUser) return JSON.stringify({ error: "Hệ thống chưa có nhân viên tiếp nhận, vui lòng liên hệ trực tiếp" });

        const lastCustomer = await prisma.customer.findFirst({
          orderBy: { code: "desc" },
          select: { code: true },
        });
        const code = nextCustomerCode(lastCustomer?.code ?? null);

        const birthYear = toolInput.birthYear ? parseInt(toolInput.birthYear) : null;
        customer = await prisma.customer.create({
          data: {
            code,
            fullName,
            phone,
            phoneHash: hash,
            branchId,
            createdById: systemUser.id,
            source: "CHATBOT",
            status: "CONSULTING",
            dateOfBirth: (birthYear && !isNaN(birthYear)) ? new Date(`${birthYear}-01-01`) : null,
          },
        });
      }

      // Xử lý ngày giờ mong muốn
      let preferredDate: Date | null = null;
      let appointmentId: string | null = null;

      if (toolInput.preferredDateTime) {
        try {
          preferredDate = new Date(toolInput.preferredDateTime);
          if (!isNaN(preferredDate.getTime())) {
            // Tạo Appointment thực với trạng thái PENDING_CONFIRMATION
            const endTime = new Date(preferredDate.getTime() + 60 * 60 * 1000); // +1 giờ
            const appt = await prisma.appointment.create({
              data: {
                customerId: customer.id,
                branchId,
                type: "CONSULTATION",
                startTime: preferredDate,
                endTime,
                status: "PENDING_CONFIRMATION",
                note: [toolInput.serviceInterest, toolInput.note].filter(Boolean).join(" | ") || null,
                source: "CHATBOT",
              },
            });
            appointmentId = appt.id;
          }
        } catch {
          preferredDate = null;
        }
      }

      // Tạo PublicBookingRequest để staff theo dõi
      const booking = await prisma.publicBookingRequest.create({
        data: {
          branchId,
          fullName: customer.fullName,
          phone,
          serviceInterest: toolInput.serviceInterest,
          preferredDate,
          note: toolInput.note || null,
          status: "PENDING",
          ...(appointmentId ? { appointmentId } : {}),
        },
        select: {
          id: true,
          fullName: true,
          phone: true,
          serviceInterest: true,
          preferredDate: true,
          status: true,
          branch: { select: { name: true, phone: true, address: true } },
        },
      });

      return JSON.stringify({
        success: true,
        isNewCustomer: !customer,
        booking,
        appointmentCreated: !!appointmentId,
      });
    } catch (err) {
      console.error("[create_booking]", err);
      return JSON.stringify({ error: "Không thể tạo lịch hẹn, vui lòng thử lại sau" });
    }
  }

  return JSON.stringify({ error: "Unknown tool" });
}

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Chatbot chưa được cấu hình (ANTHROPIC_API_KEY)" },
      { status: 500 }
    );
  }

  const anthropicMessages: Anthropic.MessageParam[] = messages;
  let finalText = "";

  // Agentic loop tối đa 8 vòng
  for (let i = 0; i < 8; i++) {
    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-2",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages: anthropicMessages,
    });

    anthropicMessages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      finalText = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      break;
    }

    if (response.stop_reason === "tool_use") {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type === "tool_use") {
          const result = await handleToolCall(block.name, block.input as Record<string, string>);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }
      }

      anthropicMessages.push({ role: "user", content: toolResults });
      continue;
    }

    break;
  }

  return NextResponse.json({
    text: finalText,
    messages: anthropicMessages,
  });
}
