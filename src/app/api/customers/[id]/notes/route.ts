import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const noteSchema = z.object({
  content: z.string().min(1, "Nội dung không được để trống"),
  type:    z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customer = await prisma.customer.findUnique({ where: { id: params.id }, select: { branchId: true } });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role !== "SUPER_ADMIN" && customer.branchId !== session.user.branchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
  }

  const note = await prisma.customerNote.create({
    data: {
      customerId:  params.id,
      content:     parsed.data.content,
      type:        parsed.data.type ?? "GENERAL",
      createdById: session.user.id,
    },
    include: { createdBy: { select: { fullName: true } } },
  });

  return NextResponse.json(note, { status: 201 });
}
