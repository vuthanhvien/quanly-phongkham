import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bookingSchema = z.object({
  fullName: z.string().min(2, "Họ tên tối thiểu 2 ký tự"),
  phone: z.string().min(9, "Số điện thoại không hợp lệ"),
  serviceInterest: z.string().min(1, "Vui lòng chọn dịch vụ"),
  preferredDate: z.string().optional(),
  note: z.string().optional(),
  branchId: z.string().optional(),
});

// GET /api/public/booking — lấy thông tin chi nhánh & dịch vụ
export async function GET() {
  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    select: { id: true, name: true, address: true, phone: true },
  });

  return NextResponse.json({ branches });
}

// POST /api/public/booking — tạo yêu cầu đặt lịch
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Lấy chi nhánh đầu tiên nếu không chỉ định
  let branchId = data.branchId;
  if (!branchId) {
    const branch = await prisma.branch.findFirst({ where: { isActive: true } });
    if (!branch) {
      return NextResponse.json({ error: "Không tìm thấy chi nhánh" }, { status: 400 });
    }
    branchId = branch.id;
  }

  const booking = await prisma.publicBookingRequest.create({
    data: {
      branchId,
      fullName: data.fullName,
      phone: data.phone,
      serviceInterest: data.serviceInterest,
      preferredDate: data.preferredDate ? new Date(data.preferredDate) : null,
      note: data.note,
      status: "PENDING",
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

  return NextResponse.json({ success: true, booking }, { status: 201 });
}
