import {
  CalendarOutlined,
  EyeOutlined,
  FieldTimeOutlined,
  FileDoneOutlined,
  TeamOutlined,
} from "@ant-design/icons"
import dayjs, { type Dayjs } from "dayjs"
import { Button, Calendar, Card, Col, Empty, List, Row, Segmented, Select, Space, Tag, Typography } from "antd"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "../api"
import { getFieldLabel } from "../models"
import { loadRelationOptions, type LookupMap } from "../relations"
import { formatEventTime } from "../components/dashboard/utils"

type CalendarMode = "day" | "week" | "month"
type PlannerEventType = "appointment" | "schedule" | "leave" | "attendance"

interface PlannerEvent {
  id: string
  resource: "appointments" | "work-schedules" | "leave-requests" | "attendances"
  type: PlannerEventType
  title: string
  start: string
  end?: string
  branchId?: string
  staffId?: string
  customerId?: string
  tone: string
  statusLabel: string
  summary: string
}

const EVENT_TYPE_OPTIONS: Array<{ label: string; value: PlannerEventType }> = [
  { label: "Booking", value: "appointment" },
  { label: "Ca làm", value: "schedule" },
  { label: "Xin nghỉ", value: "leave" },
  { label: "Chấm công", value: "attendance" },
]

const EVENT_TYPE_LABEL: Record<PlannerEventType, string> = {
  appointment: "Booking",
  schedule: "Ca làm",
  leave: "Xin nghỉ",
  attendance: "Chấm công",
}

const EVENT_TYPE_COLOR: Record<PlannerEventType, string> = {
  appointment: "magenta",
  schedule: "cyan",
  leave: "orange",
  attendance: "green",
}

async function fetchListSafe<T>(resource: string, pageSize = 500) {
  try {
    const response = await api.get(`/records/${resource}`, { params: { pageSize } })
    return (response.data?.data || []) as T[]
  } catch {
    return [] as T[]
  }
}

export function CalendarPage() {
  const navigate = useNavigate()
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("week")
  const [selectedDate, setSelectedDate] = useState(dayjs())
  const [events, setEvents] = useState<PlannerEvent[]>([])
  const [lookups, setLookups] = useState<LookupMap>({})
  const [selectedTypes, setSelectedTypes] = useState<PlannerEventType[]>(["appointment", "schedule", "leave", "attendance"])
  const [branchFilter, setBranchFilter] = useState<string | undefined>(undefined)
  const [staffFilter, setStaffFilter] = useState<string | undefined>(undefined)

  useEffect(() => {
    void loadCalendar()
  }, [])

  async function loadCalendar() {
    const [appointments, workSchedules, leaveRequests, attendances, relationLookups] = await Promise.all([
      fetchListSafe<Record<string, any>>("appointments"),
      fetchListSafe<Record<string, any>>("work-schedules"),
      fetchListSafe<Record<string, any>>("leave-requests"),
      fetchListSafe<Record<string, any>>("attendances"),
      loadRelationOptions(["branchId", "staffId", "customerId"]).catch(() => ({} as LookupMap)),
    ])

    setLookups(relationLookups)
    setEvents(buildPlannerEvents({ appointments, workSchedules, leaveRequests, attendances, lookups: relationLookups }))
  }

  const filteredEvents = useMemo(
    () =>
      events.filter((item) => {
        if (!selectedTypes.includes(item.type)) return false
        if (branchFilter && item.branchId !== branchFilter) return false
        if (staffFilter && item.staffId !== staffFilter) return false
        return true
      }),
    [branchFilter, events, selectedTypes, staffFilter],
  )

  const selectedEvents = useMemo(
    () =>
      filteredEvents
        .filter((item) => dayjs(item.start).isSame(selectedDate, "day"))
        .sort((left, right) => dayjs(left.start).valueOf() - dayjs(right.start).valueOf()),
    [filteredEvents, selectedDate],
  )

  const weekDays = useMemo(() => {
    const start = selectedDate.startOf("week")
    return Array.from({ length: 7 }, (_, index) => start.add(index, "day"))
  }, [selectedDate])

  const weekEvents = useMemo(
    () => filteredEvents.filter((item) => dayjs(item.start).isSame(selectedDate, "week")),
    [filteredEvents, selectedDate],
  )

  const countsForSelectedDay = useMemo(() => {
    const dayEvents = selectedEvents
    return {
      appointment: dayEvents.filter((item) => item.type === "appointment").length,
      schedule: dayEvents.filter((item) => item.type === "schedule").length,
      leave: dayEvents.filter((item) => item.type === "leave").length,
      attendance: dayEvents.filter((item) => item.type === "attendance").length,
    }
  }, [selectedEvents])

  const branchOptions = useMemo(
    () =>
      Object.entries(lookups.branches || {}).map(([value, label]) => ({
        value,
        label,
      })),
    [lookups],
  )

  const staffOptions = useMemo(
    () =>
      Object.entries(lookups.staff || {}).map(([value, label]) => ({
        value,
        label,
      })),
    [lookups],
  )

  const calendarRangeLabel =
    calendarMode === "day"
      ? selectedDate.format("DD/MM/YYYY")
      : calendarMode === "week"
        ? `${selectedDate.startOf("week").format("DD/MM")} - ${selectedDate.endOf("week").format("DD/MM/YYYY")}`
        : selectedDate.format("MM/YYYY")

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

  return (
    <>
      <div className="page-header">
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>Calendar điều phối</Typography.Title>
          <Typography.Text type="secondary">
            Quản lý booking với khách, ca làm, nghỉ phép và chấm công trên cùng một màn hình.
          </Typography.Text>
        </div>
        <Space wrap>
          <Button onClick={() => navigate("/appointments")}>Mở booking</Button>
          <Button onClick={() => navigate("/work-schedules")}>Mở lịch làm việc</Button>
          <Button onClick={() => navigate("/leave-requests")}>Mở nghỉ phép</Button>
        </Space>
      </div>

      <div className="calendar-planner-layout">
        <div className="calendar-planner-main">
          <Card className="glass-card spacious-card calendar-planner-filters">
            <Space wrap size={12}>
              <Segmented<CalendarMode>
                options={[
                  { label: "Ngày", value: "day" },
                  { label: "Tuần", value: "week" },
                  { label: "Tháng", value: "month" },
                ]}
                value={calendarMode}
                onChange={(value) => setCalendarMode(value)}
              />
              <Select
                allowClear
                className="calendar-planner-select"
                placeholder="Lọc chi nhánh"
                options={branchOptions}
                value={branchFilter}
                onChange={(value) => setBranchFilter(value)}
              />
              <Select
                allowClear
                className="calendar-planner-select"
                placeholder="Lọc nhân sự"
                options={staffOptions}
                value={staffFilter}
                onChange={(value) => setStaffFilter(value)}
              />
              <Select
                className="calendar-planner-types"
                mode="multiple"
                options={EVENT_TYPE_OPTIONS}
                value={selectedTypes}
                onChange={(value) => setSelectedTypes(value as PlannerEventType[])}
              />
            </Space>
          </Card>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12} xl={6}>
              <Card className="glass-card calendar-kpi-card">
                <Typography.Text type="secondary">Booking trong ngày</Typography.Text>
                <Typography.Title level={3}>{countsForSelectedDay.appointment}</Typography.Title>
              </Card>
            </Col>
            <Col xs={24} md={12} xl={6}>
              <Card className="glass-card calendar-kpi-card">
                <Typography.Text type="secondary">Ca làm trong ngày</Typography.Text>
                <Typography.Title level={3}>{countsForSelectedDay.schedule}</Typography.Title>
              </Card>
            </Col>
            <Col xs={24} md={12} xl={6}>
              <Card className="glass-card calendar-kpi-card">
                <Typography.Text type="secondary">Nhân sự xin nghỉ</Typography.Text>
                <Typography.Title level={3}>{countsForSelectedDay.leave}</Typography.Title>
              </Card>
            </Col>
            <Col xs={24} md={12} xl={6}>
              <Card className="glass-card calendar-kpi-card">
                <Typography.Text type="secondary">Bản ghi chấm công</Typography.Text>
                <Typography.Title level={3}>{countsForSelectedDay.attendance}</Typography.Title>
              </Card>
            </Col>
          </Row>

          <Card
            className="glass-card spacious-card"
            title="Lịch tổng hợp"
            extra={(
              <Space wrap>
                <Button onClick={() => shiftCalendar(-1)}>Trước</Button>
                <Typography.Text className="calendar-range-label">{calendarRangeLabel}</Typography.Text>
                <Button onClick={() => shiftCalendar(1)}>Sau</Button>
                <Button onClick={() => setSelectedDate(dayjs())}>Hôm nay</Button>
              </Space>
            )}
          >
            {calendarMode === "month" ? (
              <Calendar
                fullscreen={false}
                value={selectedDate}
                onSelect={setSelectedDate}
                fullCellRender={(value) => renderMonthCell(value, filteredEvents)}
              />
            ) : calendarMode === "week" ? (
              <div className="calendar-week-grid">
                {weekDays.map((date) => {
                  const dayEvents = weekEvents
                    .filter((item) => dayjs(item.start).isSame(date, "day"))
                    .sort((left, right) => dayjs(left.start).valueOf() - dayjs(right.start).valueOf())
                  return (
                    <button
                      key={date.format("YYYY-MM-DD")}
                      className={`calendar-week-column${date.isSame(selectedDate, "day") ? " is-selected" : ""}`}
                      type="button"
                      onClick={() => setSelectedDate(date)}
                    >
                      <div className="calendar-week-column-head">
                        <strong>{date.format("DD/MM")}</strong>
                        <span>{dayEvents.length} mục</span>
                      </div>
                      <div className="calendar-week-column-body">
                        {dayEvents.length === 0 ? (
                          <Typography.Text type="secondary">Trống</Typography.Text>
                        ) : (
                          dayEvents.slice(0, 5).map((event) => (
                            <div className={`calendar-event-chip tone-${event.type}`} key={event.id}>
                              <strong>{formatEventTime(event.start, event.end)}</strong>
                              <span>{event.title}</span>
                            </div>
                          ))
                        )}
                        {dayEvents.length > 5 ? <Typography.Text type="secondary">+{dayEvents.length - 5} mục khác</Typography.Text> : null}
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <List
                locale={{ emptyText: "Chưa có lịch trong ngày được chọn" }}
                dataSource={selectedEvents}
                renderItem={(item) => <PlannerEventRow item={item} onOpen={() => navigate(`/${item.resource}/${item.id}`)} />}
              />
            )}
          </Card>
        </div>

        <div className="calendar-planner-sidebar">
          <div className="calendar-planner-sticky">
            <Card className="glass-card spacious-card" title={`Chi tiết ngày ${selectedDate.format("DD/MM/YYYY")}`}>
              <Space wrap size={[8, 8]} style={{ marginBottom: 12 }}>
                {EVENT_TYPE_OPTIONS.map((option) => (
                  <Tag color={EVENT_TYPE_COLOR[option.value]} key={option.value}>
                    {option.label}: {countsForSelectedDay[option.value]}
                  </Tag>
                ))}
              </Space>
              <List
                locale={{ emptyText: <Empty description="Ngày này chưa có mục điều phối" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                dataSource={selectedEvents}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Button
                        key={`open-${item.id}`}
                        icon={<EyeOutlined />}
                        size="small"
                        type="text"
                        onClick={() => navigate(`/${item.resource}/${item.id}`)}
                      />,
                    ]}
                  >
                    <List.Item.Meta
                      title={(
                        <Space size={8} wrap>
                          <Tag color={item.tone}>{EVENT_TYPE_LABEL[item.type]}</Tag>
                          <span>{item.title}</span>
                        </Space>
                      )}
                      description={(
                        <div className="calendar-event-meta">
                          <span>{formatEventTime(item.start, item.end)}</span>
                          <span>{item.statusLabel}</span>
                          <span>{item.summary}</span>
                        </div>
                      )}
                    />
                  </List.Item>
                )}
              />
            </Card>

            <Card className="glass-card spacious-card" title="Gợi ý vận hành">
              <div className="calendar-insight-list">
                <div className="calendar-insight-item">
                  <CalendarOutlined />
                  <div>
                    <strong>Booking với khách hàng</strong>
                    <span>Theo dõi lịch hẹn theo bác sĩ, phòng và trạng thái xử lý.</span>
                  </div>
                </div>
                <div className="calendar-insight-item">
                  <TeamOutlined />
                  <div>
                    <strong>Điều phối ca nhân viên</strong>
                    <span>So lịch làm việc với nghỉ phép để tránh thiếu người trong giờ cao điểm.</span>
                  </div>
                </div>
                <div className="calendar-insight-item">
                  <FileDoneOutlined />
                  <div>
                    <strong>Kiểm tra vắng mặt</strong>
                    <span>Kết hợp chấm công và đơn nghỉ để phát hiện ca thiếu check-in.</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}

function renderMonthCell(value: Dayjs, events: PlannerEvent[]) {
  const dayEvents = events.filter((item) => dayjs(item.start).isSame(value, "day"))
  return (
    <div className="calendar-month-cell">
      <Typography.Text strong>{value.date()}</Typography.Text>
      <div className="calendar-month-cell-events">
        {dayEvents.slice(0, 3).map((event) => (
          <div className={`calendar-cell-pill tone-${event.type}`} key={event.id}>
            <strong>{formatEventTime(event.start, event.end)}</strong>
            <span>{EVENT_TYPE_LABEL[event.type]}</span>
          </div>
        ))}
        {dayEvents.length > 3 ? <Typography.Text type="secondary">+{dayEvents.length - 3} mục</Typography.Text> : null}
      </div>
    </div>
  )
}

function PlannerEventRow({
  item,
  onOpen,
}: {
  item: PlannerEvent
  onOpen: () => void
}) {
  return (
    <List.Item
      actions={[
        <Button key={`view-${item.id}`} icon={<EyeOutlined />} onClick={onOpen}>
          Mở
        </Button>,
      ]}
    >
      <List.Item.Meta
        avatar={resolveEventIcon(item.type)}
        title={(
          <Space size={8} wrap>
            <Tag color={item.tone}>{EVENT_TYPE_LABEL[item.type]}</Tag>
            <span>{item.title}</span>
          </Space>
        )}
        description={(
          <div className="calendar-event-meta">
            <span>{formatEventTime(item.start, item.end)}</span>
            <span>{item.statusLabel}</span>
            <span>{item.summary}</span>
          </div>
        )}
      />
    </List.Item>
  )
}

function resolveEventIcon(type: PlannerEventType) {
  switch (type) {
    case "appointment":
      return <CalendarOutlined />
    case "schedule":
      return <FieldTimeOutlined />
    case "leave":
      return <FileDoneOutlined />
    default:
      return <TeamOutlined />
  }
}

function buildPlannerEvents({
  appointments,
  workSchedules,
  leaveRequests,
  attendances,
  lookups,
}: {
  appointments: Record<string, any>[]
  workSchedules: Record<string, any>[]
  leaveRequests: Record<string, any>[]
  attendances: Record<string, any>[]
  lookups: LookupMap
}) {
  const appointmentEvents: PlannerEvent[] = appointments.map((item) => ({
    id: String(item.id),
    resource: "appointments",
    type: "appointment",
    title: `${lookups.customers?.[item.customerId] || item.customerId || "Khách hàng"}${item.doctorName ? ` · ${item.doctorName}` : ""}`,
    start: String(item.startTime || item.createdAt || ""),
    end: item.endTime ? String(item.endTime) : undefined,
    branchId: item.branchId ? String(item.branchId) : undefined,
    customerId: item.customerId ? String(item.customerId) : undefined,
    tone: EVENT_TYPE_COLOR.appointment,
    statusLabel: getFieldLabel("appointments", "status", String(item.status || "SCHEDULED")),
    summary: [getFieldLabel("appointments", "type", String(item.type || "CONSULTATION")), item.room, item.equipment].filter(Boolean).join(" | "),
  }))

  const scheduleEvents: PlannerEvent[] = workSchedules.map((item) => ({
    id: String(item.id),
    resource: "work-schedules",
    type: "schedule",
    title: `${lookups.staff?.[item.staffId] || item.staffId || "Nhân sự"} · ${item.shiftLabel || "Ca làm"}`,
    start: String(item.startTime || item.workDate || item.createdAt || ""),
    end: item.endTime ? String(item.endTime) : undefined,
    branchId: item.branchId ? String(item.branchId) : undefined,
    staffId: item.staffId ? String(item.staffId) : undefined,
    tone: EVENT_TYPE_COLOR.schedule,
    statusLabel: getFieldLabel("work-schedules", "status", String(item.status || "PLANNED")),
    summary: [item.room, item.note].filter(Boolean).join(" | "),
  }))

  const leaveEvents: PlannerEvent[] = leaveRequests.map((item) => ({
    id: String(item.id),
    resource: "leave-requests",
    type: "leave",
    title: `${lookups.staff?.[item.staffId] || item.staffId || "Nhân sự"} xin nghỉ`,
    start: item.startDate ? dayjs(String(item.startDate)).startOf("day").toISOString() : String(item.createdAt || ""),
    end: item.endDate ? dayjs(String(item.endDate)).endOf("day").toISOString() : undefined,
    branchId: item.branchId ? String(item.branchId) : undefined,
    staffId: item.staffId ? String(item.staffId) : undefined,
    tone: EVENT_TYPE_COLOR.leave,
    statusLabel: getFieldLabel("leave-requests", "status", String(item.status || "pending")),
    summary: [getFieldLabel("leave-requests", "leaveType", String(item.leaveType || "other")), item.reason].filter(Boolean).join(" | "),
  }))

  const attendanceEvents: PlannerEvent[] = attendances.map((item) => ({
    id: String(item.id),
    resource: "attendances",
    type: "attendance",
    title: `${lookups.staff?.[item.staffId] || item.staffId || "Nhân sự"} chấm công`,
    start: buildAttendanceStart(item),
    end: undefined,
    branchId: item.branchId ? String(item.branchId) : undefined,
    staffId: item.staffId ? String(item.staffId) : undefined,
    tone: EVENT_TYPE_COLOR.attendance,
    statusLabel: getFieldLabel("attendances", "status", String(item.status || "present")),
    summary: [item.checkIn ? `Vào ${item.checkIn}` : null, item.checkOut ? `Ra ${item.checkOut}` : null, item.note].filter(Boolean).join(" | "),
  }))

  return [...appointmentEvents, ...scheduleEvents, ...leaveEvents, ...attendanceEvents]
    .filter((item) => item.start)
    .sort((left, right) => dayjs(left.start).valueOf() - dayjs(right.start).valueOf())
}

function buildAttendanceStart(item: Record<string, any>) {
  const dateValue = String(item.date || item.createdAt || "")
  if (!dateValue) return ""
  if (!item.checkIn) return dayjs(dateValue).startOf("day").toISOString()
  const normalizedCheckIn = String(item.checkIn).slice(0, 5)
  return dayjs(`${dateValue} ${normalizedCheckIn}`).toISOString()
}
