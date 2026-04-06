import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

const createSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  roleId: z.string().min(1),
  branchId: z.string().optional(),
  phone: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowedRoles = ["SUPER_ADMIN", "ADMIN"];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.errors[0].message }, { status: 400 });
  }

  const { fullName, email, password, roleId, branchId, phone } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ message: "Email đã được sử dụng" }, { status: 400 });
  }

  // ADMIN chỉ tạo user trong branch của mình
  const effectiveBranchId =
    session.user.role === "SUPER_ADMIN"
      ? branchId === "none" ? null : branchId ?? null
      : session.user.branchId;

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      fullName,
      email,
      passwordHash,
      phone,
      roleId,
      branchId: effectiveBranchId,
    },
    include: { role: true, branch: true },
  });

  return NextResponse.json(
    { id: user.id, fullName: user.fullName, email: user.email },
    { status: 201 }
  );
}
