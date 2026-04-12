import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  category:    z.string().min(1, "Loại chi phí không được để trống"),
  description: z.string().min(1, "Mô tả không được để trống"),
  amount:      z.number().positive("Số tiền phải lớn hơn 0"),
  paidAt:      z.string().min(1, "Ngày chi không được để trống"),
  receiptUrl:  z.string().url().optional(),
  note:        z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search   = searchParams.get("search")   ?? "";
  const category = searchParams.get("category") ?? "";
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = 20;

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {
    ...(isSuperAdmin ? {} : { branchId: session.user.branchId! }),
    ...(category ? { category } : {}),
  };
  if (search) where.description = { contains: search, mode: "insensitive" };

  const [total, expenses] = await Promise.all([
    prisma.expense.count({ where }),
    prisma.expense.findMany({
      where,
      orderBy: { paidAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        paidBy: { select: { fullName: true } },
        branch: { select: { name: true } },
      },
    }),
  ]);

  return NextResponse.json({ data: expenses, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowedRoles = ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"];
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

  const expense = await prisma.expense.create({
    data: {
      branchId,
      category:    d.category,
      description: d.description,
      amount:      d.amount,
      paidAt:      new Date(d.paidAt),
      receiptUrl:  d.receiptUrl || null,
      paidById:    session.user.id,
    },
    include: {
      paidBy: { select: { fullName: true } },
      branch: { select: { name: true } },
    },
  });

  return NextResponse.json(expense, { status: 201 });
}
