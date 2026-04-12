import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  customerId: z.string().min(1, "Vui lòng chọn khách hàng"),
  type:       z.enum(["CONSULTATION", "SURGERY", "FOLLOWUP", "TREATMENT"]),
  startTime:  z.string().min(1, "Vui lòng chọn giờ bắt đầu"),
  endTime:    z.string().min(1, "Vui lòng chọn giờ kết thúc"),
  note:       z.string().optional(),
  branchId:   z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date     = searchParams.get("date");      // YYYY-MM-DD (single day)
  const dateFrom = searchParams.get("dateFrom"); // YYYY-MM-DD (range start)
  const dateTo   = searchParams.get("dateTo");   // YYYY-MM-DD (range end)
  const status   = searchParams.get("status") ?? "";
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") ?? "30"), 500);

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {
    ...(isSuperAdmin ? {} : { branchId: session.user.branchId! }),
    ...(status ? { status } : {}),
    ...(date ? {
      startTime: { gte: new Date(`${date}T00:00:00`), lte: new Date(`${date}T23:59:59`) },
    } : dateFrom && dateTo ? {
      startTime: { gte: new Date(`${dateFrom}T00:00:00`), lte: new Date(`${dateTo}T23:59:59`) },
    } : {}),
  };

  const [total, appointments] = await Promise.all([
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({
      where,
      orderBy: { startTime: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        customer: { select: { id: true, code: true, fullName: true, hasAllergy: true, hasChronicDisease: true } },
        branch:   { select: { id: true, name: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    }),
  ]);

  return NextResponse.json({ data: appointments, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body   = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
  }

  const d        = parsed.data;
  const branchId = session.user.branchId ?? d.branchId;
  if (!branchId) return NextResponse.json({ message: "Không xác định được chi nhánh" }, { status: 400 });

  const start = new Date(d.startTime);
  const end   = new Date(d.endTime);
  if (end <= start) {
    return NextResponse.json({ message: "Giờ kết thúc phải sau giờ bắt đầu" }, { status: 400 });
  }

  const appointment = await prisma.appointment.create({
    data: {
      customerId:  d.customerId,
      branchId,
      type:        d.type,
      startTime:   start,
      endTime:     end,
      note:        d.note,
      createdById: session.user.id,
    },
    include: {
      customer: { select: { id: true, code: true, fullName: true } },
    },
  });

  return NextResponse.json(appointment, { status: 201 });
}
