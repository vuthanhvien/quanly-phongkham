import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const itemSchema = z.object({
  description: z.string().min(1),
  quantity:    z.number().positive(),
  unitPrice:   z.number().min(0),
  type:        z.string().default("SERVICE"),
});

const createSchema = z.object({
  customerId: z.string().min(1, "Vui lòng chọn khách hàng"),
  episodeId:  z.string().optional(),
  items:      z.array(itemSchema).min(1, "Phải có ít nhất 1 mục"),
  discount:   z.number().min(0).default(0),
  note:       z.string().optional(),
  dueDate:    z.string().optional(),
});

async function nextInvoiceCode(): Promise<string> {
  const last = await prisma.invoice.findFirst({
    orderBy: { code: "desc" },
    select: { code: true },
  });
  if (!last) return "HD00001";
  const num = parseInt(last.code.replace("HD", "")) + 1;
  return "HD" + String(num).padStart(5, "0");
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search   = searchParams.get("search")  ?? "";
  const statusF  = searchParams.get("status")  ?? "";
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = 20;

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {
    ...(isSuperAdmin ? {} : { branchId: session.user.branchId! }),
    ...(statusF ? { status: statusF } : {}),
  };
  if (search) {
    where.OR = [
      { code:     { contains: search, mode: "insensitive" } },
      { customer: { fullName: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [total, invoices] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        customer:  { select: { id: true, code: true, fullName: true } },
        createdBy: { select: { fullName: true } },
        branch:    { select: { name: true } },
        _count:    { select: { payments: true } },
      },
    }),
  ]);

  return NextResponse.json({ data: invoices, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowedRoles = ["SUPER_ADMIN", "ADMIN", "RECEPTIONIST", "ACCOUNTANT"];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body   = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
  }

  const d        = parsed.data;
  const branchId = session.user.branchId ?? body.branchId;
  if (!branchId) return NextResponse.json({ message: "Không xác định được chi nhánh" }, { status: 400 });

  const totalAmount = d.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const finalAmount = Math.max(0, totalAmount - d.discount);
  const code        = await nextInvoiceCode();

  const invoice = await prisma.invoice.create({
    data: {
      code,
      customerId:  d.customerId,
      branchId,
      episodeId:   d.episodeId || null,
      totalAmount,
      discount:    d.discount,
      finalAmount,
      note:        d.note || null,
      dueDate:     d.dueDate ? new Date(d.dueDate) : null,
      createdById: session.user.id,
      items: {
        create: d.items.map(i => ({
          description: i.description,
          quantity:    i.quantity,
          unitPrice:   i.unitPrice,
          amount:      i.quantity * i.unitPrice,
          type:        i.type,
        })),
      },
    },
    include: {
      customer:  { select: { id: true, code: true, fullName: true } },
      createdBy: { select: { fullName: true } },
      branch:    { select: { name: true } },
      items:     true,
    },
  });

  return NextResponse.json(invoice, { status: 201 });
}
