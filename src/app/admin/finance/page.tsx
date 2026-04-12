import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/layout/app-header";
import { PageBody } from "@/components/ui/sidebar";
import { FinanceClient } from "./finance-client";

export default async function FinancePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  const branches = isSuperAdmin
    ? await prisma.branch.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "asc" } })
    : [];

  return (
    <>
      <AppHeader title="Thu chi" />
      <PageBody>
        <FinanceClient
          isSuperAdmin={isSuperAdmin}
          currentBranchId={session.user.branchId ?? null}
          branches={branches}
        />
      </PageBody>
    </>
  );
}
