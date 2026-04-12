import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createHash } from "crypto";

function phoneHash(phone: string) {
  return createHash("sha256").update(phone.trim()).digest("hex");
}

function nextCustomerCode(last: string | null): string {
  if (!last) return "KH00001";
  const num = parseInt(last.replace("KH", "")) + 1;
  return "KH" + String(num).padStart(5, "0");
}

const bookingSchema = z.object({
  fullName:         z.string().min(2, "Họ tên tối thiểu 2 ký tự"),
  phone:            z.string().min(9, "Số điện thoại không hợp lệ"),
  serviceInterest:  z.string().min(1, "Vui lòng chọn dịch vụ"),
  preferredDateTime: z.string().optional(),
  note:             z.string().optional(),
  branchId:         z.string().optional(),
});

// GET /api/public/booking — lấy danh sách chi nhánh & dịch vụ
export async function GET() {
  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    select: { id: true, name: true, address: true, phone: true },
  });
  return NextResponse.json({ branches });
}

// POST /api/public/booking — tạo khách hàng (nếu mới) + lịch hẹn
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const data = parsed.data;

  // Lấy chi nhánh
  let branchId = data.branchId;
  if (!branchId) {
    const branch = await prisma.branch.findFirst({ where: { isActive: true } });
    if (!branch) return NextResponse.json({ error: "Không tìm thấy chi nhánh khả dụng" }, { status: 400 });
    branchId = branch.id;
  }

  // Tìm hoặc tạo khách hàng theo SĐT
  const hash = phoneHash(data.phone);
  let customer = await prisma.customer.findFirst({ where: { phoneHash: hash } });
  let isNewCustomer = false;

  if (!customer) {
    const systemUser = await prisma.user.findFirst({
      where: { isActive: true, role: { name: { in: ["RECEPTIONIST", "ADMIN", "SUPER_ADMIN"] } } },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    if (!systemUser) {
      return NextResponse.json(
        { error: "Hệ thống chưa có nhân viên tiếp nhận, vui lòng gọi trực tiếp" },
        { status: 503 }
      );
    }

    const lastCustomer = await prisma.customer.findFirst({
      orderBy: { code: "desc" },
      select: { code: true },
    });
    const code = nextCustomerCode(lastCustomer?.code ?? null);

    customer = await prisma.customer.create({
      data: {
        code,
        fullName: data.fullName,
        phone: data.phone,
        phoneHash: hash,
        branchId,
        createdById: systemUser.id,
        source: "CHATBOT",
        status: "CONSULTING",
      },
    });
    isNewCustomer = true;
  }

  // Tạo Appointment nếu có ngày giờ
  let appointmentId: string | null = null;
  let preferredDate: Date | null = null;

  if (data.preferredDateTime) {
    try {
      const dt = new Date(data.preferredDateTime);
      if (!isNaN(dt.getTime())) {
        preferredDate = dt;
        const endTime = new Date(dt.getTime() + 60 * 60 * 1000); // +1 giờ
        const appt = await prisma.appointment.create({
          data: {
            customerId: customer.id,
            branchId,
            type: "CONSULTATION",
            startTime: dt,
            endTime,
            status: "PENDING_CONFIRMATION",
            note: [data.serviceInterest, data.note].filter(Boolean).join(" | ") || null,
            source: "CHATBOT",
          },
        });
        appointmentId = appt.id;
      }
    } catch {
      // ngày không hợp lệ — bỏ qua
    }
  }

  // Tạo PublicBookingRequest để staff theo dõi
  const booking = await prisma.publicBookingRequest.create({
    data: {
      branchId,
      fullName: customer.fullName,
      phone: data.phone,
      serviceInterest: data.serviceInterest,
      preferredDate,
      note: data.note || null,
      status: "PENDING",
      ...(appointmentId ? { appointmentId } : {}),
    },
    select: {
      id: true,
      fullName: true,
      phone: true,
      serviceInterest: true,
      preferredDate: true,
      note: true,
      status: true,
      submittedAt: true,
      branch: { select: { name: true, phone: true, address: true } },
    },
  });

  return NextResponse.json(
    {
      success: true,
      isNewCustomer,
      customerId: customer.id,
      appointmentCreated: !!appointmentId,
      booking,
    },
    { status: 201 }
  );
}

