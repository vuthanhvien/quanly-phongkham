import {
  ExperimentOutlined,
  LineChartOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from "@ant-design/icons"
import dayjs from "dayjs"
import { useEffect, useState } from "react"
import { api } from "../api"
import { DashboardMetricGrid } from "../components/dashboard/DashboardMetricGrid"
import { DashboardOperationsSection } from "../components/dashboard/DashboardOperationsSection"
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

export function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetric[]>([])
  const [pipeline, setPipeline] = useState<DashboardPipeline[]>([])
  const [quickStats, setQuickStats] = useState<QuickStat[]>([])

  useEffect(() => {
    void loadDashboard()
  }, [])

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
  }

  return (
    <>
      <DashboardMetricGrid metrics={metrics} />
      <DashboardOperationsSection pipeline={pipeline} quickStats={quickStats} />
    </>
  )
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
