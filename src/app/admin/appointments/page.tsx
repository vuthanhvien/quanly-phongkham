import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AppHeader } from "@/components/layout/app-header"
import { PageBody } from "@/components/ui/sidebar"
import { AppointmentsClient } from "./appointments-client"

export default async function AppointmentsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/admin/login")

  return (
    <>
      <AppHeader title="Lịch hẹn" />
      <PageBody>
        <AppointmentsClient
          isSuperAdmin={session.user.role === "SUPER_ADMIN"}
          currentBranchId={session.user.branchId ?? null}
        />
      </PageBody>
    </>
  )
}
