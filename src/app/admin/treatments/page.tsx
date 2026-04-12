import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/layout/app-header";
import { PageBody } from "@/components/ui/sidebar";
import { TreatmentsClient } from "./treatments-client";

export default async function TreatmentsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  const branchFilter = isSuperAdmin ? {} : { branchId: session.user.branchId ?? undefined };

  const branches = isSuperAdmin
    ? await prisma.branch.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "asc" } })
    : [];

  const [doctors, plans] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true, role: { name: "DOCTOR" }, ...branchFilter },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.treatmentPlan.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, totalSessions: true, sessionInterval: true },
    }),
  ]);

  return (
    <>
      <AppHeader title="Liệu trình" />
      <PageBody>
        <TreatmentsClient
          isSuperAdmin={isSuperAdmin}
          currentBranchId={session.user.branchId ?? null}
          branches={branches}
          doctors={doctors}
          planOptions={plans}
        />
      </PageBody>
    </>
  );
}
