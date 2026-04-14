import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/app-header"
import { PageBody } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, CalendarDays, Package, TrendingUp } from "lucide-react"
import { format, startOfDay, endOfDay, startOfMonth } from "date-fns"
import { vi } from "date-fns/locale"
import { StaffCalendar } from "./dashboard-staff"

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"]

const APPT_TYPE_LABELS: Record<string, string> = {
  CONSULTATION: "Tư vấn",
  SURGERY:      "Phẫu thuật",
  FOLLOWUP:     "Tái khám",
  TREATMENT:    "Điều trị",
}

const APPT_STATUS_LABELS: Record<string, string> = {
  SCHEDULED:            "Đã lên lịch",
  CONFIRMED:            "Đã xác nhận",
  IN_PROGRESS:          "Đang thực hiện",
  DONE:                 "Hoàn thành",
  NO_SHOW:              "Không đến",
  CANCELLED:            "Đã huỷ",
  PENDING_CONFIRMATION: "Chờ xác nhận",
}

const APPT_STATUS_CLASS: Record<string, string> = {
  SCHEDULED:            "bg-blue-50 text-blue-700",
  CONFIRMED:            "bg-green-50 text-green-700",
  IN_PROGRESS:          "bg-yellow-50 text-yellow-700",
  DONE:                 "bg-gray-50 text-gray-600",
  NO_SHOW:              "bg-red-50 text-red-600",
  CANCELLED:            "bg-red-50 text-red-600",
  PENDING_CONFIRMATION: "bg-orange-50 text-orange-700",
}

function fmtCurrency(v: number) {
  return new Intl.NumberFormat("vi-VN", {
    style:    "currency",
    currency: "VND",
    notation: "compact",
  }).format(v)
}

function fmtTime(d: Date | string) {
  return format(new Date(d), "HH:mm")
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/admin/login")

  const isAdmin     = ADMIN_ROLES.includes(session.user.role)
  const isSuperAdmin = session.user.role === "SUPER_ADMIN"
  const branchFilter = isSuperAdmin ? {} : { branchId: session.user.branchId! }

  // ── Non-admin: show personal calendar ──────────────────────────────────────
  if (!isAdmin) {
    return (
      <>
        <AppHeader title="Lịch làm việc" />
        <PageBody>
          <StaffCalendar
            role={session.user.role}
            branchId={session.user.branchId ?? null}
          />
        </PageBody>
      </>
    )
  }

  // ── Admin: fetch stats ──────────────────────────────────────────────────────
  const now        = new Date()
  const todayStart = startOfDay(now)
  const todayEnd   = endOfDay(now)
  const monthStart = startOfMonth(now)

  const [
    totalCustomers,
    todayAppointments,
    lowStockBatches,
    revenueAgg,
  ] = await Promise.all([
    prisma.customer.count(),

    prisma.appointment.findMany({
      where: {
        ...branchFilter,
        startTime: { gte: todayStart, lte: todayEnd },
      },
      orderBy: { startTime: "asc" },
      include: {
        customer: { select: { fullName: true, phone: true } },
        branch:   { select: { name: true } },
      },
    }),

    prisma.stockBatch.count({
      where: {
        remainingQty: { lt: 1 },
        ...(isSuperAdmin ? {} : { branchId: session.user.branchId! }),
      },
    }),

    prisma.payment.aggregate({
      where: {
        paidAt:  { gte: monthStart, lte: now },
        invoice: { ...branchFilter },
      },
      _sum: { amount: true },
    }),
  ])

  const monthlyRevenue = Number(revenueAgg._sum.amount ?? 0)

  // Status summary for today
  const statusSummary: Record<string, number> = {}
  for (const a of todayAppointments) {
    statusSummary[a.status] = (statusSummary[a.status] ?? 0) + 1
  }

  const stats = [
    {
      title:       "Khách hàng",
      value:       totalCustomers.toLocaleString("vi-VN"),
      description: "Tổng số khách",
      icon:        Users,
      color:       "text-blue-600",
      bg:          "bg-blue-50",
    },
    {
      title:       "Lịch hẹn hôm nay",
      value:       todayAppointments.length.toString(),
      description: "Trong ngày",
      icon:        CalendarDays,
      color:       "text-green-600",
      bg:          "bg-green-50",
    },
    {
      title:       "Lô hàng hết kho",
      value:       lowStockBatches.toString(),
      description: "Lô có tồn kho = 0",
      icon:        Package,
      color:       lowStockBatches > 0 ? "text-orange-600" : "text-gray-400",
      bg:          lowStockBatches > 0 ? "bg-orange-50" : "bg-gray-50",
    },
    {
      title:       "Doanh thu tháng",
      value:       fmtCurrency(monthlyRevenue),
      description: format(now, "MMMM yyyy", { locale: vi }),
      icon:        TrendingUp,
      color:       "text-purple-600",
      bg:          "bg-purple-50",
    },
  ]

  return (
    <>
      <AppHeader title="Tổng quan" />
      <PageBody>
        <div className="space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-4">
            {stats.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`rounded-lg p-2 ${stat.bg}`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Content row */}
          <div className="grid grid-cols-3 gap-4">
            {/* Today's appointments */}
            <Card className="col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Lịch hẹn hôm nay — {format(now, "dd/MM/yyyy", { locale: vi })}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {todayAppointments.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-6 pb-4">
                    Không có lịch hẹn nào hôm nay.
                  </p>
                ) : (
                  <div className="divide-y">
                    {todayAppointments.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center gap-3 px-6 py-3 hover:bg-muted/40 transition-colors"
                      >
                        <div className="text-sm font-mono text-muted-foreground w-11 shrink-0">
                          {fmtTime(a.startTime)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {a.customer.fullName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {APPT_TYPE_LABELS[a.type] ?? a.type}
                            {a.branch && ` · ${a.branch.name}`}
                          </div>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${APPT_STATUS_CLASS[a.status] ?? "bg-gray-50 text-gray-600"}`}
                        >
                          {APPT_STATUS_LABELS[a.status] ?? a.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Trạng thái hôm nay</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(APPT_STATUS_LABELS).map(([key, label]) => {
                  const count = statusSummary[key] ?? 0
                  if (count === 0) return null
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">{label}</span>
                      <Badge
                        className={`${APPT_STATUS_CLASS[key]} border-0 font-semibold`}
                      >
                        {count}
                      </Badge>
                    </div>
                  )
                })}
                {Object.keys(statusSummary).length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Không có dữ liệu.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageBody>
    </>
  )
}
