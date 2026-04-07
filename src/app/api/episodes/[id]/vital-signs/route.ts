import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  pulse:       z.number().int().min(0).max(300).optional(),
  systolicBP:  z.number().int().min(0).max(300).optional(),
  diastolicBP: z.number().int().min(0).max(200).optional(),
  spO2:        z.number().min(0).max(100).optional(),
  temperature: z.number().min(30).max(45).optional(),
  note:        z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const episode = await prisma.medicalEpisode.findUnique({ where: { id: params.id }, select: { branchId: true } });
  if (!episode) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.user.role !== "SUPER_ADMIN" && episode.branchId !== session.user.branchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
  }

  const vs = await prisma.vitalSign.create({
    data: {
      episodeId:    params.id,
      recordedById: session.user.id,
      ...parsed.data,
    },
    include: { recordedBy: { select: { id: true, fullName: true } } },
  });

  return NextResponse.json(vs, { status: 201 });
}
