import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  customerId:    z.string().min(1, "Vui lòng chọn khách hàng"),
  doctorId:      z.string().min(1, "Vui lòng chọn bác sĩ"),
  visitDate:     z.string().optional(),
  status:        z.enum(["WAITING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  // Sinh hiệu
  pulse:       z.number().int().positive().optional().nullable(),
  systolicBP:  z.number().int().positive().optional().nullable(),
  diastolicBP: z.number().int().positive().optional().nullable(),
  spO2:        z.number().positive().optional().nullable(),
  temperature: z.number().positive().optional().nullable(),
  weight:      z.number().positive().optional().nullable(),
  // Thông tin khám
  chiefComplaint: z.string().optional(),
  diagnosis:      z.string().optional(),
  prescription:   z.string().optional(),
  note:           z.string().optional(),
  // Liên kết hồ sơ
  episodeId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId");
  const status     = searchParams.get("status") ?? "";
  const search     = searchParams.get("search") ?? "";
  const date       = searchParams.get("date") ?? "";
  const page       = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize   = 20;

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {
    ...(isSuperAdmin ? {} : { branchId: session.user.branchId! }),
    ...(customerId ? { customerId } : {}),
    ...(status     ? { status }     : {}),
  };

  if (search) {
    where.customer = {
      OR: [
        { fullName: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ],
    };
  }

  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    where.visitDate = { gte: start, lte: end };
  }

  const [total, visits] = await Promise.all([
    prisma.visitRecord.count({ where }),
    prisma.visitRecord.findMany({
      where,
      orderBy: { visitDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        customer: { select: { id: true, code: true, fullName: true, phone: true } },
        doctor:   { select: { id: true, fullName: true } },
        branch:   { select: { id: true, name: true } },
        episode:  { select: { id: true, serviceType: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    }),
  ]);

  return NextResponse.json({ data: visits, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowedRoles = ["SUPER_ADMIN", "ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body   = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
  }

  const d        = parsed.data;
  const branchId = session.user.branchId ?? body.branchId;
  if (!branchId) return NextResponse.json({ message: "Không xác định được chi nhánh" }, { status: 400 });

  const customer = await prisma.customer.findUnique({ where: { id: d.customerId }, select: { branchId: true } });
  if (!customer) return NextResponse.json({ message: "Khách hàng không tồn tại" }, { status: 404 });
  if (!isSuperAdmin(session.user.role) && customer.branchId !== branchId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const visit = await prisma.visitRecord.create({
    data: {
      customerId:    d.customerId,
      branchId,
      doctorId:      d.doctorId,
      visitDate:     d.visitDate ? new Date(d.visitDate) : new Date(),
      status:        d.status ?? "WAITING",
      pulse:         d.pulse ?? null,
      systolicBP:    d.systolicBP ?? null,
      diastolicBP:   d.diastolicBP ?? null,
      spO2:          d.spO2 ?? null,
      temperature:   d.temperature ?? null,
      weight:        d.weight ?? null,
      chiefComplaint: d.chiefComplaint,
      diagnosis:     d.diagnosis,
      prescription:  d.prescription,
      note:          d.note,
      episodeId:     d.episodeId ?? null,
      createdById:   session.user.id,
    },
    include: {
      customer: { select: { id: true, code: true, fullName: true } },
      doctor:   { select: { id: true, fullName: true } },
    },
  });

  return NextResponse.json(visit, { status: 201 });
}

function isSuperAdmin(role: string) {
  return role === "SUPER_ADMIN";
}
