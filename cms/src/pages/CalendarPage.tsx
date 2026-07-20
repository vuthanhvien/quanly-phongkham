import {
  CalendarOutlined,
  EyeOutlined,
  FieldTimeOutlined,
  FileDoneOutlined,
  TeamOutlined,
} from "@ant-design/icons"
import dayjs, { type Dayjs } from "dayjs"
import { Button, Calendar, Card, Col, Drawer, Empty, List, Row, Segmented, Select, Space, Tag, Typography } from "antd"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { hasActionAccess } from "../access"
import { api } from "../api"
import { RecordValueView } from "../components/RecordValueView"
import { RecordFormContent } from "../components/RecordFormContent"
import { CustomField, getFieldLabel } from "../models"
import { loadFileLookupMap, loadRelationOptions, type FileLookupMap, type LookupMap } from "../relations"
import { formatEventTime } from "../components/dashboard/utils"
import { buildLocalDateTime, parseClinicDateTime } from "../utils/datetime"
import { getFieldCatalog, getStoredUserRole, getVisibleFieldConfigs, type FieldLayoutConfig, type ViewSettingRecord } from "../view-settings"

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
  doctorStaffId?: string
  customerId?: string
  tone: string
  statusLabel: string
  summary: string
}

interface CalendarQuickDetailState {
  resource: PlannerEvent["resource"]
  eventId: string
  record: Record<string, any> | null
  fields: FieldLayoutConfig[]
  lookups: LookupMap
  fileLookups: FileLookupMap
}

type QuickCreateResource = "appointments" | "work-schedules" | "leave-requests" | "attendances"

interface QuickActionItem {
  key: QuickCreateResource
  title: string
  description: string
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

const QUICK_ACTIONS: QuickActionItem[] = [
  {
    key: "appointments",
    title: "Thêm booking",
    description: "Tạo lịch hẹn mới theo ngày đang chọn.",
  },
  {
    key: "work-schedules",
    title: "Thêm ca làm",
    description: "Phân ca nhanh cho nhân sự trong ngày.",
  },
  {
    key: "leave-requests",
    title: "Thêm nghỉ phép",
    description: "Ghi nhận đơn nghỉ ngay trên lịch.",
  },
  {
    key: "attendances",
    title: "Thêm chấm công",
    description: "Tạo bản ghi check-in cho ngày đang xem.",
  },
]

const DAY_VIEW_START_HOUR = 6
const DAY_VIEW_END_HOUR = 22
const DAY_VIEW_HOUR_COUNT = DAY_VIEW_END_HOUR - DAY_VIEW_START_HOUR
const DAY_VIEW_MINUTES = DAY_VIEW_HOUR_COUNT * 60
const DAY_VIEW_MIN_BLOCK_MINUTES = 30

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
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("day")
  const [selectedDate, setSelectedDate] = useState(dayjs())
  const [events, setEvents] = useState<PlannerEvent[]>([])
  const [lookups, setLookups] = useState<LookupMap>({})
  const [selectedTypes, setSelectedTypes] = useState<PlannerEventType[]>(["appointment"])
  const [doctorFilter, setDoctorFilter] = useState<string | undefined>(undefined)
  const [quickCreateResource, setQuickCreateResource] = useState<QuickCreateResource | null>(null)
  const [quickDetail, setQuickDetail] = useState<CalendarQuickDetailState | null>(null)
  const [quickDetailLoading, setQuickDetailLoading] = useState(false)

  useEffect(() => {
    void loadCalendar()
  }, [])

  async function loadCalendar() {
    const [appointments, workSchedules, leaveRequests, attendances, relationLookups] = await Promise.all([
      fetchListSafe<Record<string, any>>("appointments"),
      fetchListSafe<Record<string, any>>("work-schedules"),
      fetchListSafe<Record<string, any>>("leave-requests"),
      fetchListSafe<Record<string, any>>("attendances"),
      loadRelationOptions(["branchId", "staffId", "customerId", "doctorStaffId", "picStaffId", "roomId", "equipmentId"]).catch(() => ({} as LookupMap)),
    ])

    setLookups(relationLookups)
    setEvents(buildPlannerEvents({ appointments, workSchedules, leaveRequests, attendances, lookups: relationLookups }))
  }

  const filteredEvents = useMemo(
    () =>
      events.filter((item) => {
        if (!selectedTypes.includes(item.type)) return false
        if (doctorFilter && (item.doctorStaffId || item.staffId) !== doctorFilter) return false
        return true
      }),
    [doctorFilter, events, selectedTypes],
  )

  const selectedEvents = useMemo(
    () =>
      filteredEvents
        .filter((item) => parseClinicDateTime(item.start).isSame(selectedDate, "day"))
        .sort((left, right) => parseClinicDateTime(left.start).valueOf() - parseClinicDateTime(right.start).valueOf()),
    [filteredEvents, selectedDate],
  )

  const weekDays = useMemo(() => {
    const start = selectedDate.startOf("week")
    return Array.from({ length: 7 }, (_, index) => start.add(index, "day"))
  }, [selectedDate])

  const weekEvents = useMemo(
    () => filteredEvents.filter((item) => parseClinicDateTime(item.start).isSame(selectedDate, "week")),
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

  const doctorOptions = useMemo(
    () =>
      Object.entries(lookups["staff-doctor"] || {}).map(([value, label]) => ({
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

  const visibleQuickActions = useMemo(
    () => QUICK_ACTIONS.filter((item) => hasActionAccess(item.key, "create")),
    [],
  )

  const quickDetailTitle = quickDetail?.record
    ? resolveQuickDetailTitle(quickDetail.resource, quickDetail.record)
    : "Xem nhanh lịch"

  return (
    <>
      <div className="page-header">
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>Calendar điều phối</Typography.Title>
          <Typography.Text type="secondary">
            Quản lý booking với khách, ca làm, nghỉ phép và chấm công trên cùng một màn hình.
          </Typography.Text>
        </div>
        <div className="calendar-header-controls">
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
            placeholder="Lọc bác sĩ"
            options={doctorOptions}
            value={doctorFilter}
            onChange={(value) => setDoctorFilter(value)}
          />
          <Select
            className="calendar-planner-types"
            mode="multiple"
            options={EVENT_TYPE_OPTIONS}
            value={selectedTypes}
            onChange={(value) => setSelectedTypes(value as PlannerEventType[])}
          />
        </div>
      </div>

      <div className="calendar-planner-layout">
        <div className="calendar-planner-main">
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
                fullCellRender={(value) => renderMonthCell(value, filteredEvents, openQuickDetail)}
              />
            ) : calendarMode === "week" ? (
              <div className="calendar-week-grid">
                {weekDays.map((date) => {
                  const dayEvents = weekEvents
                    .filter((item) => parseClinicDateTime(item.start).isSame(date, "day"))
                    .sort((left, right) => parseClinicDateTime(left.start).valueOf() - parseClinicDateTime(right.start).valueOf())
                  return (
                    <div
                      key={date.format("YYYY-MM-DD")}
                      className={`calendar-week-column${date.isSame(selectedDate, "day") ? " is-selected" : ""}`}
                      onClick={() => setSelectedDate(date)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          setSelectedDate(date)
                        }
                      }}
                      role="button"
                      tabIndex={0}
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
                            <button
                              key={event.id}
                              className={`calendar-event-chip tone-${event.type}`}
                              type="button"
                              onClick={(clickEvent) => {
                                clickEvent.stopPropagation()
                                void openQuickDetail(event)
                              }}
                            >
                              <strong>{formatEventTime(event.start, event.end)}</strong>
                              <span>{event.title}</span>
                            </button>
                          ))
                        )}
                        {dayEvents.length > 5 ? <Typography.Text type="secondary">+{dayEvents.length - 5} mục khác</Typography.Text> : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <DayPlannerTimeline
                events={selectedEvents}
                selectedDate={selectedDate}
                onOpen={(item) => navigate(`/${item.resource}/${item.id}`)}
                onOpenQuickDetail={(item) => void openQuickDetail(item)}
              />
            )}
          </Card>
        </div>

        <div className="calendar-planner-sidebar">
          <div className="calendar-planner-sticky">
            <Card className="glass-card spacious-card" title={`Tổng quan ngày ${selectedDate.format("DD/MM/YYYY")}`}>
              <div className="calendar-summary-grid">
                <div className="calendar-summary-card">
                  <Typography.Text type="secondary">Booking trong ngày</Typography.Text>
                  <Typography.Title level={3}>{countsForSelectedDay.appointment}</Typography.Title>
                </div>
                <div className="calendar-summary-card">
                  <Typography.Text type="secondary">Ca làm trong ngày</Typography.Text>
                  <Typography.Title level={3}>{countsForSelectedDay.schedule}</Typography.Title>
                </div>
                <div className="calendar-summary-card">
                  <Typography.Text type="secondary">Nhân sự xin nghỉ</Typography.Text>
                  <Typography.Title level={3}>{countsForSelectedDay.leave}</Typography.Title>
                </div>
                <div className="calendar-summary-card">
                  <Typography.Text type="secondary">Bản ghi chấm công</Typography.Text>
                  <Typography.Title level={3}>{countsForSelectedDay.attendance}</Typography.Title>
                </div>
              </div>
            </Card>

            <Card className="glass-card spacious-card" title={`Chi tiết ngày ${selectedDate.format("DD/MM/YYYY")}`}>
              {visibleQuickActions.length > 0 ? (
                <div className="calendar-quick-actions">
                  {visibleQuickActions.map((item) => (
                    <button
                      key={item.key}
                      className="calendar-quick-action"
                      type="button"
                      onClick={() => setQuickCreateResource(item.key)}
                    >
                      <strong>{item.title}</strong>
                      <span>{item.description}</span>
                    </button>
                  ))}
                </div>
              ) : null}
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
                          <button className="calendar-event-link" type="button" onClick={() => void openQuickDetail(item)}>
                            {item.title}
                          </button>
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
          </div>
        </div>
      </div>

      <Drawer
        className="quick-drawer"
        destroyOnClose
        maskClosable={false}
        open={Boolean(quickCreateResource)}
        placement="right"
        title={quickCreateResource ? `Thêm nhanh ${resolveQuickCreateTitle(quickCreateResource)}` : "Thêm nhanh"}
        width={620}
        onClose={() => setQuickCreateResource(null)}
      >
        {quickCreateResource ? (
          <RecordFormContent
            compact
            initialValues={buildQuickCreateInitialValues(quickCreateResource, selectedDate)}
            resource={quickCreateResource}
            onCancel={() => setQuickCreateResource(null)}
            onSuccess={() => {
              setQuickCreateResource(null)
              void loadCalendar()
            }}
          />
        ) : null}
      </Drawer>

      <Drawer
        className="quick-drawer"
        destroyOnClose
        maskClosable={false}
        open={Boolean(quickDetail || quickDetailLoading)}
        placement="right"
        title={quickDetail ? quickDetailTitle : "Đang tải nhanh"}
        width={760}
        extra={
          quickDetail ? (
            <Button icon={<EyeOutlined />} onClick={() => navigate(`/${quickDetail.resource}/${quickDetail.eventId}`)}>
              Mở chi tiết
            </Button>
          ) : null
        }
        onClose={() => {
          setQuickDetail(null)
          setQuickDetailLoading(false)
        }}
      >
        {quickDetail ? (
          <div className="detail-grid">
            <Row gutter={[16, 16]}>
              {quickDetail.fields.map((field) => (
                <Col key={field.key} span={detailWidthToSpan(field.width)} xs={24}>
                  <div className="detail-item">
                    <div className="detail-item-label">
                      {field.description ? (
                        <Space direction="vertical" size={0}>
                          <span>{field.label}</span>
                          <Typography.Text type="secondary">{field.description}</Typography.Text>
                        </Space>
                      ) : (
                        field.label
                      )}
                    </div>
                    <div className="detail-item-content">
                      <RecordValueView
                        field={field}
                        fileLookups={quickDetail.fileLookups}
                        lookups={quickDetail.lookups}
                        value={quickDetail.record?.[field.key] ?? quickDetail.record?.customFields?.[field.key]}
                      />
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </div>
        ) : null}
      </Drawer>
    </>
  )

  async function openQuickDetail(event: PlannerEvent) {
    setQuickDetailLoading(true)
    try {
      const activeRole = getStoredUserRole()
      const [recordResponse, fieldResponse, viewResponse] = await Promise.all([
        api.get(`/records/${event.resource}/${event.id}`),
        api.get("/settings/custom-fields", { params: { entityType: event.resource } }).catch(() => ({ data: { data: [] } })),
        api.get("/settings/views", { params: { entityType: event.resource } }).catch(() => ({ data: { data: [] } })),
      ])
      const record = recordResponse.data.data as Record<string, any>
      const customFields = fieldResponse.data.data.filter((field: CustomField) => field.isActive)
      const catalog = getFieldCatalog(event.resource, customFields)
      Object.keys(record?.customFields || {}).forEach((key) => {
        if (catalog.some((field) => field.key === key)) return
        catalog.push({ key, label: key })
      })
      const detailFields = getVisibleFieldConfigs(
        catalog,
        viewResponse.data.data as ViewSettingRecord[],
        "DETAIL",
        activeRole,
      )
      const [detailLookups, nextFileLookups] = await Promise.all([
        loadRelationOptions(detailFields),
        loadFileLookupMap(),
      ])
      setQuickDetail({
        resource: event.resource,
        eventId: event.id,
        record,
        fields: detailFields,
        lookups: detailLookups,
        fileLookups: nextFileLookups,
      })
    } finally {
      setQuickDetailLoading(false)
    }
  }
}

function DayPlannerTimeline({
  events,
  selectedDate,
  onOpen,
  onOpenQuickDetail,
}: {
  events: PlannerEvent[]
  selectedDate: Dayjs
  onOpen: (item: PlannerEvent) => void
  onOpenQuickDetail: (item: PlannerEvent) => void
}) {
  const hourSlots = Array.from({ length: DAY_VIEW_HOUR_COUNT + 1 }, (_, index) => DAY_VIEW_START_HOUR + index)
  const timelineEvents = events.map((event) => projectTimelineEvent(event, selectedDate)).filter(Boolean)

  return (
    <div className="calendar-day-timeline">
      <div className="calendar-day-timeline__grid">
        {hourSlots.map((hour) => (
          <div className="calendar-day-timeline__slot" key={hour}>
            <div className="calendar-day-timeline__label">{`${String(hour).padStart(2, "0")}:00`}</div>
            <div className="calendar-day-timeline__line" />
          </div>
        ))}
        <div className="calendar-day-timeline__events">
          {timelineEvents.map((event) => (
            <button
              className={`calendar-day-event tone-${event.type}`}
              key={event.id}
              style={{ top: `${event.topPercent}%`, height: `${event.heightPercent}%` }}
              type="button"
              onClick={() => onOpenQuickDetail(event)}
            >
              <div className="calendar-day-event__time">{formatEventTime(event.start, event.end)}</div>
              <strong>{event.title}</strong>
              <span>{event.statusLabel}</span>
              {event.summary ? <small>{event.summary}</small> : null}
              <span className="calendar-day-event__link" onClick={(clickEvent) => { clickEvent.stopPropagation(); onOpen(event) }}>
                Mở chi tiết
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function projectTimelineEvent(event: PlannerEvent, selectedDate: Dayjs) {
  const dayStart = selectedDate.hour(DAY_VIEW_START_HOUR).minute(0).second(0).millisecond(0)
  const dayEnd = selectedDate.hour(DAY_VIEW_END_HOUR).minute(0).second(0).millisecond(0)
  const eventStart = parseClinicDateTime(event.start)
  const rawEnd = event.end ? parseClinicDateTime(event.end) : eventStart.add(DAY_VIEW_MIN_BLOCK_MINUTES, "minute")
  const eventEnd = rawEnd.isAfter(eventStart) ? rawEnd : eventStart.add(DAY_VIEW_MIN_BLOCK_MINUTES, "minute")
  const clippedStart = eventStart.isBefore(dayStart) ? dayStart : eventStart
  const clippedEndBase = eventEnd.isAfter(dayEnd) ? dayEnd : eventEnd
  const clippedEnd = clippedEndBase.isAfter(clippedStart)
    ? clippedEndBase
    : clippedStart.add(DAY_VIEW_MIN_BLOCK_MINUTES, "minute").isAfter(dayEnd)
      ? dayEnd
      : clippedStart.add(DAY_VIEW_MIN_BLOCK_MINUTES, "minute")

  const startMinutes = clippedStart.diff(dayStart, "minute")
  const durationMinutes = Math.max(DAY_VIEW_MIN_BLOCK_MINUTES, clippedEnd.diff(clippedStart, "minute"))

  return {
    ...event,
    topPercent: (startMinutes / DAY_VIEW_MINUTES) * 100,
    heightPercent: (Math.min(durationMinutes, DAY_VIEW_MINUTES - startMinutes) / DAY_VIEW_MINUTES) * 100,
  }
}

function renderMonthCell(value: Dayjs, events: PlannerEvent[], onOpen: (event: PlannerEvent) => void) {
  const dayEvents = events.filter((item) => parseClinicDateTime(item.start).isSame(value, "day"))
  return (
    <div className="calendar-month-cell">
      <Typography.Text strong>{value.date()}</Typography.Text>
      <div className="calendar-month-cell-events">
        {dayEvents.slice(0, 3).map((event) => (
          <button
            className={`calendar-cell-pill tone-${event.type}`}
            key={event.id}
            type="button"
            onClick={(clickEvent) => {
              clickEvent.stopPropagation()
              void onOpen(event)
            }}
          >
            <strong>{formatEventTime(event.start, event.end)}</strong>
            <span>{EVENT_TYPE_LABEL[event.type]}</span>
          </button>
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

function resolveQuickCreateTitle(resource: QuickCreateResource) {
  switch (resource) {
    case "appointments":
      return "Booking"
    case "work-schedules":
      return "Ca làm"
    case "leave-requests":
      return "Nghỉ phép"
    default:
      return "Chấm công"
  }
}

function resolveQuickDetailTitle(resource: PlannerEvent["resource"], record: Record<string, any>) {
  return (
    record.fullName ||
    record.name ||
    record.title ||
    record.code ||
    record.email ||
    entityLabelByResource(resource)
  )
}

function entityLabelByResource(resource: PlannerEvent["resource"]) {
  switch (resource) {
    case "appointments":
      return "Booking"
    case "work-schedules":
      return "Ca làm"
    case "leave-requests":
      return "Nghỉ phép"
    default:
      return "Chấm công"
  }
}

function detailWidthToSpan(width?: FieldLayoutConfig["width"]) {
  switch (width) {
    case "25":
      return 6
    case "33":
      return 8
    case "50":
      return 12
    case "66":
      return 16
    case "100":
    default:
      return 24
  }
}

function buildQuickCreateInitialValues(resource: QuickCreateResource, selectedDate: Dayjs) {
  const selectedDay = selectedDate.format("YYYY-MM-DD")

  switch (resource) {
    case "appointments":
      return {
        type: "CONSULTATION",
        status: "SCHEDULED",
        startTime: buildLocalDateTime(selectedDate, 9, 0),
        endTime: buildLocalDateTime(selectedDate, 10, 0),
      }
    case "work-schedules":
      return {
        workDate: selectedDay,
        shiftLabel: "Ca sáng",
        status: "PLANNED",
        startTime: buildLocalDateTime(selectedDate, 8, 0),
        endTime: buildLocalDateTime(selectedDate, 17, 0),
      }
    case "leave-requests":
      return {
        startDate: selectedDay,
        endDate: selectedDay,
        leaveType: "annual",
        status: "pending",
      }
    default:
      return {
        date: selectedDay,
        checkIn: "08:00",
        status: "present",
      }
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
    title: `${lookups.customers?.[item.customerId] || item.customerId || "Khách hàng"}${item.doctorStaffId ? ` · ${lookups["staff-doctor"]?.[item.doctorStaffId] || lookups.staff?.[item.doctorStaffId] || item.doctorStaffId}` : ""}`,
    start: String(item.startTime || item.createdAt || ""),
    end: item.endTime ? String(item.endTime) : undefined,
    branchId: item.branchId ? String(item.branchId) : undefined,
    customerId: item.customerId ? String(item.customerId) : undefined,
    staffId: item.picStaffId ? String(item.picStaffId) : item.doctorStaffId ? String(item.doctorStaffId) : undefined,
    doctorStaffId: item.doctorStaffId ? String(item.doctorStaffId) : undefined,
    tone: EVENT_TYPE_COLOR.appointment,
    statusLabel: getFieldLabel("appointments", "status", String(item.status || "SCHEDULED")),
    summary: [
      getFieldLabel("appointments", "type", String(item.type || "CONSULTATION")),
      item.roomId ? lookups.rooms?.[item.roomId] || item.roomId : null,
      item.equipmentId ? lookups.equipments?.[item.equipmentId] || item.equipmentId : null,
      item.picStaffId ? `PIC: ${lookups["staff-staff"]?.[item.picStaffId] || lookups.staff?.[item.picStaffId] || item.picStaffId}` : null,
    ].filter(Boolean).join(" | "),
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
    doctorStaffId: item.staffId ? String(item.staffId) : undefined,
    tone: EVENT_TYPE_COLOR.schedule,
    statusLabel: getFieldLabel("work-schedules", "status", String(item.status || "PLANNED")),
    summary: [item.roomId ? lookups.rooms?.[item.roomId] || item.roomId : null, item.note].filter(Boolean).join(" | "),
  }))

  const leaveEvents: PlannerEvent[] = leaveRequests.map((item) => ({
    id: String(item.id),
    resource: "leave-requests",
    type: "leave",
    title: `${lookups.staff?.[item.staffId] || item.staffId || "Nhân sự"} xin nghỉ`,
    start: item.startDate ? `${String(item.startDate)}T00:00` : String(item.createdAt || ""),
    end: item.endDate ? `${String(item.endDate)}T23:59` : undefined,
    branchId: item.branchId ? String(item.branchId) : undefined,
    staffId: item.staffId ? String(item.staffId) : undefined,
    doctorStaffId: item.staffId ? String(item.staffId) : undefined,
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
    doctorStaffId: item.staffId ? String(item.staffId) : undefined,
    tone: EVENT_TYPE_COLOR.attendance,
    statusLabel: getFieldLabel("attendances", "status", String(item.status || "present")),
    summary: [item.checkIn ? `Vào ${item.checkIn}` : null, item.checkOut ? `Ra ${item.checkOut}` : null, item.note].filter(Boolean).join(" | "),
  }))

  return [...appointmentEvents, ...scheduleEvents, ...leaveEvents, ...attendanceEvents]
    .filter((item) => item.start)
    .sort((left, right) => parseClinicDateTime(left.start).valueOf() - parseClinicDateTime(right.start).valueOf())
}

function buildAttendanceStart(item: Record<string, any>) {
  const dateValue = String(item.date || item.createdAt || "")
  if (!dateValue) return ""
  if (!item.checkIn) return `${dateValue}T00:00`
  const normalizedCheckIn = String(item.checkIn).slice(0, 5)
  return `${dateValue}T${normalizedCheckIn}`
}
