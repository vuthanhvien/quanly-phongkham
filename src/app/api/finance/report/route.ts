import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, parseISO } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to   = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json({ error: "Thiếu tham số from / to" }, { status: 400 });
  }

  const fromDate = startOfDay(parseISO(from));
  const toDate   = endOfDay(parseISO(to));

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  const branchFilter = isSuperAdmin ? {} : { branchId: session.user.branchId! };

  const [
    paymentAgg,
    expenseAgg,
    paymentsByMethod,
    expensesByCategory,
    invoicesByStatus,
  ] = await Promise.all([
    // Tổng thu thực tế (theo payments)
    prisma.payment.aggregate({
      where: {
        paidAt:  { gte: fromDate, lte: toDate },
        invoice: { ...branchFilter },
      },
      _sum:   { amount: true },
      _count: true,
    }),

    // Tổng chi phí
    prisma.expense.aggregate({
      where: {
        paidAt: { gte: fromDate, lte: toDate },
        ...branchFilter,
      },
      _sum:   { amount: true },
      _count: true,
    }),

    // Doanh thu theo phương thức thanh toán
    prisma.payment.groupBy({
      by:    ["method"],
      where: {
        paidAt:  { gte: fromDate, lte: toDate },
        invoice: { ...branchFilter },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
    }),

    // Chi phí theo danh mục
    prisma.expense.groupBy({
      by:    ["category"],
      where: {
        paidAt: { gte: fromDate, lte: toDate },
        ...branchFilter,
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
    }),

    // Hóa đơn theo trạng thái (tạo trong kỳ)
    prisma.invoice.groupBy({
      by:    ["status"],
      where: {
        createdAt: { gte: fromDate, lte: toDate },
        ...branchFilter,
      },
      _sum:   { finalAmount: true },
      _count: true,
    }),
  ]);

  const totalRevenue  = Number(paymentAgg._sum.amount  ?? 0);
  const totalExpenses = Number(expenseAgg._sum.amount   ?? 0);

  return NextResponse.json({
    totalRevenue,
    totalExpenses,
    profit:       totalRevenue - totalExpenses,
    paymentCount: paymentAgg._count,
    expenseCount: expenseAgg._count,
    paymentsByMethod: paymentsByMethod.map((p) => ({
      method: p.method,
      amount: Number(p._sum.amount ?? 0),
    })),
    expensesByCategory: expensesByCategory.map((e) => ({
      category: e.category,
      amount:   Number(e._sum.amount ?? 0),
    })),
    invoicesByStatus: invoicesByStatus.map((i) => ({
      status: i.status,
      count:  i._count,
      amount: Number(i._sum.finalAmount ?? 0),
    })),
  });
}
