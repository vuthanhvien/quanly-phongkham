import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  doctorId:      z.string().optional(),
  visitDate:     z.string().optional(),
  status:        z.enum(["WAITING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  pulse:       z.number().int().positive().optional().nullable(),
  systolicBP:  z.number().int().positive().optional().nullable(),
  diastolicBP: z.number().int().positive().optional().nullable(),
  spO2:        z.number().positive().optional().nullable(),
  temperature: z.number().positive().optional().nullable(),
  weight:      z.number().positive().optional().nullable(),
  chiefComplaint: z.string().optional(),
  diagnosis:      z.string().optional(),
  prescription:   z.string().optional(),
  note:           z.string().optional(),
  episodeId:      z.string().optional().nullable(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const visit = await prisma.visitRecord.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, code: true, fullName: true, phone: true, hasAllergy: true, allergyNote: true, hasChronicDisease: true, chronicDiseaseNote: true } },
      doctor:   { select: { id: true, fullName: true } },
      branch:   { select: { id: true, name: true } },
      episode:  { select: { id: true, serviceType: true } },
      createdBy: { select: { id: true, fullName: true } },
    },
  });

  if (!visit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  if (!isSuperAdmin && visit.branchId !== session.user.branchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(visit);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowedRoles = ["SUPER_ADMIN", "ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.visitRecord.findUnique({ where: { id }, select: { branchId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  if (!isSuperAdmin && existing.branchId !== session.user.branchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body   = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
  }

  const d = parsed.data;
  const visit = await prisma.visitRecord.update({
    where: { id },
    data: {
      ...(d.doctorId    !== undefined ? { doctorId: d.doctorId } : {}),
      ...(d.visitDate   !== undefined ? { visitDate: new Date(d.visitDate) } : {}),
      ...(d.status      !== undefined ? { status: d.status } : {}),
      ...(d.pulse       !== undefined ? { pulse: d.pulse } : {}),
      ...(d.systolicBP  !== undefined ? { systolicBP: d.systolicBP } : {}),
      ...(d.diastolicBP !== undefined ? { diastolicBP: d.diastolicBP } : {}),
      ...(d.spO2        !== undefined ? { spO2: d.spO2 } : {}),
      ...(d.temperature !== undefined ? { temperature: d.temperature } : {}),
      ...(d.weight      !== undefined ? { weight: d.weight } : {}),
      ...(d.chiefComplaint !== undefined ? { chiefComplaint: d.chiefComplaint } : {}),
      ...(d.diagnosis   !== undefined ? { diagnosis: d.diagnosis } : {}),
      ...(d.prescription !== undefined ? { prescription: d.prescription } : {}),
      ...(d.note        !== undefined ? { note: d.note } : {}),
      ...(d.episodeId   !== undefined ? { episodeId: d.episodeId } : {}),
    },
    include: {
      customer: { select: { id: true, code: true, fullName: true } },
      doctor:   { select: { id: true, fullName: true } },
    },
  });

  return NextResponse.json(visit);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowedRoles = ["SUPER_ADMIN", "ADMIN"];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.visitRecord.findUnique({ where: { id }, select: { branchId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  if (!isSuperAdmin && existing.branchId !== session.user.branchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.visitRecord.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
