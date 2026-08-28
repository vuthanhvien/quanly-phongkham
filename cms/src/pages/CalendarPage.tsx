import {
  CalendarOutlined,
  EyeOutlined,
  FieldTimeOutlined,
  FileDoneOutlined,
  TeamOutlined,
} from "@ant-design/icons"
import FullCalendar from "@fullcalendar/react"
import Timeline, { DateHeader, SidebarHeader, TimelineHeaders } from "react-calendar-timeline"
import "react-calendar-timeline/style.css"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"
import type { DateClickArg, EventResizeDoneArg } from "@fullcalendar/interaction"
import viLocale from "@fullcalendar/core/locales/vi"
import type { DateSelectArg, EventClickArg, EventDropArg } from "@fullcalendar/core"
import dayjs, { type Dayjs } from "dayjs"
import { Avatar, Button, Card, Col, Empty, List, Modal, Row, Segmented, Select, Space, Spin, Tag, Typography, message } from "antd"
import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { hasActionAccess } from "../access"
import { api, resolveFileUrl } from "../api"
import { RecordValueView } from "../components/RecordValueView"
import { RecordFormContent } from "../components/RecordFormContent"
import { CustomField, getFieldLabel } from "../models"
import { loadFileLookupMap, loadRelationOptions, type FileLookupMap, type LookupMap } from "../relations"
import { formatEventTime } from "../components/dashboard/utils"
import { buildLocalDateTime, clinicNow, formatClinicDateTimeForApi, parseClinicDateTime } from "../utils/datetime"
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
  customerName?: string
  doctorName?: string
  doctorAvatarUrl?: string
  roomName?: string
  staffName?: string
  staffAvatarUrl?: string
  staffType?: string
  shiftLabel?: string
  recordId?: string
  isRecurring?: boolean
}

interface CalendarQuickDetailState {
  resource: PlannerEvent["resource"]
  eventId: string
  record: Record<string, any> | null
  fields: FieldLayoutConfig[]
  lookups: LookupMap
  fileLookups: FileLookupMap
}

interface CalendarSourceData {
  appointments: Record<string, any>[]
  workSchedules: Record<string, any>[]
  leaveRequests: Record<string, any>[]
  attendances: Record<string, any>[]
  staffRows: Record<string, any>[]
  customerRows: Record<string, any>[]
  roomRows: Record<string, any>[]
}

interface ScheduleDisplayWindow {
  start: Dayjs
  end: Dayjs
}

interface DoctorScheduleAvailability {
  schedule: PlannerEvent
  attendance?: Record<string, any>
  leaveRequest?: Record<string, any>
}

type DoctorTimelineRowStatus = "present" | "absent" | "future"

type QuickCreateResource = "appointments" | "work-schedules" | "leave-requests" | "attendances"

interface QuickActionItem {
  key: QuickCreateResource
  title: string
  description: string
}

const EVENT_TYPE_OPTIONS: Array<{ label: string; value: PlannerEventType }> = [
  { label: "Lịch hẹn", value: "appointment" },
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
]

const DAY_VIEW_START_HOUR = 6
const DAY_VIEW_END_HOUR = 21
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
  const [toast, toastContextHolder] = message.useMessage()
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("day")
  const [selectedDate, setSelectedDate] = useState(clinicNow())
  const [calendarSource, setCalendarSource] = useState<CalendarSourceData | null>(null)
  const [calendarLoading, setCalendarLoading] = useState(true)
  const calendarRequestId = useRef(0)
  const [lookups, setLookups] = useState<LookupMap>({})
  const [doctorFilter, setDoctorFilter] = useState<string | undefined>(undefined)
  const [quickCreateResource, setQuickCreateResource] = useState<QuickCreateResource | null>(null)
  const [quickCreateRange, setQuickCreateRange] = useState<{ start: Dayjs; end: Dayjs } | null>(null)
  const [quickCreateInitialValues, setQuickCreateInitialValues] = useState<Record<string, unknown> | undefined>()
  const [quickEdit, setQuickEdit] = useState<{ resource: QuickCreateResource; id: string } | null>(null)
  const [quickDetail, setQuickDetail] = useState<CalendarQuickDetailState | null>(null)
  const [quickDetailLoading, setQuickDetailLoading] = useState(false)

  useEffect(() => {
    void loadCalendar()
  }, [])

  async function loadCalendar() {
    const requestId = ++calendarRequestId.current
    setCalendarLoading(true)
    const [appointments, workSchedules, leaveRequests, attendances, staffRows, customerRows, roomRows, relationLookups] = await Promise.all([
      fetchListSafe<Record<string, any>>("appointments"),
      fetchListSafe<Record<string, any>>("work-schedules"),
      fetchListSafe<Record<string, any>>("leave-requests"),
      fetchListSafe<Record<string, any>>("attendances"),
      // Day timeline renders a row for every active staff member, including
      // people with no booking on the selected day.
      fetchListSafe<Record<string, any>>("staff", 2000),
      fetchListSafe<Record<string, any>>("customers"),
      fetchListSafe<Record<string, any>>("rooms"),
      loadRelationOptions(["branchId", "staffId", "customerId", "doctorStaffId", "picStaffId", "roomId", "equipmentId"]).catch(() => ({} as LookupMap)),
    ])

    if (requestId !== calendarRequestId.current) return
    setLookups(relationLookups)
    setCalendarSource({
      appointments,
      workSchedules,
      leaveRequests,
      attendances,
      staffRows,
      customerRows,
      roomRows,
    })
    setCalendarLoading(false)
  }

  const scheduleDisplayWindow = useMemo(
    () => getScheduleDisplayWindow(selectedDate, calendarMode),
    [calendarMode, selectedDate],
  )

  const events = useMemo(
    () => calendarSource
      ? buildPlannerEvents({ ...calendarSource, lookups, scheduleDisplayWindow })
      : [],
    [calendarSource, lookups, scheduleDisplayWindow],
  )

  // The calendar is a booking navigator. Staffing, leave, and attendance stay
  // in the selected-day panel so they do not crowd the calendar grid.
  const calendarEvents = useMemo(
    () => events.filter((item) => item.type === "appointment" && (!doctorFilter || (item.doctorStaffId || item.staffId) === doctorFilter)),
    [doctorFilter, events],
  )

  const selectedEvents = useMemo(
    () =>
      events
        .filter((item) => parseClinicDateTime(item.start).isSame(selectedDate, "day"))
        .sort((left, right) => parseClinicDateTime(left.start).valueOf() - parseClinicDateTime(right.start).valueOf()),
    [events, selectedDate],
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

  const selectedBookingEvents = useMemo(
    () =>
      calendarEvents
        .filter((item) => parseClinicDateTime(item.start).isSame(selectedDate, "day"))
        .sort((left, right) => parseClinicDateTime(left.start).valueOf() - parseClinicDateTime(right.start).valueOf()),
    [calendarEvents, selectedDate],
  )

  const selectedDoctorScheduleEvents = useMemo(
    () =>
      selectedEvents
        .filter((item) => item.type === "schedule" && item.staffType === "DOCTOR" && (!doctorFilter || item.staffId === doctorFilter))
        .sort((left, right) => parseClinicDateTime(left.start).valueOf() - parseClinicDateTime(right.start).valueOf()),
    [doctorFilter, selectedEvents],
  )

  const doctorScheduleAvailability = useMemo(
    () => getDoctorScheduleAvailability({
      schedules: selectedDoctorScheduleEvents,
      attendances: calendarSource?.attendances || [],
      leaveRequests: calendarSource?.leaveRequests || [],
      selectedDate,
    }),
    [calendarSource?.attendances, calendarSource?.leaveRequests, selectedDate, selectedDoctorScheduleEvents],
  )

  const scheduledDoctorCount = useMemo(
    () => new Set(doctorScheduleAvailability.map((item) => item.schedule.staffId)).size,
    [doctorScheduleAvailability],
  )
  const checkedInDoctorCount = useMemo(
    () => new Set(doctorScheduleAvailability.filter((item) => item.attendance?.checkIn).map((item) => item.schedule.staffId)).size,
    [doctorScheduleAvailability],
  )
  const doctorOnLeaveCount = useMemo(
    () => new Set(doctorScheduleAvailability.filter((item) => item.leaveRequest).map((item) => item.schedule.staffId)).size,
    [doctorScheduleAvailability],
  )
  const doctorRows = useMemo(
    () => (calendarSource?.staffRows || []).filter((staff) => String(staff.type) === "DOCTOR" && (!doctorFilter || String(staff.id) === doctorFilter)),
    [calendarSource?.staffRows, doctorFilter],
  )
  const doctorRowStatuses = useMemo(() => {
    const statusByStaffId = new Map<string, DoctorTimelineRowStatus>()
    const isFutureDate = selectedDate.startOf("day").isAfter(clinicNow().startOf("day"))
    doctorScheduleAvailability.forEach(({ schedule, attendance }) => {
      if (!schedule.staffId) return
      statusByStaffId.set(String(schedule.staffId), isFutureDate ? "future" : attendance?.checkIn ? "present" : "absent")
    })
    return statusByStaffId
  }, [doctorScheduleAvailability, selectedDate])

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

  const fullCalendarEvents = useMemo(
    () => calendarEvents.map((event) => ({
      id: event.id,
      title: event.title,
      // Datetimes from the API are serialized with `Z`. Calendar slots are
      // clinic wall-clock times, not UTC instants; passing the raw ISO string
      // makes FullCalendar add the browser offset (06:30 → 13:30 in VN).
      start: parseClinicDateTime(event.start).format("YYYY-MM-DDTHH:mm"),
      end: event.end ? parseClinicDateTime(event.end).format("YYYY-MM-DDTHH:mm") : undefined,
      allDay: event.type === "leave",
      backgroundColor: resolveFullCalendarEventColor(event.type),
      borderColor: resolveFullCalendarEventColor(event.type),
      textColor: "#fff",
      editable: (event.type === "appointment" || event.type === "schedule") && !event.isRecurring,
      extendedProps: { plannerEvent: event },
    })),
    [calendarEvents],
  )

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
      {toastContextHolder}
      <div className="page-header">
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>Calendar điều phối</Typography.Title>
        </div>
        <div className="calendar-header-controls">
          <Select
            allowClear
            className="calendar-planner-select"
            placeholder="Lọc bác sĩ"
            options={doctorOptions}
            value={doctorFilter}
            onChange={(value) => setDoctorFilter(value)}
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
                <Segmented<CalendarMode>
                  options={[
                    { label: "Ngày", value: "day" },
                    { label: "Tuần", value: "week" },
                    { label: "Tháng", value: "month" },
                  ]}
                  value={calendarMode}
                  onChange={(value) => setCalendarMode(value)}
                />
                <Button onClick={() => shiftCalendar(-1)}>Trước</Button>
                <Typography.Text className="calendar-range-label">{calendarRangeLabel}</Typography.Text>
                <Button onClick={() => shiftCalendar(1)}>Sau</Button>
                <Button onClick={() => setSelectedDate(clinicNow())}>Hôm nay</Button>
              </Space>
            )}
          >
            <div className="coordination-calendar">
              {calendarMode === "day" ? (
                <StaffDayCalendar
                  events={calendarEvents}
                  selectedDate={selectedDate}
                  staffRows={doctorRows}
                  rowStatuses={doctorRowStatuses}
                  onEventClick={openQuickEdit}
                  onEventMove={(event, start, staffId) => void updateAppointmentFromTimeline(event, start, staffId)}
                  onEventResize={(event, start, end) => void updateAppointmentFromTimeline(event, start, event.doctorStaffId || event.staffId, end)}
                  onTimeSelect={(staffId, start) => openBookingAtTimelineSlot(staffId, start)}
                  onOpenDoctor={(staffId) => navigate(`/staff/${staffId}/full`)}
                />
              ) : (
                <FullCalendar
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  key={`${calendarMode}-${selectedDate.format("YYYY-MM-DD")}`}
                  initialView={calendarMode === "month" ? "dayGridMonth" : "timeGridWeek"}
                  initialDate={selectedDate.toDate()}
                  locale={viLocale}
                  timeZone="local"
                  firstDay={1}
                  headerToolbar={false}
                  height="100%"
                  events={fullCalendarEvents}
                  editable
                  selectable
                  selectMirror
                  slotDuration="00:15:00"
                  snapDuration="00:15:00"
                  slotMinTime="06:00:00"
                  slotMaxTime="21:00:00"
                  allDaySlot={calendarMode === "month"}
                  nowIndicator
                  eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
                  select={(arg) => handleTimeSelect(arg)}
                  dateClick={(arg) => handleDateClick(arg)}
                  eventClick={(arg) => handleCalendarEventClick(arg)}
                  eventDrop={(arg) => void handleEventTimeChange(arg)}
                  eventResize={(arg) => void handleEventTimeChange(arg)}
                />
              )}
              {calendarLoading ? <div className="calendar-loading-overlay"><Spin size="large" tip="Đang tải lịch..." /></div> : null}
            </div>
          </Card>
        </div>

        <div className="calendar-planner-sidebar">
          <div className="calendar-planner-sticky">
            <Card className="glass-card spacious-card" title={`Tổng quan ngày ${selectedDate.format("DD/MM/YYYY")}`}>
              <div className="calendar-summary-grid">
                <div className="calendar-summary-card">
                  <Typography.Text type="secondary">Booking trong ngày</Typography.Text>
                  <Typography.Title level={3}>{selectedBookingEvents.length}</Typography.Title>
                </div>
                <div className="calendar-summary-card">
                  <Typography.Text type="secondary">Bác sĩ có lịch</Typography.Text>
                  <Typography.Title level={3}>{scheduledDoctorCount}</Typography.Title>
                </div>
                <div className="calendar-summary-card">
                  <Typography.Text type="secondary">Bác sĩ đã đến</Typography.Text>
                  <Typography.Title level={3}>{checkedInDoctorCount}</Typography.Title>
                </div>
                <div className="calendar-summary-card">
                  <Typography.Text type="secondary">Bác sĩ nghỉ phép</Typography.Text>
                  <Typography.Title level={3}>{doctorOnLeaveCount}</Typography.Title>
                </div>
              </div>
            </Card>

            <Card className="glass-card spacious-card" title={`Booking ngày ${selectedDate.format("DD/MM/YYYY")}`}>
              {visibleQuickActions.length > 0 ? (
                <div className="calendar-quick-actions">
                  {visibleQuickActions.map((item) => (
                    <button
                      key={item.key}
                      className="calendar-quick-action"
                      type="button"
                      onClick={() => {
                        setQuickCreateRange(null)
                        setQuickCreateInitialValues(buildQuickCreateInitialValues(item.key, selectedDate, null))
                        setQuickCreateResource(item.key)
                      }}
                    >
                      <strong>{item.title}</strong>
                      <span>{item.description}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              <List
                locale={{ emptyText: <Empty description="Ngày này chưa có booking" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                dataSource={selectedBookingEvents}
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
                          <Tag color={item.tone}>Booking</Tag>
                          <button className="calendar-event-link" type="button" onClick={() => openQuickEdit(item)}>
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

            <Card className="glass-card spacious-card" title="Lịch làm việc bác sĩ">
              {doctorScheduleAvailability.length === 0 ? (
                <Empty description="Chưa có lịch làm việc của bác sĩ" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <div className="calendar-staff-schedule-list">
                  {doctorScheduleAvailability.map(({ schedule: item, attendance, leaveRequest }) => (
                    <div
                      key={`schedule-${item.id}`}
                      className="calendar-staff-schedule-card"
                    >
                      <div className="calendar-staff-schedule-card__head">
                        <Avatar
                          className="calendar-staff-schedule-card__avatar"
                          icon={<TeamOutlined />}
                          size={32}
                          src={item.staffAvatarUrl ? resolveFileUrl(item.staffAvatarUrl) : undefined}
                        />
                        <div className="calendar-staff-schedule-card__copy">
                          <strong>{item.staffName || item.title}</strong>
                          <span>{item.shiftLabel || "Ca làm"}</span>
                        </div>
                        <Tag color={leaveRequest ? "orange" : attendance?.checkIn ? "green" : "default"}>
                          {leaveRequest ? "Nghỉ phép" : attendance?.checkIn ? `Đã đến ${formatAttendanceTime(attendance.checkIn)}` : "Chưa đến"}
                        </Tag>
                      </div>
                      <div className="calendar-staff-schedule-card__meta">
                        <span>{formatEventTime(item.start, item.end)}</span>
                        <span>{formatWorkDuration(item.start, item.end)}</span>
                        {item.roomName ? <span>{item.roomName}</span> : null}
                        {leaveRequest ? <span>{getFieldLabel("leave-requests", "status", String(leaveRequest.status || "approved"))}</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      <Modal
        className="quick-drawer"
        destroyOnHidden
        maskClosable={false}
        open={Boolean(quickCreateResource)}
        title={quickCreateResource ? `Thêm nhanh ${resolveQuickCreateTitle(quickCreateResource)}` : "Thêm nhanh"}
        width={620}
        footer={null}
        onCancel={() => {
          setQuickCreateResource(null)
          setQuickCreateRange(null)
          setQuickCreateInitialValues(undefined)
        }}
      >
        {quickCreateResource ? (
          <RecordFormContent
            compact
            initialValues={quickCreateInitialValues}
            resource={quickCreateResource}
            notifyOnSuccess={false}
            onCancel={() => {
              setQuickCreateResource(null)
              setQuickCreateRange(null)
              setQuickCreateInitialValues(undefined)
            }}
            onSuccess={() => {
              setQuickCreateResource(null)
              setQuickCreateRange(null)
              setQuickCreateInitialValues(undefined)
              toast.success("Đã lưu dữ liệu")
              void loadCalendar()
            }}
          />
        ) : null}
      </Modal>

      <Modal
        className="quick-drawer"
        destroyOnHidden
        maskClosable={false}
        open={Boolean(quickEdit)}
        title={quickEdit ? `Chỉnh sửa ${resolveQuickCreateTitle(quickEdit.resource)}` : "Chỉnh sửa"}
        width={620}
        footer={null}
        onCancel={() => setQuickEdit(null)}
      >
        {quickEdit ? (
          <RecordFormContent
            compact
            id={quickEdit.id}
            resource={quickEdit.resource}
            notifyOnSuccess={false}
            onCancel={() => setQuickEdit(null)}
            onSuccess={() => {
              setQuickEdit(null)
              toast.success("Đã cập nhật dữ liệu")
              void loadCalendar()
            }}
          />
        ) : null}
      </Modal>

      <Modal
        className="quick-drawer"
        destroyOnHidden
        maskClosable={false}
        open={Boolean(quickDetail || quickDetailLoading)}
        title={quickDetail ? quickDetailTitle : "Đang tải nhanh"}
        width={760}
        footer={
          quickDetail ? (
            <Button icon={<EyeOutlined />} onClick={() => navigate(`/${quickDetail.resource}/${quickDetail.eventId}`)}>
              Mở chi tiết
            </Button>
          ) : null
        }
        onCancel={() => {
          setQuickDetail(null)
          setQuickDetailLoading(false)
        }}
      >
        {quickDetail ? (
          <div className="detail-grid">
            <Row gutter={[16, 16]}>
              {quickDetail.fields.map((field) => (
                <Col key={field.key} xs={24} md={detailWidthToSpan(field.width)}>
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
      </Modal>
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
      // A booking can reference a customer that is absent from the current
      // relation list (for example, an archived customer). Keep the detail
      // view human-readable instead of falling back to its UUID.
      if (event.resource === "appointments" && event.customerId && !detailLookups.customers?.[event.customerId]) {
        const cachedCustomer = calendarSource?.customerRows.find((customer) => String(customer.id) === event.customerId)
        const customer = cachedCustomer || await api
          .get(`/records/customers/${event.customerId}`)
          .then((response) => response.data?.data as Record<string, any> | undefined)
          .catch(() => undefined)
        if (customer) {
          detailLookups.customers = {
            ...(detailLookups.customers || {}),
            [event.customerId]: customerDisplayName(customer, event.customerId),
          }
        }
      }
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

  function handleTimeSelect(selection: DateSelectArg) {
    // A time-range selection also selects that calendar day. Creation remains
    // available from the quick actions in the right-hand detail panel.
    setSelectedDate(parseClinicDateTime(selection.startStr))
  }

  function handleDateClick(arg: DateClickArg) {
    setSelectedDate(parseClinicDateTime(arg.dateStr))
  }

  function handleCalendarEventClick(arg: EventClickArg) {
    const event = arg.event.extendedProps.plannerEvent as PlannerEvent | undefined
    if (event) {
      setSelectedDate(parseClinicDateTime(event.start))
      openQuickEdit(event)
    }
  }

  function openQuickEdit(event: PlannerEvent) {
    setQuickEdit({ resource: event.resource, id: event.recordId || event.id })
  }

  async function updateAppointmentFromTimeline(event: PlannerEvent, startTime: number, staffId?: string, endTime?: number) {
    const start = parseClinicDateTime(startTime)
    const originalStart = parseClinicDateTime(event.start)
    const originalEnd = event.end ? parseClinicDateTime(event.end) : originalStart.add(30, "minute")
    const end = endTime ? parseClinicDateTime(endTime) : start.add(Math.max(15, originalEnd.diff(originalStart, "minute")), "minute")
    if (!end.isAfter(start)) {
      toast.error("Thời gian kết thúc phải sau thời gian bắt đầu")
      return
    }
    const assignedStaff = calendarSource?.staffRows.find((staff) => String(staff.id) === staffId)
    const assignment = staffId === "__unassigned__" || !staffId
      ? { doctorStaffId: null, picStaffId: null }
      : String(assignedStaff?.type) === "DOCTOR"
        ? { doctorStaffId: staffId, picStaffId: null }
        : { doctorStaffId: null, picStaffId: staffId }
    const optimisticUpdate = {
      startTime: formatClinicDateTimeForApi(start),
      endTime: formatClinicDateTimeForApi(end),
      ...assignment,
    }
    setCalendarSource((current) => current ? {
      ...current,
      appointments: current.appointments.map((appointment) =>
        String(appointment.id) === String(event.recordId || event.id)
          ? { ...appointment, ...optimisticUpdate }
          : appointment,
      ),
    } : current)
    try {
      await api.patch(`/records/appointments/${event.recordId || event.id}`, optimisticUpdate)
      toast.success("Đã cập nhật booking")
      void loadCalendar()
    } catch {
      toast.error("Không thể cập nhật booking")
      void loadCalendar()
    }
  }

  function openBookingAtTimelineSlot(staffId: string, startTime: number) {
    const rawStart = parseClinicDateTime(startTime).startOf("minute")
    const start = rawStart.minute(Math.round(rawStart.minute() / 15) * 15)
    const end = start.add(30, "minute")
    const staff = calendarSource?.staffRows.find((item) => String(item.id) === staffId)
    setQuickCreateRange({ start, end })
    setQuickCreateInitialValues({
      ...buildQuickCreateInitialValues("appointments", start, { start, end }),
      ...(staffId === "__unassigned__" ? {} : String(staff?.type) === "DOCTOR" ? { doctorStaffId: staffId } : { picStaffId: staffId }),
    })
    setQuickCreateResource("appointments")
  }

  async function handleEventTimeChange(arg: EventDropArg | EventResizeDoneArg) {
    const event = arg.event.extendedProps.plannerEvent as PlannerEvent | undefined
    if (!event || !arg.event.start || event.isRecurring) {
      arg.revert()
      return
    }
    const start = parseClinicDateTime(arg.event.start)
    const end = arg.event.end
      ? parseClinicDateTime(arg.event.end)
      : start.add(event.type === "appointment" ? 30 : 60, "minute")
    const payload = event.type === "appointment"
      ? { startTime: formatClinicDateTimeForApi(start), endTime: formatClinicDateTimeForApi(end) }
      : { workDate: start.format("YYYY-MM-DD"), startTime: formatClinicDateTimeForApi(start), endTime: formatClinicDateTimeForApi(end) }
    try {
      await api.patch(`/records/${event.resource}/${event.recordId || event.id}`, payload)
      toast.success("Đã cập nhật thời gian")
      void loadCalendar()
    } catch {
      arg.revert()
      toast.error("Không thể cập nhật thời gian, đã hoàn tác thay đổi")
    }
  }
}

function StaffDayCalendar({
  events,
  selectedDate,
  staffRows,
  rowStatuses,
  onEventClick,
  onEventMove,
  onEventResize,
  onTimeSelect,
  onOpenDoctor,
}: {
  events: PlannerEvent[]
  selectedDate: Dayjs
  staffRows: Record<string, any>[]
  rowStatuses: Map<string, DoctorTimelineRowStatus>
  onEventClick: (event: PlannerEvent) => void
  onEventMove: (event: PlannerEvent, start: number, staffId: string) => void
  onEventResize: (event: PlannerEvent, start: number, end: number) => void
  onTimeSelect: (staffId: string, start: number) => void
  onOpenDoctor: (staffId: string) => void
}) {
  const dayEvents = events.filter((event) => parseClinicDateTime(event.start).isSame(selectedDate, "day"))
  const staff = [...staffRows]
    .filter((item) => item.id)
    .sort((left, right) => {
      const typeOrder = String(left.type) === "DOCTOR" ? 0 : 1
      const otherTypeOrder = String(right.type) === "DOCTOR" ? 0 : 1
      if (typeOrder !== otherTypeOrder) return typeOrder - otherTypeOrder
      return staffDayDisplayName(left).localeCompare(staffDayDisplayName(right), "vi")
    })

  const hasUnassignedBookings = dayEvents.some((event) => !event.doctorStaffId && !event.staffId)
  const groups = [
    ...staff.map((item) => {
      const status = rowStatuses.get(String(item.id))
      return {
        id: String(item.id),
        status,
        title: (
        <button
          aria-label={`Mở hồ sơ ${staffDayDisplayName(item)}`}
          className={`staff-timeline-person${status ? ` staff-timeline-person--${status}` : ""}`}
          onClick={(event) => { event.stopPropagation(); onOpenDoctor(String(item.id)) }}
          type="button"
        >
          <Avatar icon={<TeamOutlined />} size={28} src={item.avatarUrl ? resolveFileUrl(String(item.avatarUrl)) : undefined} />
          <span className="staff-timeline-person__copy"><strong>{staffDayDisplayName(item)}</strong><small>{String(item.type) === "DOCTOR" ? "Bác sĩ" : "Nhân viên"}</small></span>
        </button>
      ),
      }
    }),
    ...(hasUnassignedBookings ? [{ id: "__unassigned__", status: undefined as DoctorTimelineRowStatus | undefined, title: "Chưa phân công" }] : []),
  ]
  const items = dayEvents.map((event) => {
    const start = parseClinicDateTime(event.start)
    const end = event.end ? parseClinicDateTime(event.end) : start.add(30, "minute")
    return {
      id: event.id,
      group: String(event.doctorStaffId || event.staffId || "__unassigned__"),
      title: `${event.customerName || event.title} · ${formatEventTime(event.start, event.end)}`,
      start_time: start.valueOf(),
      end_time: end.valueOf(),
      plannerEvent: event,
      canResize: "both" as const,
    }
  })
  const dayStart = selectedDate.hour(DAY_VIEW_START_HOUR).minute(0).second(0).millisecond(0).valueOf()
  const dayEnd = selectedDate.hour(DAY_VIEW_END_HOUR).minute(0).second(0).millisecond(0).valueOf()
  const eventById = new Map(items.map((item) => [String(item.id), item]))

  return (
    <div className="staff-day-timeline" aria-label={`Lịch nhân sự ngày ${selectedDate.format("DD/MM/YYYY")}`}>
      {groups.length > 0 ? (
        <Timeline
          canChangeGroup
          canMove
          canResize="both"
          defaultTimeEnd={dayEnd}
          defaultTimeStart={dayStart}
          dragSnap={15 * 60 * 1000}
          groups={groups}
          horizontalLineClassNamesForGroup={(group) => group.status ? [`staff-day-timeline__row--${group.status}`] : []}
          itemHeightRatio={0.76}
          items={items}
          lineHeight={64}
          maxZoom={16 * 60 * 60 * 1000}
          minZoom={16 * 60 * 60 * 1000}
          sidebarContent="Nhân sự"
          sidebarWidth={184}
          stackItems
          timeSteps={{ second: 0, minute: 15, hour: 1, day: 1, month: 1, year: 1 }}
          visibleTimeEnd={dayEnd}
          visibleTimeStart={dayStart}
          onTimeChange={(_start, _end, updateScrollCanvas) => updateScrollCanvas(dayStart, dayEnd)}
          onItemClick={(itemId) => {
            const item = eventById.get(String(itemId))
            if (item) onEventClick(item.plannerEvent)
          }}
          onItemMove={(itemId, start, groupIndex) => {
            const item = eventById.get(String(itemId))
            const group = groups[groupIndex]
            if (item && group) onEventMove(item.plannerEvent, start, String(group.id))
          }}
          onItemResize={(itemId, time, edge) => {
            const item = eventById.get(String(itemId))
            if (!item) return
            onEventResize(item.plannerEvent, edge === "left" ? time : item.start_time, edge === "right" ? time : item.end_time)
          }}
          onCanvasClick={(groupId, time) => onTimeSelect(String(groupId), time)}
        >
          <TimelineHeaders>
            <SidebarHeader>
              {({ getRootProps }) => <div {...getRootProps()} className="staff-day-timeline__sidebar-header">Nhân sự</div>}
            </SidebarHeader>
            <DateHeader labelFormat={([start]) => start.format("HH:mm")} unit="hour" />
          </TimelineHeaders>
        </Timeline>
      ) : <Empty description="Chưa có nhân sự để hiển thị" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
    </div>
  )
}

function staffDayDisplayName(staff: Record<string, any>) {
  return String(staff.fullName || staff.display_title || staff.name || staff.code || "Nhân sự")
}

function DayPlannerTimeline({
  events,
  selectedDate,
  onOpenQuickDetail,
}: {
  events: PlannerEvent[]
  selectedDate: Dayjs
  onOpenQuickDetail: (item: PlannerEvent) => void
}) {
  const hourSlots = Array.from({ length: DAY_VIEW_HOUR_COUNT + 1 }, (_, index) => DAY_VIEW_START_HOUR + index)
  const timelineEvents = layoutTimelineEvents(
    events.map((event) => projectTimelineEvent(event, selectedDate)).filter(Boolean),
  )

  return (
    <div className="calendar-day-timeline">
      <div className="calendar-day-timeline__grid">
        {hourSlots.map((hour) => (
          <div className={`calendar-day-timeline__slot${hour === DAY_VIEW_END_HOUR ? " calendar-day-timeline__slot--end" : ""}`} key={hour}>
            <div className="calendar-day-timeline__label">{`${String(hour).padStart(2, "0")}:00`}</div>
            <div className="calendar-day-timeline__line" />
          </div>
        ))}
        <div className="calendar-day-timeline__events">
          {timelineEvents.map((event) => (
            <button
              className={`calendar-day-event tone-${event.type}${event.isCompact ? " is-compact" : ""}`}
              key={event.id}
              style={{
                top: `${event.topPercent}%`,
                height: `${event.heightPercent}%`,
                left: `calc(${event.leftPercent}% + 8px)`,
                width: `calc(${event.widthPercent}% - 12px)`,
              }}
              type="button"
              title={`${formatEventTime(event.start, event.end)} · ${event.customerName || event.title}`}
              onClick={() => onOpenQuickDetail(event)}
            >
              {event.isCompact ? (
                <>
                  <span className="calendar-day-event__time">{formatEventTime(event.start, event.end)}</span>
                  <strong className="calendar-day-event__compact-title">{event.customerName || event.title}</strong>
                </>
              ) : event.type === "appointment" ? (
                <>
                  <div className="calendar-day-event__time">{formatEventTime(event.start, event.end)}</div>
                <div className="calendar-day-event__appointment">
                  <div className="calendar-day-event__appointment-head">
                    <Avatar
                      className="calendar-day-event__avatar"
                      icon={<TeamOutlined />}
                      size={28}
                      src={event.doctorAvatarUrl ? resolveFileUrl(event.doctorAvatarUrl) : undefined}
                    />
                    <div className="calendar-day-event__appointment-copy">
                      <strong>{event.customerName || event.title}</strong>
                      <span>{event.doctorName || "Chưa chọn bác sĩ"}</span>
                    </div>
                  </div>
                  {event.roomName ? <small>{event.roomName}</small> : null}
                </div>
                </>
              ) : (
                <>
                  <div className="calendar-day-event__time">{formatEventTime(event.start, event.end)}</div>
                  <strong>{event.title}</strong>
                  <span>{event.statusLabel}</span>
                  {event.summary ? <small>{event.summary}</small> : null}
                </>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function DayWorkSchedulePanel({ title, events }: { title: string; events: PlannerEvent[] }) {
  return (
    <aside className="calendar-day-work-schedule-panel">
      <div className="calendar-day-work-schedule-panel__head">
        <strong>{title}</strong>
        <span>{events.length} ca</span>
      </div>
      {events.length === 0 ? (
        <Typography.Text type="secondary">Chưa có ca làm.</Typography.Text>
      ) : (
        <div className="calendar-day-work-schedule-panel__list">
          {events.map((event) => (
            <div className="calendar-day-work-schedule-row" key={`schedule-panel-${event.id}`}>
              <strong>{formatEventTime(event.start, event.end)}</strong>
              <span>{event.staffName || event.title}</span>
              {event.shiftLabel ? <small>{event.shiftLabel}</small> : null}
            </div>
          ))}
        </div>
      )}
    </aside>
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
    startMinutes,
    endMinutes: Math.min(DAY_VIEW_MINUTES, startMinutes + durationMinutes),
    topPercent: (startMinutes / DAY_VIEW_MINUTES) * 100,
    heightPercent: (Math.min(durationMinutes, DAY_VIEW_MINUTES - startMinutes) / DAY_VIEW_MINUTES) * 100,
    isCompact: durationMinutes <= DAY_VIEW_MIN_BLOCK_MINUTES,
  }
}

function layoutTimelineEvents<T extends PlannerEvent & { startMinutes: number; endMinutes: number; topPercent: number; heightPercent: number }>(
  events: T[],
) {
  const sorted = [...events].sort((left, right) => {
    if (left.startMinutes !== right.startMinutes) return left.startMinutes - right.startMinutes
    return left.endMinutes - right.endMinutes
  })
  const laidOut: Array<T & { leftPercent: number; widthPercent: number }> = []
  let cluster: T[] = []
  let clusterEnd = -1

  const flushCluster = () => {
    if (!cluster.length) return
    const active: Array<{ endMinutes: number; column: number }> = []
    const assigned: Array<T & { column: number }> = []
    let maxColumns = 1

    cluster.forEach((event) => {
      for (let index = active.length - 1; index >= 0; index -= 1) {
        if (active[index].endMinutes <= event.startMinutes) {
          active.splice(index, 1)
        }
      }

      let column = 0
      const usedColumns = new Set(active.map((item) => item.column))
      while (usedColumns.has(column)) column += 1

      active.push({ endMinutes: event.endMinutes, column })
      assigned.push({ ...event, column })
      maxColumns = Math.max(maxColumns, active.length, column + 1)
    })

    assigned.forEach((event) => {
      laidOut.push({
        ...event,
        leftPercent: (event.column / maxColumns) * 100,
        widthPercent: 100 / maxColumns,
      })
    })

    cluster = []
    clusterEnd = -1
  }

  sorted.forEach((event) => {
    if (!cluster.length) {
      cluster = [event]
      clusterEnd = event.endMinutes
      return
    }

    if (event.startMinutes < clusterEnd) {
      cluster.push(event)
      clusterEnd = Math.max(clusterEnd, event.endMinutes)
      return
    }

    flushCluster()
    cluster = [event]
    clusterEnd = event.endMinutes
  })

  flushCluster()
  return laidOut
}

function renderMonthCell(value: Dayjs, events: PlannerEvent[], onOpen: (event: PlannerEvent) => void) {
  const dayEvents = events.filter((item) => parseClinicDateTime(item.start).isSame(value, "day"))
  return (
    <div className="calendar-month-cell">
      <Typography.Text strong>{value.date()}</Typography.Text>
      <div className="calendar-month-cell-events">
        {dayEvents.slice(0, 3).map((event) => event.type === "schedule" ? (
          <Tag className="calendar-schedule-tag" key={event.id}>
            {formatEventTime(event.start, event.end)} · {event.staffName || event.title}
          </Tag>
        ) : (
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
    case "75":
      return 18
    case "100":
    default:
      return 24
  }
}

function buildQuickCreateInitialValues(
  resource: QuickCreateResource,
  selectedDate: Dayjs,
  selectedRange?: { start: Dayjs; end: Dayjs } | null,
) {
  const selectedDay = selectedDate.format("YYYY-MM-DD")
  const rangeStart = selectedRange?.start || selectedDate.hour(9).minute(0)
  const rangeEnd = selectedRange?.end || selectedDate.hour(10).minute(0)

  switch (resource) {
    case "appointments":
      return {
        type: "CONSULTATION",
        status: "SCHEDULED",
        startTime: rangeStart.format("YYYY-MM-DDTHH:mm"),
        endTime: rangeEnd.format("YYYY-MM-DDTHH:mm"),
      }
    case "work-schedules":
      return {
        workDate: selectedDay,
        shiftLabel: "Ca sáng",
        status: "PLANNED",
        startTime: buildLocalDateTime(selectedDate, 8, 0),
        endTime: buildLocalDateTime(selectedDate, 17, 0),
        recurrenceUntil: selectedDay,
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

function getScheduleDisplayWindow(selectedDate: Dayjs, calendarMode: CalendarMode): ScheduleDisplayWindow {
  if (calendarMode === "day") return { start: selectedDate.startOf("day"), end: selectedDate.endOf("day") }
  if (calendarMode === "week") return { start: selectedDate.startOf("week"), end: selectedDate.endOf("week") }
  return { start: selectedDate.startOf("month").startOf("week"), end: selectedDate.endOf("month").endOf("week") }
}

function expandWorkScheduleOccurrences(item: Record<string, any>, window: ScheduleDisplayWindow): Record<string, any>[] {
  const schema = item.scheduleSchema && typeof item.scheduleSchema === "object" && !Array.isArray(item.scheduleSchema)
    ? item.scheduleSchema as Record<string, unknown>
    : {}
  const workDate = String(schema.workDate || item.workDate || item.startTime || "").slice(0, 10)
  const anchorDate = dayjs(workDate).startOf("day")
  if (!anchorDate.isValid()) return [item]

  const recurrenceType = String(schema.recurrenceType || item.recurrenceType || "NONE").toUpperCase()
  const recurrenceInterval = Math.max(1, Number(schema.recurrenceInterval || item.recurrenceInterval || 1))
  const untilText = String(schema.recurrenceUntil || item.recurrenceUntil || workDate).slice(0, 10)
  const untilDate = dayjs(untilText).endOf("day")
  const rangeStart = window.start.isAfter(anchorDate) ? window.start.startOf("day") : anchorDate
  const rangeEnd = window.end.isBefore(untilDate) ? window.end.endOf("day") : untilDate
  if (!untilDate.isValid() || rangeStart.isAfter(rangeEnd)) return []

  const occurrenceDates: Dayjs[] = []
  if (recurrenceType === "DAILY") {
    const daysFromAnchor = Math.max(0, rangeStart.diff(anchorDate, "day"))
    const firstOffset = Math.ceil(daysFromAnchor / recurrenceInterval) * recurrenceInterval
    for (let date = anchorDate.add(firstOffset, "day"); !date.isAfter(rangeEnd, "day"); date = date.add(recurrenceInterval, "day")) {
      occurrenceDates.push(date)
    }
  } else if (recurrenceType === "WEEKLY") {
    const recurrenceWeekdays = Array.isArray(schema.recurrenceWeekdays)
      ? schema.recurrenceWeekdays.map(String)
      : String(schema.recurrenceWeekdays || item.recurrenceWeekdays || "").split(",").map((value) => value.trim()).filter(Boolean)
    const weekdayCodes = new Set(recurrenceWeekdays.length > 0 ? recurrenceWeekdays : [weekdayCode(anchorDate)])
    for (let date = rangeStart; !date.isAfter(rangeEnd, "day"); date = date.add(1, "day")) {
      const weekIndex = Math.floor(date.startOf("day").diff(anchorDate, "day") / 7)
      if (weekIndex >= 0 && weekIndex % recurrenceInterval === 0 && weekdayCodes.has(weekdayCode(date))) occurrenceDates.push(date)
    }
  } else if (recurrenceType === "MONTHLY") {
    const monthOffset = Math.max(0, rangeStart.startOf("month").diff(anchorDate.startOf("month"), "month"))
    const firstOffset = Math.ceil(monthOffset / recurrenceInterval) * recurrenceInterval
    for (let date = anchorDate.add(firstOffset, "month"); !date.isAfter(rangeEnd, "day"); date = date.add(recurrenceInterval, "month")) {
      occurrenceDates.push(date)
    }
  } else if (!anchorDate.isBefore(rangeStart, "day") && !anchorDate.isAfter(rangeEnd, "day")) {
    occurrenceDates.push(anchorDate)
  }

  return occurrenceDates.map((date) => ({
    ...item,
    workDate: date.format("YYYY-MM-DD"),
    startTime: applyScheduleTimeToDate(date, schema.startTime || item.startTime),
    endTime: applyScheduleTimeToDate(date, schema.endTime || item.endTime),
  }))
}

function applyScheduleTimeToDate(date: Dayjs, value: unknown) {
  if (!value) return undefined
  const time = parseClinicDateTime(value)
  return time.isValid() ? `${date.format("YYYY-MM-DD")}T${time.format("HH:mm")}` : undefined
}

function weekdayCode(date: Dayjs) {
  return ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][date.day()] || "MON"
}

function buildPlannerEvents({
  appointments,
  workSchedules,
  leaveRequests,
  attendances,
  staffRows,
  customerRows,
  roomRows,
  lookups,
  scheduleDisplayWindow,
}: {
  appointments: Record<string, any>[]
  workSchedules: Record<string, any>[]
  leaveRequests: Record<string, any>[]
  attendances: Record<string, any>[]
  staffRows: Record<string, any>[]
  customerRows: Record<string, any>[]
  roomRows: Record<string, any>[]
  lookups: LookupMap
  scheduleDisplayWindow: ScheduleDisplayWindow
}) {
  const staffById = new Map(staffRows.map((item) => [String(item.id), item]))
  const customerById = new Map(customerRows.map((item) => [String(item.id), item]))
  const roomById = new Map(roomRows.map((item) => [String(item.id), item]))

  const appointmentEvents: PlannerEvent[] = appointments.map((item) => ({
    id: String(item.id),
    recordId: String(item.id),
    resource: "appointments",
    type: "appointment",
    title: customerDisplayName(customerById.get(String(item.customerId || "")), item.customerId),
    start: String(item.startTime || item.createdAt || ""),
    end: item.endTime ? String(item.endTime) : undefined,
    branchId: item.branchId ? String(item.branchId) : undefined,
    customerId: item.customerId ? String(item.customerId) : undefined,
    staffId: item.picStaffId ? String(item.picStaffId) : item.doctorStaffId ? String(item.doctorStaffId) : undefined,
    doctorStaffId: item.doctorStaffId ? String(item.doctorStaffId) : undefined,
    tone: EVENT_TYPE_COLOR.appointment,
    statusLabel: getFieldLabel("appointments", "status", String(item.status || "SCHEDULED")),
    summary: [
      staffDisplayName(staffById.get(String(item.doctorStaffId || "")), item.doctorStaffId),
      roomDisplayName(roomById.get(String(item.roomId || "")), item.roomId),
    ].filter(Boolean).join(" | "),
    customerName: customerDisplayName(customerById.get(String(item.customerId || "")), item.customerId),
    doctorName: staffDisplayName(staffById.get(String(item.doctorStaffId || "")), item.doctorStaffId),
    doctorAvatarUrl: staffById.get(String(item.doctorStaffId || ""))?.avatarUrl
      ? String(staffById.get(String(item.doctorStaffId || ""))?.avatarUrl)
      : undefined,
    roomName: roomDisplayName(roomById.get(String(item.roomId || "")), item.roomId),
  }))

  const scheduleEvents: PlannerEvent[] = workSchedules.flatMap((item) => expandWorkScheduleOccurrences(item, scheduleDisplayWindow).map((schedule) => ({
    id: `${String(item.id)}:${String(schedule.workDate || schedule.startTime || "")}`,
    recordId: String(item.id),
    isRecurring: isRecurringSchedule(item),
    resource: "work-schedules",
    type: "schedule",
    title: staffDisplayName(staffById.get(String(schedule.staffId || "")), schedule.staffId),
    start: String(schedule.startTime || schedule.workDate || schedule.createdAt || ""),
    end: schedule.endTime ? String(schedule.endTime) : undefined,
    branchId: schedule.branchId ? String(schedule.branchId) : undefined,
    staffId: schedule.staffId ? String(schedule.staffId) : undefined,
    doctorStaffId: schedule.staffId ? String(schedule.staffId) : undefined,
    tone: EVENT_TYPE_COLOR.schedule,
    statusLabel: getFieldLabel("work-schedules", "status", String(schedule.status || "PLANNED")),
    summary: [schedule.shiftLabel || "Ca làm", roomDisplayName(roomById.get(String(schedule.roomId || "")), schedule.roomId), schedule.note].filter(Boolean).join(" | "),
    staffName: staffDisplayName(staffById.get(String(schedule.staffId || "")), schedule.staffId),
    staffAvatarUrl: staffById.get(String(schedule.staffId || ""))?.avatarUrl
      ? String(staffById.get(String(schedule.staffId || ""))?.avatarUrl)
      : undefined,
    staffType: String(staffById.get(String(schedule.staffId || ""))?.type || "STAFF"),
    shiftLabel: schedule.shiftLabel ? String(schedule.shiftLabel) : undefined,
    roomName: roomDisplayName(roomById.get(String(schedule.roomId || "")), schedule.roomId),
  })))

  const leaveEvents: PlannerEvent[] = leaveRequests.map((item) => ({
    id: String(item.id),
    recordId: String(item.id),
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
    recordId: String(item.id),
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

function isRecurringSchedule(item: Record<string, any>) {
  const schema = item.scheduleSchema && typeof item.scheduleSchema === "object" && !Array.isArray(item.scheduleSchema)
    ? item.scheduleSchema as Record<string, unknown>
    : {}
  return String(schema.recurrenceType || item.recurrenceType || "NONE").toUpperCase() !== "NONE"
}

function resolveFullCalendarEventColor(type: PlannerEventType) {
  switch (type) {
    case "appointment": return "#c95787"
    case "schedule": return "#1296ad"
    case "leave": return "#d48806"
    default: return "#389e0d"
  }
}

function buildAttendanceStart(item: Record<string, any>) {
  const dateValue = String(item.date || item.createdAt || "")
  if (!dateValue) return ""
  if (!item.checkIn) return `${dateValue}T00:00`
  const normalizedCheckIn = String(item.checkIn).slice(0, 5)
  return `${dateValue}T${normalizedCheckIn}`
}

function getDoctorScheduleAvailability({
  schedules,
  attendances,
  leaveRequests,
  selectedDate,
}: {
  schedules: PlannerEvent[]
  attendances: Record<string, any>[]
  leaveRequests: Record<string, any>[]
  selectedDate: Dayjs
}): DoctorScheduleAvailability[] {
  const attendanceByStaffId = new Map(
    attendances
      .filter((item) => dayjs(String(item.date || "")).isSame(selectedDate, "day"))
      .map((item) => [String(item.staffId), item]),
  )
  const approvedLeaveByStaffId = new Map(
    leaveRequests
      .filter((item) => {
        const status = String(item.status || "").toLowerCase()
        const start = dayjs(String(item.startDate || "")).startOf("day")
        const end = dayjs(String(item.endDate || item.startDate || "")).endOf("day")
        return status === "approved" && start.isValid() && end.isValid() && !selectedDate.isBefore(start, "day") && !selectedDate.isAfter(end, "day")
      })
      .map((item) => [String(item.staffId), item]),
  )

  return schedules.map((schedule) => ({
    schedule,
    attendance: attendanceByStaffId.get(String(schedule.staffId || "")),
    leaveRequest: approvedLeaveByStaffId.get(String(schedule.staffId || "")),
  }))
}

function formatAttendanceTime(value: unknown) {
  const match = String(value || "").match(/(?:T|\s)?(\d{1,2}:\d{2})/)
  return match?.[1] || ""
}

function formatWorkDuration(start: string, end?: string) {
  if (!end) return "Chưa xác định thời lượng"
  const minutes = parseClinicDateTime(end).diff(parseClinicDateTime(start), "minute")
  if (minutes <= 0) return "Chưa xác định thời lượng"
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours} giờ ${remainder} phút` : `${hours} giờ`
}

function customerDisplayName(record?: Record<string, any>, fallback?: unknown) {
  return record?.fullName || record?.display_title || String(fallback || "Khách hàng")
}

function staffDisplayName(record?: Record<string, any>, fallback?: unknown) {
  return record?.fullName || record?.display_title || String(fallback || "Nhân sự")
}

function roomDisplayName(record?: Record<string, any>, fallback?: unknown) {
  return record?.name || record?.display_title || (fallback ? String(fallback) : "")
}
