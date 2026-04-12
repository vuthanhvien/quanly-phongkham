import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name:            z.string().min(1).optional(),
  totalSessions:   z.number().int().min(1).optional(),
  sessionInterval: z.number().int().min(1).optional(),
  description:     z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowedRoles = ["SUPER_ADMIN", "ADMIN", "DOCTOR"];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body   = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
  }

  const plan = await prisma.treatmentPlan.update({
    where: { id: params.id },
    data:  parsed.data,
    include: {
      createdBy: { select: { fullName: true } },
      _count:    { select: { sessions: true } },
    },
  });

  return NextResponse.json(plan);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowedRoles = ["SUPER_ADMIN", "ADMIN"];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check if plan has sessions
  const count = await prisma.treatmentSession.count({ where: { planId: params.id } });
  if (count > 0) {
    return NextResponse.json(
      { message: `Không thể xóa — kế hoạch đang có ${count} buổi điều trị` },
      { status: 409 }
    );
  }

  await prisma.treatmentPlan.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
