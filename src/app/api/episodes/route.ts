import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  customerId:    z.string().min(1),
  serviceType:   z.string().min(1, "Loại dịch vụ không được để trống"),
  serviceCode:   z.string().optional(),
  doctorId:      z.string().min(1, "Vui lòng chọn bác sĩ"),
  chiefComplaint: z.string().optional(),
  diagnosis:     z.string().optional(),
  operationDate: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId");
  const status     = searchParams.get("status") ?? "";
  const page       = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize   = 20;

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {
    ...(isSuperAdmin ? {} : { branchId: session.user.branchId! }),
    ...(customerId ? { customerId } : {}),
    ...(status     ? { status }     : {}),
  };

  const [total, episodes] = await Promise.all([
    prisma.medicalEpisode.count({ where }),
    prisma.medicalEpisode.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        customer: { select: { id: true, code: true, fullName: true } },
        doctor:   { select: { id: true, fullName: true } },
        branch:   { select: { id: true, name: true } },
        _count:   { select: { vitalSigns: true, postOpNotes: true, documents: true } },
      },
    }),
  ]);

  return NextResponse.json({ data: episodes, total, page, pageSize });
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

  // Verify customer belongs to branch
  const customer = await prisma.customer.findUnique({ where: { id: d.customerId }, select: { branchId: true } });
  if (!customer) return NextResponse.json({ message: "Khách hàng không tồn tại" }, { status: 404 });
  if (!session.user.role.includes("SUPER_ADMIN") && customer.branchId !== branchId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const episode = await prisma.medicalEpisode.create({
    data: {
      customerId:    d.customerId,
      branchId,
      serviceType:   d.serviceType,
      serviceCode:   d.serviceCode,
      doctorId:      d.doctorId,
      chiefComplaint: d.chiefComplaint,
      diagnosis:     d.diagnosis,
      operationDate: d.operationDate ? new Date(d.operationDate) : null,
    },
    include: {
      customer: { select: { id: true, code: true, fullName: true } },
      doctor:   { select: { id: true, fullName: true } },
    },
  });

  return NextResponse.json(episode, { status: 201 });
}
