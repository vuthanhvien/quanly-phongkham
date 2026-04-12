import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["PAID"]),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowedRoles = ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body   = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
  }

  const commission = await prisma.commission.findUnique({ where: { id } });
  if (!commission) return NextResponse.json({ message: "Không tìm thấy hoa hồng" }, { status: 404 });

  if (commission.status === "PAID") {
    return NextResponse.json({ message: "Hoa hồng đã được thanh toán" }, { status: 400 });
  }

  const updated = await prisma.commission.update({
    where: { id },
    data:  { status: "PAID", paidAt: new Date() },
    include: {
      user:    { select: { id: true, fullName: true } },
      invoice: { select: { id: true, code: true, finalAmount: true, createdAt: true } },
    },
  });

  return NextResponse.json(updated);
}
