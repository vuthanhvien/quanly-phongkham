import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/layout/app-header";
import { PageBody } from "@/components/ui/sidebar";
import { WarehouseClient } from "./warehouse-client";

export default async function WarehousePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  const branches = isSuperAdmin
    ? await prisma.branch.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "asc" } })
    : [];

  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, code: true, name: true, purchaseUnit: true, usageUnit: true, conversionFactor: true },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <AppHeader title="Kho & Vật tư" />
      <PageBody>
        <WarehouseClient
          isSuperAdmin={isSuperAdmin}
          currentBranchId={session.user.branchId ?? null}
          branches={branches}
          productOptions={products.map(p => ({ value: p.id, label: `${p.code} – ${p.name}`, conversionFactor: Number(p.conversionFactor), purchaseUnit: p.purchaseUnit, usageUnit: p.usageUnit }))}
        />
      </PageBody>
    </>
  );
}
