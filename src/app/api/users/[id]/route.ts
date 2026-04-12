import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcryptjs";

const updateSchema = z.object({
  fullName:      z.string().min(1).optional(),
  phone:         z.string().optional(),
  password:      z.string().min(6).optional(),
  isActive:      z.boolean().optional(),
  roleId:        z.string().optional(),
  branchId:      z.string().nullable().optional(),
  // Profile
  specialty:     z.string().nullable().optional(),
  licenseNumber: z.string().nullable().optional(),
  experience:    z.coerce.number().int().min(0).nullable().optional(),
  bio:           z.string().nullable().optional(),
  position:      z.string().nullable().optional(),
  department:    z.string().nullable().optional(),
  workDays:      z.array(z.string()).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const allowedRoles = ["SUPER_ADMIN", "ADMIN"];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const target = await prisma.user.findUnique({ where: { id }, include: { role: true } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role === "ADMIN" && target.branchId !== session.user.branchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
  }

  const {
    fullName, phone, password, isActive, roleId, branchId,
    specialty, licenseNumber, experience, bio, position, department, workDays,
  } = parsed.data;

  const userUpdate: Record<string, unknown> = {};
  if (fullName !== undefined) userUpdate.fullName = fullName;
  if (phone !== undefined)    userUpdate.phone    = phone;
  if (isActive !== undefined) userUpdate.isActive = isActive;
  if (roleId !== undefined)   userUpdate.roleId   = roleId;
  if (branchId !== undefined) userUpdate.branchId = branchId;
  if (password)               userUpdate.passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.update({
    where: { id },
    data: userUpdate,
    include: { role: true, branch: true },
  });

  const hasProfile = specialty !== undefined || licenseNumber !== undefined ||
    experience !== undefined || bio !== undefined || position !== undefined ||
    department !== undefined || workDays !== undefined;

  if (hasProfile) {
    const profileData = {
      specialty:     specialty     ?? null,
      licenseNumber: licenseNumber ?? null,
      experience:    experience    ?? null,
      bio:           bio           ?? null,
      position:      position      ?? null,
      department:    department    ?? null,
      workDays:      workDays != null ? (workDays as Prisma.InputJsonValue) : Prisma.JsonNull,
    };
    await prisma.userProfile.upsert({
      where:  { userId: id },
      create: { userId: id, ...profileData },
      update: profileData,
    });
  }

  return NextResponse.json({ id: user.id, fullName: user.fullName });
}
