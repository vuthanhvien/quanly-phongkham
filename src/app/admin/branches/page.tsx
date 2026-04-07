import { AppHeader } from "@/components/layout/app-header";
import { BranchesClient } from "./branches-client";
import { prisma } from "@/lib/prisma";

export default async function BranchesPage() {
  const branches = await prisma.branch.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { users: true, customers: true } },
    },
  });

  return (
    <div>
      <AppHeader title="Quản lý Chi nhánh" />
      <div className="p-6">
        <BranchesClient branches={branches} />
      </div>
    </div>
  );
}
