import {
  ExperimentOutlined,
  LineChartOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from "@ant-design/icons"
import { useGetIdentity } from "@refinedev/core"
import { Drawer, Grid, message } from "antd"
import dayjs from "dayjs"
import { useEffect, useState } from "react"
import { api } from "../api"
import { DashboardMetricGrid } from "../components/dashboard/DashboardMetricGrid"
import { DashboardOperationsSection } from "../components/dashboard/DashboardOperationsSection"
import { DashboardStaffSection } from "../components/dashboard/DashboardStaffSection"
import { RecordFormContent } from "../components/RecordFormContent"
import { getFieldLabel } from "../models"
import { hasActionAccess } from "../access"
import type {
  DashboardMetric,
  DashboardPipeline,
  ListPayload,
  QuickStat,
} from "../components/dashboard/types"
import { EMPTY_LIST, formatCompactCurrency, formatCurrency, isSameDay, parseAmount } from "../components/dashboard/utils"

async function fetchList<T>(resource: string, pageSize = 10000) {
  const response = await api.get(`/records/${resource}`, { params: { pageSize } })
  return response.data as ListPayload<T>
}

async function fetchListSafe<T>(resource: string, pageSize = 10000) {
  try {
    return await fetchList<T>(resource, pageSize)
  } catch {
    return EMPTY_LIST as ListPayload<T>
  }
}

type Identity = {
  staffId?: string
  branchId?: string
  fullName?: string
  username?: string
  email?: string
}

type StaffDashboardData = {
  staffName: string
  position?: string
  departmentName?: string
  branchName?: string
  todayShift?: {
    label?: string
    time?: string
    status?: string
  }
  todayAttendance?: {
    id?: string
    checkIn?: string
    checkOut?: string
    status?: string
    statusLabel?: string
  }
  latestLeave?: {
    dateLabel?: string
    typeLabel?: string
    statusLabel?: string
  }
  pendingLeaveCount: number
  monthAttendanceCount: number
}

export function DashboardPage() {
  const screens = Grid.useBreakpoint()
  const { data: identity } = useGetIdentity<Identity>()
  const [metrics, setMetrics] = useState<DashboardMetric[]>([])
  const [pipeline, setPipeline] = useState<DashboardPipeline[]>([])
  const [quickStats, setQuickStats] = useState<QuickStat[]>([])
  const [staffDashboard, setStaffDashboard] = useState<StaffDashboardData | null>(null)
  const [staffActionLoading, setStaffActionLoading] = useState<"checkin" | "checkout" | undefined>(undefined)
  const [leaveDrawerOpen, setLeaveDrawerOpen] = useState(false)

  useEffect(() => {
    void loadDashboard()
  }, [identity?.staffId, identity?.branchId, identity?.fullName, identity?.username, identity?.email])

  async function loadDashboard() {
    const [
      appointments,
      workSchedules,
      customers,
      leads,
      treatments,
      medicalEpisodes,
      consultations,
      serviceOrders,
      invoices,
      expenses,
    ] = await Promise.all([
      fetchListSafe<Record<string, any>>("appointments", 500),
      fetchListSafe<Record<string, any>>("work-schedules", 500),
      fetchListSafe<Record<string, any>>("customers"),
      fetchListSafe<Record<string, any>>("leads"),
      fetchListSafe<Record<string, any>>("treatments"),
      fetchListSafe<Record<string, any>>("medical-episodes"),
      fetchListSafe<Record<string, any>>("consultations"),
      fetchListSafe<Record<string, any>>("service-orders"),
      fetchListSafe<Record<string, any>>("invoices"),
      fetchListSafe<Record<string, any>>("expenses"),
    ])

    const today = dayjs()
    const appointmentRows = appointments.data || []
    const workScheduleRows = workSchedules.data || []
    const customerRows = customers.data || []
    const leadRows = leads.data || []
    const treatmentRows = treatments.data || []
    const medicalEpisodeRows = medicalEpisodes.data || []
    const consultationRows = consultations.data || []
    const serviceOrderRows = serviceOrders.data || []
    const invoiceRows = invoices.data || []
    const expenseRows = expenses.data || []

    setMetrics(buildMetrics(customerRows, leadRows, treatmentRows, medicalEpisodeRows, today))
    setPipeline(buildPipeline(consultationRows, serviceOrderRows, appointmentRows, invoiceRows, today))
    setQuickStats(buildQuickStats(invoiceRows, expenseRows, appointmentRows, workScheduleRows, today))

    if (identity?.staffId) {
      const staffProfile = await loadStaffDashboard(identity)
      setStaffDashboard(staffProfile)
    } else {
      setStaffDashboard(null)
    }
  }

  async function handleCheckIn() {
    if (!identity?.staffId) return
    setStaffActionLoading("checkin")
    try {
      const currentTime = dayjs()
      const today = currentTime.format("YYYY-MM-DD")
      const existing = staffDashboard?.todayAttendance?.id
      if (existing) {
        await api.patch(`/records/attendances/${existing}`, {
          checkIn: staffDashboard?.todayAttendance?.checkIn || currentTime.format("HH:mm"),
          status: staffDashboard?.todayAttendance?.status || (currentTime.hour() > 9 ? "late" : "present"),
        })
      } else {
        await api.post("/records/attendances", {
          staffId: identity.staffId,
          branchId: identity.branchId,
          date: today,
          checkIn: currentTime.format("HH:mm"),
          status: currentTime.hour() > 9 ? "late" : "present",
          note: "Check-in từ trang chủ",
        })
      }
      message.success("Đã check-in")
      const nextStaffDashboard = await loadStaffDashboard(identity)
      setStaffDashboard(nextStaffDashboard)
    } catch {
      message.error("Không thể check-in")
    } finally {
      setStaffActionLoading(undefined)
    }
  }

  async function handleCheckOut() {
    if (!staffDashboard?.todayAttendance?.id) return
    setStaffActionLoading("checkout")
    try {
      await api.patch(`/records/attendances/${staffDashboard.todayAttendance.id}`, {
        checkOut: dayjs().format("HH:mm"),
      })
      message.success("Đã check-out")
      const nextStaffDashboard = await loadStaffDashboard(identity || {})
      setStaffDashboard(nextStaffDashboard)
    } catch {
      message.error("Không thể check-out")
    } finally {
      setStaffActionLoading(undefined)
    }
  }

  return (
    <>
      {staffDashboard ? (
        <DashboardStaffSection
          actionLoading={staffActionLoading}
          canCreateAttendance={hasActionAccess("attendances", "create")}
          canCreateLeaveRequest={hasActionAccess("leave-requests", "create")}
          canUpdateAttendance={hasActionAccess("attendances", "update")}
          data={staffDashboard}
          onCheckIn={() => void handleCheckIn()}
          onCheckOut={() => void handleCheckOut()}
          onOpenLeaveRequest={() => setLeaveDrawerOpen(true)}
        />
      ) : null}
      <DashboardMetricGrid metrics={metrics} />
      <DashboardOperationsSection pipeline={pipeline} quickStats={quickStats} />
      <Drawer
        className="quick-drawer"
        destroyOnClose
        maskClosable={false}
        open={leaveDrawerOpen}
        placement="right"
        title="Tạo đơn xin nghỉ"
        width={screens.md ? 560 : "100%"}
        onClose={() => setLeaveDrawerOpen(false)}
      >
        <RecordFormContent
          compact
          initialValues={{
            staffId: identity?.staffId,
            branchId: identity?.branchId,
            startDate: dayjs().format("YYYY-MM-DD"),
            endDate: dayjs().format("YYYY-MM-DD"),
            status: "pending",
            leaveType: "annual",
          }}
          resource="leave-requests"
          onCancel={() => setLeaveDrawerOpen(false)}
          onSuccess={() => {
            setLeaveDrawerOpen(false)
            void loadDashboard()
          }}
        />
      </Drawer>
    </>
  )
}

async function loadStaffDashboard(identity: Identity): Promise<StaffDashboardData | null> {
  if (!identity.staffId) return null
  const today = dayjs()
  const [staffResponse, departments, branches, workSchedules, attendances, leaveRequests] = await Promise.all([
    api.get(`/records/staff/${identity.staffId}`).catch(() => null),
    fetchListSafe<Record<string, any>>("departments", 500),
    fetchListSafe<Record<string, any>>("branches", 500),
    fetchListSafe<Record<string, any>>("work-schedules", 1000),
    fetchListSafe<Record<string, any>>("attendances", 1000),
    fetchListSafe<Record<string, any>>("leave-requests", 1000),
  ])

  const staff = (staffResponse?.data?.data || {}) as Record<string, any>
  const departmentMap = Object.fromEntries((departments.data || []).map((item) => [String(item.id), String(item.name || item.code || item.id)]))
  const branchMap = Object.fromEntries((branches.data || []).map((item) => [String(item.id), String(item.name || item.slug || item.id)]))
  const ownSchedules = (workSchedules.data || []).filter((item) => String(item.staffId) === identity.staffId)
  const ownAttendances = (attendances.data || []).filter((item) => String(item.staffId) === identity.staffId)
  const ownLeaves = (leaveRequests.data || []).filter((item) => String(item.staffId) === identity.staffId)
  const todayShift = ownSchedules
    .filter((item) => isSameDay(item.workDate || item.startTime, today))
    .sort((left, right) => dayjs(left.startTime || left.workDate).valueOf() - dayjs(right.startTime || right.workDate).valueOf())[0]
  const todayAttendance = ownAttendances
    .filter((item) => String(item.date) === today.format("YYYY-MM-DD"))
    .sort((left, right) => dayjs(right.updatedAt || right.createdAt || right.date).valueOf() - dayjs(left.updatedAt || left.createdAt || left.date).valueOf())[0]
  const latestLeave = [...ownLeaves].sort((left, right) => dayjs(right.startDate).valueOf() - dayjs(left.startDate).valueOf())[0]

  return {
    staffName: String(staff.fullName || staff.code || identity.fullName || identity.username || identity.email || "Nhân viên"),
    position: staff.position ? String(staff.position) : undefined,
    departmentName: staff.departmentId ? departmentMap[String(staff.departmentId)] : undefined,
    branchName: branchMap[String(staff.defaultBranchId || identity.branchId || "")] || undefined,
    todayShift: todayShift
      ? {
          label: String(todayShift.shiftLabel || "Ca làm"),
          time: [todayShift.startTime ? dayjs(todayShift.startTime).format("HH:mm") : undefined, todayShift.endTime ? dayjs(todayShift.endTime).format("HH:mm") : undefined].filter(Boolean).join(" - ") || "Chưa có giờ cụ thể",
          status: getFieldLabel("work-schedules", "status", String(todayShift.status || "PLANNED")),
        }
      : undefined,
    todayAttendance: todayAttendance
      ? {
          id: String(todayAttendance.id),
          checkIn: todayAttendance.checkIn ? String(todayAttendance.checkIn) : undefined,
          checkOut: todayAttendance.checkOut ? String(todayAttendance.checkOut) : undefined,
          status: todayAttendance.status ? String(todayAttendance.status) : "present",
          statusLabel: getFieldLabel("attendances", "status", String(todayAttendance.status || "present")),
        }
      : undefined,
    latestLeave: latestLeave
      ? {
          dateLabel: `${dayjs(latestLeave.startDate).format("DD/MM")} - ${dayjs(latestLeave.endDate).format("DD/MM")}`,
          typeLabel: getFieldLabel("leave-requests", "leaveType", String(latestLeave.leaveType || "annual")),
          statusLabel: getFieldLabel("leave-requests", "status", String(latestLeave.status || "pending")),
        }
      : undefined,
    pendingLeaveCount: ownLeaves.filter((item) => String(item.status || "pending") === "pending").length,
    monthAttendanceCount: ownAttendances.filter((item) => dayjs(item.date).isSame(today, "month")).length,
  }
}

function buildMetrics(
  customerRows: Record<string, any>[],
  leadRows: Record<string, any>[],
  treatmentRows: Record<string, any>[],
  medicalEpisodeRows: Record<string, any>[],
  today: dayjs.Dayjs,
): DashboardMetric[] {
  const activeTreatments = treatmentRows.filter((item) => item.status === "ACTIVE")
  const activeMedicalEpisodes = medicalEpisodeRows.filter((item) => item.status === "ACTIVE")
  const openLeads = leadRows.filter((item) => !["CONVERTED", "LOST"].includes(String(item.status || "")))

  return [
    {
      title: "Khách hàng",
      value: customerRows.length,
      suffix: "khách",
      icon: <TeamOutlined />,
      tone: "rose",
      trend: `${customerRows.filter((item) => isSameDay(item.createdAt, today)).length} mới hôm nay`,
    },
    {
      title: "Lead đang xử lý",
      value: openLeads.length,
      suffix: "lead",
      icon: <LineChartOutlined />,
      tone: "gold",
      trend: `${leadRows.filter((item) => item.status === "NEW").length} lead mới`,
    },
    {
      title: "Liệu trình active",
      value: activeTreatments.length,
      suffix: "ca",
      icon: <ExperimentOutlined />,
      tone: "violet",
      trend: `${treatmentRows.length.toLocaleString("vi-VN")} tổng liệu trình`,
    },
    {
      title: "Hồ sơ điều trị mở",
      value: activeMedicalEpisodes.length,
      suffix: "hồ sơ",
      icon: <SafetyCertificateOutlined />,
      tone: "cyan",
      trend: `${medicalEpisodeRows.length.toLocaleString("vi-VN")} hồ sơ điều trị`,
    },
  ]
}

function buildPipeline(
  consultationRows: Record<string, any>[],
  serviceOrderRows: Record<string, any>[],
  appointmentRows: Record<string, any>[],
  invoiceRows: Record<string, any>[],
  today: dayjs.Dayjs,
): DashboardPipeline[] {
  const pipelineTotals = [
    { label: "Tư vấn hôm nay", count: consultationRows.filter((item) => isSameDay(item.consultedAt || item.createdAt, today)).length, color: "#e889ae" },
    { label: "Đơn hàng hôm nay", count: serviceOrderRows.filter((item) => isSameDay(item.orderDate || item.createdAt, today)).length, color: "#d7a45b" },
    { label: "Lịch hẹn hôm nay", count: appointmentRows.filter((item) => isSameDay(item.startTime, today)).length, color: "#9b7cff" },
    { label: "Hóa đơn hôm nay", count: invoiceRows.filter((item) => isSameDay(item.createdAt, today)).length, color: "#62d8d2" },
  ]
  const maxTotal = Math.max(...pipelineTotals.map((item) => item.count), 1)
  return pipelineTotals.map((item) => ({
    label: item.label,
    count: item.count,
    value: Math.round((item.count / maxTotal) * 100),
    color: item.color,
  }))
}

function buildQuickStats(
  invoiceRows: Record<string, any>[],
  expenseRows: Record<string, any>[],
  appointmentRows: Record<string, any>[],
  workScheduleRows: Record<string, any>[],
  today: dayjs.Dayjs,
): QuickStat[] {
  const collectedToday = invoiceRows
    .filter((item) => isSameDay(item.createdAt, today))
    .reduce((sum, item) => sum + parseAmount(item.paidAmount), 0)
  const expenseToday = expenseRows
    .filter((item) => isSameDay(item.paidAt, today) || isSameDay(item.createdAt, today))
    .reduce((sum, item) => sum + parseAmount(item.amount), 0)
  const receivableOutstanding = invoiceRows.reduce(
    (sum, item) => sum + Math.max(parseAmount(item.totalAmount) - parseAmount(item.paidAmount), 0),
    0,
  )
  const appointmentsToday = appointmentRows.filter((item) => isSameDay(item.startTime, today))

  return [
    {
      label: "Thu hôm nay",
      value: `${formatCompactCurrency(collectedToday)} đ`,
      hint: `${formatCurrency(collectedToday)} đ đã thu`,
    },
    {
      label: "Chi hôm nay",
      value: `${formatCompactCurrency(expenseToday)} đ`,
      hint: `${formatCurrency(expenseToday)} đ chi ra`,
    },
    {
      label: "Còn phải thu",
      value: `${formatCompactCurrency(receivableOutstanding)} đ`,
      hint: "Tổng công nợ hóa đơn chưa thu đủ",
    },
    {
      label: "Lịch hẹn hôm nay",
      value: `${appointmentsToday.length}`,
      hint: `${workScheduleRows.filter((item) => isSameDay(item.workDate || item.startTime, today)).length} ca làm việc`,
    },
  ]
}
