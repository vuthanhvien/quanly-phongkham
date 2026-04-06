import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: {
      branch: { select: { id: true, name: true } },
      createdBy: { select: { id: true, fullName: true } },
      assignedSale: { select: { id: true, fullName: true } },
      notes: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { createdBy: { select: { id: true, fullName: true } } },
      },
      episodes: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, chiefComplaint: true, status: true, createdAt: true },
      },
      appointments: {
        orderBy: { startTime: "desc" },
        take: 5,
        select: { id: true, startTime: true, status: true, note: true },
      },
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, totalAmount: true, status: true, createdAt: true },
      },
    },
  });

  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Branch isolation
  if (session.user.role !== "SUPER_ADMIN" && customer.branchId !== session.user.branchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    ...customer,
    phone: maskPhone(customer.phone),
    totalSpent: Number(customer.totalSpent),
  });
}

function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 7) return phone;
  return `${cleaned.slice(0, 4)} *** ${cleaned.slice(-3)}`;
}

const updateSchema = z.object({
  fullName:           z.string().min(1).optional(),
  email:              z.email().optional().or(z.literal("")),
  dateOfBirth:        z.string().optional(),
  gender:             z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  idNumber:           z.string().optional(),
  address:            z.string().optional(),
  source:             z.string().optional(),
  status:             z.enum(["CONSULTING", "WAITING_SURGERY", "IN_TREATMENT", "COMPLETED", "INACTIVE"]).optional(),
  assignedSaleId:     z.string().optional(),
  hasAllergy:         z.boolean().optional(),
  allergyNote:        z.string().optional(),
  hasChronicDisease:  z.boolean().optional(),
  chronicDiseaseNote: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customer = await prisma.customer.findUnique({ where: { id: params.id } });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role !== "SUPER_ADMIN" && customer.branchId !== session.user.branchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
  }

  const d = parsed.data;
  const updated = await prisma.customer.update({
    where: { id: params.id },
    data: {
      ...(d.fullName           !== undefined ? { fullName: d.fullName }                    : {}),
      ...(d.email              !== undefined ? { email: d.email || null }                   : {}),
      ...(d.dateOfBirth        !== undefined ? { dateOfBirth: d.dateOfBirth ? new Date(d.dateOfBirth) : null } : {}),
      ...(d.gender             !== undefined ? { gender: d.gender }                         : {}),
      ...(d.idNumber           !== undefined ? { idNumber: d.idNumber || null }             : {}),
      ...(d.address            !== undefined ? { address: d.address || null }               : {}),
      ...(d.source             !== undefined ? { source: d.source || null }                 : {}),
      ...(d.status             !== undefined ? { status: d.status }                         : {}),
      ...(d.assignedSaleId     !== undefined ? { assignedSaleId: d.assignedSaleId || null } : {}),
      ...(d.hasAllergy         !== undefined ? { hasAllergy: d.hasAllergy }                 : {}),
      ...(d.allergyNote        !== undefined ? { allergyNote: d.allergyNote || null }       : {}),
      ...(d.hasChronicDisease  !== undefined ? { hasChronicDisease: d.hasChronicDisease }   : {}),
      ...(d.chronicDiseaseNote !== undefined ? { chronicDiseaseNote: d.chronicDiseaseNote || null } : {}),
    },
  });

  return NextResponse.json({ id: updated.id });
}
