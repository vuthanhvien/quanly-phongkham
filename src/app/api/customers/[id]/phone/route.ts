import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    select: { id: true, phone: true, branchId: true },
  });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role !== "SUPER_ADMIN" && customer.branchId !== session.user.branchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";

  // Log phone view
  await prisma.phoneViewLog.create({
    data: {
      customerId: customer.id,
      viewedById: session.user.id,
      ipAddress:  ip,
    },
  });

  return NextResponse.json({ phone: customer.phone });
}
