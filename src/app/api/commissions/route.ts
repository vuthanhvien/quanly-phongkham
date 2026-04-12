import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status   = searchParams.get("status")   ?? "";
  const userId   = searchParams.get("userId")   ?? "";
  const invoiceId = searchParams.get("invoiceId") ?? "";
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = 20;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  if (status)    where.status    = status;
  if (userId)    where.userId    = userId;
  if (invoiceId) where.invoiceId = invoiceId;

  const [total, commissions] = await Promise.all([
    prisma.commission.count({ where }),
    prisma.commission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user:    { select: { id: true, fullName: true } },
        invoice: { select: { id: true, code: true, finalAmount: true, createdAt: true } },
      },
    }),
  ]);

  return NextResponse.json({ data: commissions, total, page, pageSize });
}
