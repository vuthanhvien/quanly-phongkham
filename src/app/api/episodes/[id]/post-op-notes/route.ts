import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  day:    z.number().int().min(0),
  note:   z.string().min(1, "Nội dung không được để trống"),
  status: z.string().optional(),
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

  const note = await prisma.postOpNote.create({
    data: {
      episodeId:   params.id,
      createdById: session.user.id,
      day:         parsed.data.day,
      note:        parsed.data.note,
      status:      parsed.data.status,
    },
    include: { createdBy: { select: { id: true, fullName: true } } },
  });

  return NextResponse.json(note, { status: 201 });
}
