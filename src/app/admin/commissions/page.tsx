import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/layout/app-header";
import { PageBody } from "@/components/ui/sidebar";
import { CommissionsClient } from "./commissions-client";

export default async function CommissionsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");

  const staffUsers = await prisma.user.findMany({
    where: { isActive: true, role: { name: { in: ["SALE", "DOCTOR", "NURSE"] } } },
    select: { id: true, fullName: true, role: { select: { name: true } } },
    orderBy: { fullName: "asc" },
  });

  return (
    <>
      <AppHeader title="Hoa hồng" />
      <PageBody>
        <CommissionsClient
          isSuperAdmin={session.user.role === "SUPER_ADMIN"}
          currentUserId={session.user.id}
          currentRole={session.user.role}
          staffUsers={staffUsers.map(u => ({ id: u.id, fullName: u.fullName, roleName: u.role.name }))}
        />
      </PageBody>
    </>
  );
}
