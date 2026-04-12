import { AppHeader } from "@/components/layout/app-header";
import { UsersClient } from "./users-client";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  const [rawUsers, roles, branches] = await Promise.all([
    prisma.user.findMany({
      where: isSuperAdmin ? {} : { branchId: session?.user?.branchId ?? "" },
      include: { role: true, branch: true, profile: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
    isSuperAdmin ? prisma.branch.findMany({ where: { isActive: true } }) : [],
  ]);

  // Serialize Prisma.JsonValue → string[] for workDays
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const users = (rawUsers as any[]).map((u) => ({
    id:       u.id,
    fullName: u.fullName,
    email:    u.email,
    phone:    u.phone,
    isActive: u.isActive,
    role:     u.role   ? { id: u.role.id,   name: u.role.name   } : null,
    branch:   u.branch ? { id: u.branch.id, name: u.branch.name } : null,
    profile: u.profile ? {
      specialty:     u.profile.specialty,
      licenseNumber: u.profile.licenseNumber,
      experience:    u.profile.experience,
      bio:           u.profile.bio,
      position:      u.profile.position,
      department:    u.profile.department,
      workDays:      Array.isArray(u.profile.workDays) ? (u.profile.workDays as string[]) : [],
    } : null,
  }));

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
