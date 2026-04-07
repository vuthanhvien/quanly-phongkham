import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/layout/app-header";
import { PageBody } from "@/components/ui/sidebar";
import { EpisodesClient } from "./episodes-client";

export default async function EpisodesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  const branchFilter = isSuperAdmin ? {} : { branchId: session.user.branchId ?? undefined };

  const doctors = await prisma.user.findMany({
    where: { isActive: true, role: { name: "DOCTOR" }, ...branchFilter },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  return (
    <>
      <AppHeader title="Hồ sơ bệnh án" />
      <PageBody>
        <EpisodesClient doctors={doctors} isSuperAdmin={isSuperAdmin} />
      </PageBody>
    </>
  );
}
