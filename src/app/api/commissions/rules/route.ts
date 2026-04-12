import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  roleType:    z.string().min(1, "Loại vai trò không được để trống"),
  userId:      z.string().optional(),
  serviceCode: z.string().optional(),
  type:        z.enum(["PERCENT", "FIXED"] as const, "Loại hoa hồng không hợp lệ"),
  value:       z.number().positive("Giá trị phải lớn hơn 0"),
  isActive:    z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const roleType    = searchParams.get("roleType") ?? "";
  const onlyActive  = searchParams.get("active") === "true";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  if (roleType)   where.roleType = roleType;
  if (onlyActive) where.isActive = true;

  const rules = await prisma.commissionRule.findMany({
    where,
    orderBy: [{ roleType: "asc" }, { serviceCode: "asc" }],
  });

  // Attach user names for rules with userId
  const userIds = Array.from(new Set(rules.map(r => r.userId).filter(Boolean))) as string[];
  const users   = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true } })
    : [];
  const userMap = Object.fromEntries(users.map(u => [u.id, u.fullName]));

  return NextResponse.json(rules.map(r => ({ ...r, userName: r.userId ? userMap[r.userId] ?? null : null })));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowedRoles = ["SUPER_ADMIN", "ADMIN"];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body   = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
  }

  const d    = parsed.data;
  const rule = await prisma.commissionRule.create({
    data: {
      roleType:    d.roleType,
      userId:      d.userId || null,
      serviceCode: d.serviceCode || null,
      type:        d.type,
      value:       d.value,
      isActive:    d.isActive,
    },
  });

  return NextResponse.json(rule, { status: 201 });
}
