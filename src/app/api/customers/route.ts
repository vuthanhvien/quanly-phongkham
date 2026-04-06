import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createHash } from "crypto";

function phoneHash(phone: string) {
  return createHash("sha256").update(phone.trim()).digest("hex");
}

function nextCode(last: string | null): string {
  if (!last) return "KH00001";
  const num = parseInt(last.replace("KH", "")) + 1;
  return "KH" + String(num).padStart(5, "0");
}

const createSchema = z.object({
  fullName:           z.string().min(1, "Họ tên không được để trống"),
  phone:              z.string().min(9, "Số điện thoại không hợp lệ"),
  email:              z.email("Email không hợp lệ").optional().or(z.literal("")),
  dateOfBirth:        z.string().optional(),
  gender:             z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  idNumber:           z.string().optional(),
  address:            z.string().optional(),
  source:             z.string().optional(),
  assignedSaleId:     z.string().optional(),
  hasAllergy:         z.boolean().optional(),
  allergyNote:        z.string().optional(),
  hasChronicDisease:  z.boolean().optional(),
  chronicDiseaseNote: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search   = searchParams.get("search") ?? "";
  const status   = searchParams.get("status") ?? "";
  const tier     = searchParams.get("tier") ?? "";
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = 20;

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  const branchFilter = isSuperAdmin ? {} : { branchId: session.user.branchId! };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {
    ...branchFilter,
    ...(status ? { status } : {}),
    ...(tier   ? { tier }   : {}),
    ...(search ? {
      OR: [
        { fullName: { contains: search, mode: "insensitive" } },
        { code:     { contains: search, mode: "insensitive" } },
        { email:    { contains: search, mode: "insensitive" } },
      ],
    } : {}),
  };

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, code: true, fullName: true, phone: true,
        gender: true, dateOfBirth: true, status: true, tier: true,
        totalSpent: true, hasAllergy: true, hasChronicDisease: true,
        allergyNote: true, chronicDiseaseNote: true,
        lastVisitAt: true, createdAt: true,
        branch: { select: { id: true, name: true } },
        assignedSale: { select: { id: true, fullName: true } },
      },
    }),
  ]);

  // Mask phone: keep first 4 + mask last 3 → "0901 *** 567"
  const masked = customers.map((c) => ({
    ...c,
    phone: maskPhone(c.phone),
    totalSpent: Number(c.totalSpent),
  }));

  return NextResponse.json({ data: masked, total, page, pageSize });
}

function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 7) return phone;
  const start = cleaned.slice(0, 4);
  const end   = cleaned.slice(-3);
  return `${start} *** ${end}`;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
  }

  const d = parsed.data;
  const branchId = session.user.branchId ?? body.branchId;
  if (!branchId) return NextResponse.json({ message: "Không xác định được chi nhánh" }, { status: 400 });

  // Check duplicate phone
  const hash = phoneHash(d.phone);
  const dup = await prisma.customer.findFirst({ where: { phoneHash: hash, branchId } });
  if (dup) return NextResponse.json({ message: `Số điện thoại đã tồn tại (${dup.code})` }, { status: 400 });

  // Generate code
  const last = await prisma.customer.findFirst({ orderBy: { code: "desc" }, select: { code: true } });
  const code = nextCode(last?.code ?? null);

  const customer = await prisma.customer.create({
    data: {
      code,
      fullName:           d.fullName,
      phone:              d.phone,
      phoneHash:          hash,
      email:              d.email || null,
      dateOfBirth:        d.dateOfBirth ? new Date(d.dateOfBirth) : null,
      gender:             d.gender ?? "OTHER",
      idNumber:           d.idNumber || null,
      address:            d.address || null,
      source:             d.source || null,
      hasAllergy:         d.hasAllergy ?? false,
      allergyNote:        d.allergyNote || null,
      hasChronicDisease:  d.hasChronicDisease ?? false,
      chronicDiseaseNote: d.chronicDiseaseNote || null,
      branchId,
      createdById:        session.user.id,
      assignedSaleId:     d.assignedSaleId || null,
    },
  });

  return NextResponse.json({ id: customer.id, code: customer.code }, { status: 201 });
}
