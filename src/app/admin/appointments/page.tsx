import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/app-header"
import { PageBody } from "@/components/ui/sidebar"
import { AppointmentsClient } from "./appointments-client"

export default async function AppointmentsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/admin/login")

  const isSuperAdmin = session.user.role === "SUPER_ADMIN"

  const branches = isSuperAdmin
    ? await prisma.branch.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "asc" } })
    : []

  return (
    <>
      <AppHeader title="Lịch hẹn" />
      <PageBody>
        <AppointmentsClient
          isSuperAdmin={isSuperAdmin}
          currentBranchId={session.user.branchId ?? null}
          branches={branches}
        />
      </PageBody>
    </>
  )
}
