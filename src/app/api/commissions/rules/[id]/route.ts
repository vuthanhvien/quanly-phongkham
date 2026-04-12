import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  roleType:    z.string().min(1).optional(),
  userId:      z.string().optional().nullable(),
  serviceCode: z.string().optional().nullable(),
  type:        z.enum(["PERCENT", "FIXED"]).optional(),
  value:       z.number().positive().optional(),
  isActive:    z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowedRoles = ["SUPER_ADMIN", "ADMIN"];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body   = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
  }

  const existing = await prisma.commissionRule.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ message: "Không tìm thấy quy tắc" }, { status: 404 });

  const d    = parsed.data;
  const rule = await prisma.commissionRule.update({
    where: { id },
    data:  {
      ...(d.roleType    !== undefined ? { roleType: d.roleType }       : {}),
      ...(d.userId      !== undefined ? { userId: d.userId }           : {}),
      ...(d.serviceCode !== undefined ? { serviceCode: d.serviceCode } : {}),
      ...(d.type        !== undefined ? { type: d.type }               : {}),
      ...(d.value       !== undefined ? { value: d.value }             : {}),
      ...(d.isActive    !== undefined ? { isActive: d.isActive }       : {}),
    },
  });

  return NextResponse.json(rule);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowedRoles = ["SUPER_ADMIN", "ADMIN"];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.commissionRule.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
