import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  status:      z.enum(["SCHEDULED","CONFIRMED","WAITING","IN_PROGRESS","COMPLETED","NO_SHOW","CANCELLED","PENDING_CONFIRMATION"]).optional(),
  startTime:   z.string().optional(),
  endTime:     z.string().optional(),
  note:        z.string().optional(),
  noShowReason: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appt = await prisma.appointment.findUnique({ where: { id: params.id }, select: { branchId: true } });
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.user.role !== "SUPER_ADMIN" && appt.branchId !== session.user.branchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body   = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
  }

  const d = parsed.data;
  const updated = await prisma.appointment.update({
    where: { id: params.id },
    data: {
      ...(d.status       ? { status: d.status }              : {}),
      ...(d.startTime    ? { startTime: new Date(d.startTime) } : {}),
      ...(d.endTime      ? { endTime: new Date(d.endTime) }   : {}),
      ...(d.note         !== undefined ? { note: d.note || null }                 : {}),
      ...(d.noShowReason !== undefined ? { noShowReason: d.noShowReason || null } : {}),
    },
  });

  return NextResponse.json({ id: updated.id });
}
