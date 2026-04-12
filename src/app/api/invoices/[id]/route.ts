import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const paymentSchema = z.object({
  amount:    z.number().positive("Số tiền phải lớn hơn 0"),
  method:    z.enum(["CASH", "BANK_TRANSFER", "CREDIT_CARD", "DEBIT_CARD", "MOMO", "VNPAY"]),
  reference: z.string().optional(),
  note:      z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      customer:  { select: { id: true, code: true, fullName: true } },
      createdBy: { select: { fullName: true } },
      branch:    { select: { name: true } },
      items:     true,
      payments:  {
        orderBy: { paidAt: "desc" },
        include: { receivedBy: { select: { fullName: true } } },
      },
    },
  });

  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(invoice);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowedRoles = ["SUPER_ADMIN", "ADMIN", "RECEPTIONIST", "ACCOUNTANT"];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body   = await req.json();
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: { payments: { select: { amount: true } } },
  });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const paid = invoice.payments.reduce((s, p) => s + Number(p.amount), 0);
  const remaining = Number(invoice.finalAmount) - paid;

  if (parsed.data.amount > remaining + 0.01) {
    return NextResponse.json(
      { message: `Số tiền thanh toán (${parsed.data.amount.toLocaleString()}) vượt quá số còn lại (${remaining.toLocaleString()})` },
      { status: 400 }
    );
  }

  const payment = await prisma.payment.create({
    data: {
      invoiceId:    params.id,
      amount:       parsed.data.amount,
      method:       parsed.data.method,
      reference:    parsed.data.reference || null,
      note:         parsed.data.note || null,
      receivedById: session.user.id,
    },
  });

  // Update invoice status
  const newPaid = paid + parsed.data.amount;
  let newStatus: "UNPAID" | "PARTIAL" | "PAID" = "UNPAID";
  if (newPaid >= Number(invoice.finalAmount) - 0.01) newStatus = "PAID";
  else if (newPaid > 0) newStatus = "PARTIAL";

  await prisma.invoice.update({
    where: { id: params.id },
    data:  { status: newStatus },
  });

  return NextResponse.json(payment, { status: 201 });
}
