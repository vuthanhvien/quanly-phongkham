import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const branches = await prisma.branch.findMany({
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(branches);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const { name, slug, address, phone } = parsed.data;

  const existing = await prisma.branch.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ message: "Slug đã tồn tại" }, { status: 400 });
  }

  const branch = await prisma.branch.create({
    data: { name, slug, address, phone },
  });

  return NextResponse.json(branch, { status: 201 });
}
