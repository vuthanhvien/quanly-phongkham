import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcryptjs";

const createSchema = z.object({
  fullName:      z.string().min(1),
  email:         z.string().email(),
  password:      z.string().min(6),
  roleId:        z.string().min(1),
  branchId:      z.string().optional(),
  phone:         z.string().optional(),
  specialty:     z.string().optional(),
  licenseNumber: z.string().optional(),
  experience:    z.coerce.number().int().min(0).optional(),
  bio:           z.string().optional(),
  position:      z.string().optional(),
  department:    z.string().optional(),
  workDays:      z.array(z.string()).optional(),
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
    return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
  }

  const {
    fullName, email, password, roleId, branchId, phone,
    specialty, licenseNumber, experience, bio, position, department, workDays,
  } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ message: "Email đã được sử dụng" }, { status: 400 });
  }

  const effectiveBranchId =
    session.user.role === "SUPER_ADMIN"
      ? branchId === "none" ? null : branchId ?? null
      : session.user.branchId;

  const passwordHash = await bcrypt.hash(password, 12);

  const hasProfile = specialty || licenseNumber || experience !== undefined ||
    bio || position || department || (workDays && workDays.length > 0);

  const user = await prisma.user.create({
    data: {
      fullName, email, passwordHash, phone, roleId,
      branchId: effectiveBranchId,
      ...(hasProfile ? {
        profile: {
          create: {
            specialty:     specialty     || null,
            licenseNumber: licenseNumber || null,
            experience:    experience    ?? null,
            bio:           bio           || null,
            position:      position      || null,
            department:    department    || null,
            workDays:      workDays != null ? (workDays as Prisma.InputJsonValue) : Prisma.JsonNull,
          },
        },
      } : {}),
    },
    include: { role: true, branch: true, profile: true },
  });

  return NextResponse.json(
    { id: user.id, fullName: user.fullName, email: user.email },
    { status: 201 }
  );
}
