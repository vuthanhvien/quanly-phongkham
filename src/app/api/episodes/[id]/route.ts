import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const episode = await prisma.medicalEpisode.findUnique({
    where: { id: params.id },
    include: {
      customer:  { select: { id: true, code: true, fullName: true, phone: true, hasAllergy: true, allergyNote: true, hasChronicDisease: true, chronicDiseaseNote: true } },
      doctor:    { select: { id: true, fullName: true } },
      branch:    { select: { id: true, name: true } },
      vitalSigns: {
        orderBy: { recordedAt: "desc" },
        include: { recordedBy: { select: { id: true, fullName: true } } },
      },
      postOpNotes: {
        orderBy: { day: "asc" },
        include: { createdBy: { select: { id: true, fullName: true } } },
      },
      documents: { orderBy: { createdAt: "desc" } },
      photos:    { orderBy: { takenAt: "desc" }, select: { id: true, milestone: true, fileUrl: true, takenAt: true } },
    },
  });

  if (!episode) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.user.role !== "SUPER_ADMIN" && episode.branchId !== session.user.branchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(episode);
}

const updateSchema = z.object({
  serviceType:   z.string().min(1).optional(),
  serviceCode:   z.string().optional(),
  doctorId:      z.string().optional(),
  chiefComplaint: z.string().optional(),
  diagnosis:     z.string().optional(),
  operationDate: z.string().optional(),
  status:        z.enum(["ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
  completedAt:   z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const episode = await prisma.medicalEpisode.findUnique({ where: { id: params.id }, select: { branchId: true } });
  if (!episode) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.user.role !== "SUPER_ADMIN" && episode.branchId !== session.user.branchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body   = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
  }

  const d = parsed.data;
  const updated = await prisma.medicalEpisode.update({
    where: { id: params.id },
    data: {
      ...(d.serviceType    ? { serviceType: d.serviceType }       : {}),
      ...(d.serviceCode    !== undefined ? { serviceCode: d.serviceCode || null } : {}),
      ...(d.doctorId       ? { doctorId: d.doctorId }             : {}),
      ...(d.chiefComplaint !== undefined ? { chiefComplaint: d.chiefComplaint || null } : {}),
      ...(d.diagnosis      !== undefined ? { diagnosis: d.diagnosis || null }           : {}),
      ...(d.operationDate  !== undefined ? { operationDate: d.operationDate ? new Date(d.operationDate) : null } : {}),
      ...(d.status         ? { status: d.status }                  : {}),
      ...(d.completedAt    !== undefined ? { completedAt: d.completedAt ? new Date(d.completedAt) : null } : {}),
    },
  });

  return NextResponse.json({ id: updated.id });
}
