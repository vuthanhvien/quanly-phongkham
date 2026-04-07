import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/layout/app-header";
import { PageBody } from "@/components/ui/sidebar";
import { CustomersClient } from "./customers-client";

export default async function CustomersPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  const branchId = session.user.branchId;

  // Prefetch sales staff for assign dropdown
  const sales = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { name: { in: ["SALE", "ADMIN", "SUPER_ADMIN", "DOCTOR"] } },
      ...(isSuperAdmin ? {} : { branchId: branchId ?? undefined }),
    },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  return (
    <>
      <AppHeader title="Khách hàng" />
      <PageBody>
        <CustomersClient
          sales={sales}
          isSuperAdmin={isSuperAdmin}
          currentBranchId={branchId ?? null}
        />
      </PageBody>
    </>
  );
}
