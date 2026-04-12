import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name:            z.string().min(1, "Tên kế hoạch không được để trống"),
  totalSessions:   z.number().int().min(1, "Phải có ít nhất 1 buổi"),
  sessionInterval: z.number().int().min(1, "Khoảng cách phải ít nhất 1 ngày"),
  description:     z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search   = searchParams.get("search") ?? "";
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = 20;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }

  const [total, plans] = await Promise.all([
    prisma.treatmentPlan.count({ where }),
    prisma.treatmentPlan.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        createdBy: { select: { fullName: true } },
        _count:    { select: { sessions: true } },
      },
    }),
  ]);

  return NextResponse.json({ data: plans, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowedRoles = ["SUPER_ADMIN", "ADMIN", "DOCTOR"];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body   = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
  }

  const plan = await prisma.treatmentPlan.create({
    data: {
      name:            parsed.data.name,
      totalSessions:   parsed.data.totalSessions,
      sessionInterval: parsed.data.sessionInterval,
      description:     parsed.data.description,
      createdById:     session.user.id,
    },
    include: {
      createdBy: { select: { fullName: true } },
      _count:    { select: { sessions: true } },
    },
  });

  return NextResponse.json(plan, { status: 201 });
}
