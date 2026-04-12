import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  status:     z.enum(["SCHEDULED", "COMPLETED", "LATE", "SKIPPED", "RESCHEDULED"]).optional(),
  actualDate: z.string().optional(),
  note:       z.string().optional(),
  scheduledDate: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowedRoles = ["SUPER_ADMIN", "ADMIN", "DOCTOR", "NURSE"];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body   = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
  }

  const { status, actualDate, note, scheduledDate } = parsed.data;

  const updated = await prisma.treatmentSession.update({
    where: { id: params.id },
    data: {
      ...(status        ? { status }                         : {}),
      ...(actualDate    ? { actualDate: new Date(actualDate) } : {}),
      ...(scheduledDate ? { scheduledDate: new Date(scheduledDate) } : {}),
      ...(note !== undefined ? { note } : {}),
    },
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
  });

  return NextResponse.json(updated);
}
