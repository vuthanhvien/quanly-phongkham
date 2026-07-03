import {
  LeftOutlined,
  RightOutlined,
  CalendarOutlined,
  RiseOutlined,
} from "@ant-design/icons"
import { Button, Calendar, Card, Col, List, Row, Segmented, Space, Tag, Typography } from "antd"
import dayjs, { type Dayjs } from "dayjs"
import type { ActivityItem, CalendarMode, DashboardEvent } from "./types"
import { formatEventTime } from "./utils"
import { parseClinicDateTime } from "../../utils/datetime"

export function DashboardScheduleSection({
  allEvents,
  appointmentCount,
  calendarMode,
  calendarRangeLabel,
  recentActivities,
  scheduleCount,
  selectedDate,
  selectedEvents,
  setCalendarMode,
  setSelectedDate,
  shiftCalendar,
  jumpToToday,
  weekDays,
  weekEvents,
}: {
  allEvents: DashboardEvent[]
  appointmentCount: number
  calendarMode: CalendarMode
  calendarRangeLabel: string
  recentActivities: ActivityItem[]
  scheduleCount: number
  selectedDate: Dayjs
  selectedEvents: DashboardEvent[]
  setCalendarMode: (value: CalendarMode) => void
  setSelectedDate: (value: Dayjs) => void
  shiftCalendar: (offset: number) => void
  jumpToToday: () => void
  weekDays: Dayjs[]
  weekEvents: DashboardEvent[]
}) {
  return (
    <Row gutter={[16, 16]} className="dashboard-grid">
      <Col xs={24} lg={14}>
        <Card
          className="glass-card spacious-card"
          title="Lịch hẹn & lịch làm việc"
          extra={(
            <Space wrap>
              <Button icon={<LeftOutlined />} onClick={() => shiftCalendar(-1)} />
              <Typography.Text className="calendar-range-label">{calendarRangeLabel}</Typography.Text>
              <Button icon={<RightOutlined />} onClick={() => shiftCalendar(1)} />
              <Button onClick={jumpToToday}>Hôm nay</Button>
              <Segmented<CalendarMode>
                options={[
                  { label: "Ngày", value: "day" },
                  { label: "Tuần", value: "week" },
                  { label: "Tháng", value: "month" },
                ]}
                value={calendarMode}
                onChange={(value) => setCalendarMode(value)}
              />
            </Space>
          )}
        >
          {calendarMode === "month" ? (
            <Calendar
              fullscreen={false}
              value={selectedDate}
              onSelect={setSelectedDate}
              fullCellRender={(value: Dayjs) => {
                const dayEvents = selectedEventsForDate(allEvents, value)
                return (
                  <div style={{ minHeight: 96, padding: 6 }}>
                    <Typography.Text strong>{value.date()}</Typography.Text>
                    <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
                      {dayEvents.slice(0, 3).map((event) => (
                        <Tag key={event.id} color={event.tone} style={{ marginInlineEnd: 0 }}>
                          {parseClinicDateTime(event.start).format("HH:mm")} {event.type === "appointment" ? "Hẹn" : "Ca"}
                        </Tag>
                      ))}
                      {dayEvents.length > 3 && (
                        <Typography.Text type="secondary">+{dayEvents.length - 3} lịch khác</Typography.Text>
                      )}
                    </div>
                  </div>
                )
              }}
            />
          ) : calendarMode === "week" ? (
            <div className="dashboard-week-grid">
              {weekDays.map((date) => {
                const dayEvents = weekEvents.filter((item) => parseClinicDateTime(item.start).isSame(date, "day"))
                return (
                  <div className="dashboard-week-card" key={date.format("YYYY-MM-DD")}>
                    <Typography.Text strong>{date.format("ddd DD/MM")}</Typography.Text>
                    <div className="dashboard-week-events">
                      {dayEvents.length === 0 ? (
                        <Typography.Text type="secondary">Không có lịch</Typography.Text>
                      ) : (
                        dayEvents.map((event) => (
                          <button
                            key={event.id}
                            className="dashboard-week-event"
                            type="button"
                            onClick={() => setSelectedDate(date)}
                          >
                            <strong>{formatEventTime(event.start, event.end)}</strong>
                            <span>{event.title}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <List
              locale={{ emptyText: "Chưa có lịch trong ngày" }}
              dataSource={selectedEvents}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={item.type === "appointment" ? <CalendarOutlined /> : <RiseOutlined />}
                    title={item.title}
                    description={`${formatEventTime(item.start, item.end)}${item.meta ? ` | ${item.meta}` : ""}`}
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </Col>
      <Col xs={24} lg={10}>
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Card className="glass-card spacious-card" title="Điều phối lịch nhanh">
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <Typography.Text>
                {appointmentCount} lịch hẹn, {scheduleCount} ca làm việc đang được điều phối.
              </Typography.Text>
              {selectedEvents.slice(0, 4).map((event) => (
                <div key={event.id} className="pipeline-row">
                  <div>
                    <Typography.Text strong>{parseClinicDateTime(event.start).format("HH:mm")}</Typography.Text>
                    <Typography.Text type="secondary">{event.title}</Typography.Text>
                  </div>
                  <Tag className="soft-tag">{event.type === "appointment" ? "Lịch hẹn" : "Ca làm"}</Tag>
                </div>
              ))}
            </Space>
          </Card>
          <Card
            className="glass-card spacious-card"
            title={`Hoạt động gần đây ${selectedDate.isSame(dayjs(), "day") ? "hôm nay" : ""}`}
          >
            <List
              locale={{ emptyText: "Chưa có hoạt động nổi bật" }}
              dataSource={selectedDate.isSame(dayjs(), "day") ? recentActivities : selectedEvents}
              renderItem={(item: ActivityItem | DashboardEvent) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={"type" in item && item.type === "schedule" ? <RiseOutlined /> : <CalendarOutlined />}
                    title={item.title}
                    description={item.meta}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Space>
      </Col>
    </Row>
  )
}

function selectedEventsForDate(events: DashboardEvent[], date: Dayjs) {
  return events.filter((item) => parseClinicDateTime(item.start).isSame(date, "day"))
}
