import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/layout/app-header";
import { PageBody } from "@/components/ui/sidebar";
import { EpisodeDetailClient } from "./episode-detail-client";

export default async function EpisodeDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const episode = await prisma.medicalEpisode.findUnique({
    where: { id: params.id },
    include: {
      customer: {
        select: {
          id: true, code: true, fullName: true, phone: true,
          hasAllergy: true, allergyNote: true,
          hasChronicDisease: true, chronicDiseaseNote: true,
        },
      },
      doctor:  { select: { id: true, fullName: true } },
      branch:  { select: { id: true, name: true } },
      vitalSigns: {
        orderBy: { recordedAt: "desc" },
        include: { recordedBy: { select: { id: true, fullName: true } } },
      },
      postOpNotes: {
        orderBy: { day: "asc" },
        include: { createdBy: { select: { id: true, fullName: true } } },
      },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!episode) notFound();
  if (session.user.role !== "SUPER_ADMIN" && episode.branchId !== session.user.branchId) {
    redirect("/episodes");
  }

  // Get doctors for reassign
  const branchFilter = session.user.role === "SUPER_ADMIN" ? {} : { branchId: session.user.branchId ?? undefined };
  const doctors = await prisma.user.findMany({
    where: { isActive: true, role: { name: "DOCTOR" }, ...branchFilter },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  const serialized = JSON.parse(JSON.stringify(episode));

  return (
    <>
      <AppHeader title={`Hồ sơ: ${episode.customer.fullName}`} />
      <PageBody>
        <EpisodeDetailClient episode={serialized} doctors={doctors} currentUserId={session.user.id} />
      </PageBody>
    </>
  );
}
