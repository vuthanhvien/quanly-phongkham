import { AppHeader } from "@/components/layout/app-header";
import { UsersClient } from "./users-client";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  const [users, roles, branches] = await Promise.all([
    prisma.user.findMany({
      where: isSuperAdmin ? {} : { branchId: session?.user?.branchId ?? "" },
      include: { role: true, branch: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
    isSuperAdmin ? prisma.branch.findMany({ where: { isActive: true } }) : [],
  ]);

  return (
    <div>
      <AppHeader title="Quản lý Tài khoản" />
      <div className="p-6">
        <UsersClient
          users={users}
          roles={roles}
          branches={branches}
          isSuperAdmin={isSuperAdmin}
          currentBranchId={session?.user?.branchId ?? null}
        />
      </div>
    </div>
  );
}
