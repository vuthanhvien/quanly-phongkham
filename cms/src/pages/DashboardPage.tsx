import {
  ExperimentOutlined,
  LineChartOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from "@ant-design/icons"
import dayjs from "dayjs"
import { useEffect, useMemo, useState } from "react"
import { api } from "../api"
import { DashboardDayScheduleCard } from "../components/dashboard/DashboardDayScheduleCard"
import { DashboardHero } from "../components/dashboard/DashboardHero"
import { DashboardMetricGrid } from "../components/dashboard/DashboardMetricGrid"
import { DashboardOperationsSection } from "../components/dashboard/DashboardOperationsSection"
import { DashboardScheduleSection } from "../components/dashboard/DashboardScheduleSection"
import type {
  ActivityItem,
  CalendarMode,
  DashboardEvent,
  DashboardMetric,
  DashboardPipeline,
  ListPayload,
  QuickStat,
} from "../components/dashboard/types"
import { EMPTY_LIST, formatCompactCurrency, formatCurrency, formatEventTime, isSameDay, parseAmount } from "../components/dashboard/utils"
import { getFieldLabel } from "../models"
import { loadRelationOptions, type LookupMap } from "../relations"

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
  const [selectedDate, setSelectedDate] = useState(dayjs())
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("month")
  const [events, setEvents] = useState<DashboardEvent[]>([])
  const [metrics, setMetrics] = useState<DashboardMetric[]>([])
  const [pipeline, setPipeline] = useState<DashboardPipeline[]>([])
  const [revenueToday, setRevenueToday] = useState(0)
  const [quickStats, setQuickStats] = useState<QuickStat[]>([])
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([])

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
      relationLookups,
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
      loadRelationOptions(["customerId", "staffId"]).catch(() => ({} as LookupMap)),
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

    setEvents(buildEvents(appointmentRows, workScheduleRows, relationLookups))
    setRevenueToday(
      invoiceRows
        .filter((item) => isSameDay(item.createdAt, today))
        .reduce((sum, item) => sum + parseAmount(item.paidAmount), 0),
    )
    setMetrics(buildMetrics(customerRows, leadRows, treatmentRows, medicalEpisodeRows, today))
    setPipeline(buildPipeline(consultationRows, serviceOrderRows, appointmentRows, invoiceRows, today))
    setQuickStats(buildQuickStats(invoiceRows, expenseRows, appointmentRows, workScheduleRows, today))
    setRecentActivities(buildRecentActivities(appointmentRows, invoiceRows, relationLookups, today))
  }

  const selectedEvents = useMemo(
    () =>
      events
        .filter((item) => dayjs(item.start).isSame(selectedDate, "day"))
        .sort((left, right) => dayjs(left.start).valueOf() - dayjs(right.start).valueOf()),
    [events, selectedDate],
  )

  const weekDays = useMemo(() => {
    const weekStart = selectedDate.startOf("week")
    return Array.from({ length: 7 }, (_, index) => weekStart.add(index, "day"))
  }, [selectedDate])

  const weekEvents = useMemo(
    () =>
      events
        .filter((item) => dayjs(item.start).isSame(selectedDate, "week"))
        .sort((left, right) => dayjs(left.start).valueOf() - dayjs(right.start).valueOf()),
    [events, selectedDate],
  )

  const appointmentCount = events.filter((item) => item.type === "appointment").length
  const scheduleCount = events.filter((item) => item.type === "schedule").length

  function shiftCalendar(offset: number) {
    if (calendarMode === "day") {
      setSelectedDate((current) => current.add(offset, "day"))
      return
    }
    if (calendarMode === "week") {
      setSelectedDate((current) => current.add(offset, "week"))
      return
    }
    setSelectedDate((current) => current.add(offset, "month"))
  }

  function jumpToToday() {
    setSelectedDate(dayjs())
  }

  const calendarRangeLabel =
    calendarMode === "day"
      ? selectedDate.format("DD/MM/YYYY")
      : calendarMode === "week"
        ? `${selectedDate.startOf("week").format("DD/MM")} - ${selectedDate.endOf("week").format("DD/MM/YYYY")}`
        : selectedDate.format("MM/YYYY")

  return (
    <>
      <DashboardHero revenueToday={revenueToday} />
      <DashboardMetricGrid metrics={metrics} />
      <DashboardOperationsSection pipeline={pipeline} quickStats={quickStats} />
      <DashboardScheduleSection
        allEvents={events}
        appointmentCount={appointmentCount}
        calendarMode={calendarMode}
        calendarRangeLabel={calendarRangeLabel}
        recentActivities={recentActivities}
        scheduleCount={scheduleCount}
        selectedDate={selectedDate}
        selectedEvents={selectedEvents}
        setCalendarMode={setCalendarMode}
        setSelectedDate={setSelectedDate}
        shiftCalendar={shiftCalendar}
        jumpToToday={jumpToToday}
        weekDays={weekDays}
        weekEvents={weekEvents}
      />
      <DashboardDayScheduleCard
        selectedDateLabel={selectedDate.format("DD/MM/YYYY")}
        selectedEvents={selectedEvents}
      />
    </>
  )
}

function buildEvents(
  appointmentRows: Record<string, any>[],
  workScheduleRows: Record<string, any>[],
  relationLookups: LookupMap,
) {
  const appointmentEvents = appointmentRows.map(
    (item: Record<string, any>) => ({
      id: item.id,
      type: "appointment" as const,
      title: `${getFieldLabel("appointments", "type", item.type) || "Lịch hẹn"} - ${relationLookups.customers?.[item.customerId] || item.customerId || "Khách hàng"}`,
      start: String(item.startTime || item.createdAt || ""),
      end: item.endTime ? String(item.endTime) : undefined,
      tone: "magenta",
      meta: [item.status ? getFieldLabel("appointments", "status", String(item.status)) : null, item.doctorName, item.room].filter(Boolean).join(" | "),
    }),
  )

  const scheduleEvents = workScheduleRows.map(
    (item: Record<string, any>) => ({
      id: item.id,
      type: "schedule" as const,
      title: `${item.shiftLabel || "Ca làm"} - ${relationLookups.staff?.[item.staffId] || item.staffId || "Nhân sự"}`,
      start: String(item.startTime || item.workDate || item.createdAt || ""),
      end: item.endTime ? String(item.endTime) : undefined,
      tone: "cyan",
      meta: [item.status ? getFieldLabel("work-schedules", "status", String(item.status)) : null, item.room, item.note].filter(Boolean).join(" | "),
    }),
  )

  return [...appointmentEvents, ...scheduleEvents]
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

function buildRecentActivities(
  appointmentRows: Record<string, any>[],
  invoiceRows: Record<string, any>[],
  relationLookups: LookupMap,
  today: dayjs.Dayjs,
): ActivityItem[] {
  return [
    ...appointmentRows
      .filter((item) => isSameDay(item.startTime, today))
      .slice(0, 3)
      .map((item) => ({
        id: `appointment-${item.id}`,
        title: `${getFieldLabel("appointments", "type", item.type) || "Lịch hẹn"} - ${relationLookups.customers?.[item.customerId] || item.customerId || "Khách hàng"}`,
        meta: [formatEventTime(String(item.startTime || ""), item.endTime), item.status ? getFieldLabel("appointments", "status", String(item.status)) : null, item.room].filter(Boolean).join(" | "),
        tone: "magenta",
      })),
    ...invoiceRows
      .filter((item) => isSameDay(item.createdAt, today))
      .slice(0, 3)
      .map((item) => ({
        id: `invoice-${item.id}`,
        title: `Hóa đơn ${item.code || item.id}`,
        meta: `${formatCurrency(parseAmount(item.totalAmount))} đ | ${getFieldLabel("invoices", "status", String(item.status || "UNPAID"))}`,
        tone: "cyan",
      })),
  ].slice(0, 6)
}
