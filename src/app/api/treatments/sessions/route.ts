import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const assignSchema = z.object({
  planId:     z.string().min(1, "Vui lòng chọn kế hoạch điều trị"),
  episodeId:  z.string().min(1, "Vui lòng chọn hồ sơ bệnh án"),
  startDate:  z.string().min(1, "Vui lòng chọn ngày bắt đầu"),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search    = searchParams.get("search")   ?? "";
  const statusF   = searchParams.get("status")   ?? "";
  const episodeId = searchParams.get("episodeId") ?? "";
  const page      = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize  = 20;

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {
    ...(statusF   ? { status:    statusF }   : {}),
    ...(episodeId ? { episodeId }             : {}),
  };

  // Branch isolation via episode → branch
  if (!isSuperAdmin) {
    where.episode = { branchId: session.user.branchId! };
  }

  if (search) {
    where.OR = [
      { plan:    { name:     { contains: search, mode: "insensitive" } } },
      { episode: { customer: { fullName: { contains: search, mode: "insensitive" } } } },
    ];
  }

  const [total, sessions] = await Promise.all([
    prisma.treatmentSession.count({ where }),
    prisma.treatmentSession.findMany({
      where,
      orderBy: { scheduledDate: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        plan:    { select: { id: true, name: true, totalSessions: true } },
        episode: {
          select: {
            id: true,
            customer: { select: { id: true, code: true, fullName: true } },
            branch:   { select: { name: true } },
          },
        },
      },
    }),
  ]);

  return NextResponse.json({ data: sessions, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowedRoles = ["SUPER_ADMIN", "ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body   = await req.json();
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
  }

  const { planId, episodeId, startDate } = parsed.data;

  const plan = await prisma.treatmentPlan.findUnique({
    where: { id: planId },
    select: { totalSessions: true, sessionInterval: true },
  });
  if (!plan) return NextResponse.json({ message: "Không tìm thấy kế hoạch điều trị" }, { status: 404 });

  const episode = await prisma.medicalEpisode.findUnique({
    where: { id: episodeId },
    select: { branchId: true },
  });
  if (!episode) return NextResponse.json({ message: "Không tìm thấy hồ sơ bệnh án" }, { status: 404 });

  if (!session.user.role.includes("SUPER_ADMIN") && episode.branchId !== session.user.branchId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const base = new Date(startDate);
  const sessionsData = Array.from({ length: plan.totalSessions }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i * plan.sessionInterval);
    return {
      planId,
      episodeId,
      sessionNumber: i + 1,
      scheduledDate: d,
    };
  });

  await prisma.treatmentSession.createMany({ data: sessionsData });

  return NextResponse.json({ created: sessionsData.length }, { status: 201 });
}
