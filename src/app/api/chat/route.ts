import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

Quy trình:
1. Hỏi tên và số điện thoại khách
2. Hỏi dịch vụ quan tâm
3. Hỏi ngày giờ mong muốn (tùy chọn)
4. Hỏi ghi chú đặc biệt (tùy chọn)
5. Gọi tool create_booking để đặt lịch
6. Xác nhận thông tin cho khách

Khi khách cung cấp đủ thông tin (tên + SĐT + dịch vụ), hãy dùng tool create_booking ngay.`;

const tools: Anthropic.Tool[] = [
  {
    name: "get_branches",
    description: "Lấy danh sách chi nhánh phòng khám",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "create_booking",
    description: "Tạo yêu cầu đặt lịch cho khách hàng. Gọi khi đã có đủ: họ tên, số điện thoại, dịch vụ quan tâm.",
    input_schema: {
      type: "object" as const,
      properties: {
        fullName: {
          type: "string",
          description: "Họ và tên đầy đủ của khách hàng",
        },
        phone: {
          type: "string",
          description: "Số điện thoại liên hệ",
        },
        serviceInterest: {
          type: "string",
          description: "Dịch vụ khách quan tâm (VD: Nâng mũi, Tiêm filler, Tư vấn thẩm mỹ...)",
        },
        preferredDate: {
          type: "string",
          description: "Ngày mong muốn theo định dạng YYYY-MM-DD (tùy chọn)",
        },
        note: {
          type: "string",
          description: "Ghi chú thêm của khách (tùy chọn)",
        },
        branchId: {
          type: "string",
          description: "ID chi nhánh (tùy chọn, mặc định chi nhánh chính)",
        },
      },
      required: ["fullName", "phone", "serviceInterest"],
    },
  },
];

async function handleToolCall (toolName: string, toolInput: Record<string, string>): Promise<string> {
  if (toolName === "get_branches") {
    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      select: { id: true, name: true, address: true, phone: true },
    });
    return JSON.stringify(branches);
  }

  if (toolName === "create_booking") {
    try {
      let branchId = toolInput.branchId;
      if (!branchId) {
        const branch = await prisma.branch.findFirst({ where: { isActive: true } });
        branchId = branch?.id || '';
      }
      if (!branchId) return JSON.stringify({ error: "Không tìm thấy chi nhánh" });

      const booking = await prisma.publicBookingRequest.create({
        data: {
          branchId,
          fullName: toolInput.fullName,
          phone: toolInput.phone,
          serviceInterest: toolInput.serviceInterest,
          preferredDate: toolInput.preferredDate ? new Date(toolInput.preferredDate) : null,
          note: toolInput.note,
          status: "PENDING",
        },
        select: {
          id: true,
          fullName: true,
          serviceInterest: true,
          preferredDate: true,
          branch: { select: { name: true, phone: true } },
        },
      });
      return JSON.stringify({ success: true, booking });
    } catch {
      return JSON.stringify({ error: "Không thể tạo lịch hẹn, vui lòng thử lại" });
    }
  }

  return JSON.stringify({ error: "Unknown tool" });
}

export async function POST (req: NextRequest) {
  const { messages } = await req.json();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY chưa được cấu hình" }, { status: 500 });
  }

  // Agentic loop với tool use
  const anthropicMessages: Anthropic.MessageParam[] = messages;
  let finalText = "";

  // Tối đa 5 vòng để tránh infinite loop
  for (let i = 0; i < 5; i++) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages: anthropicMessages,
    });

    // Thêm response vào history
    anthropicMessages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      // Lấy text cuối cùng
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
