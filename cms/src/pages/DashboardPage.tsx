import {
  CalendarOutlined,
  DollarOutlined,
  ExperimentOutlined,
  MedicineBoxOutlined,
  RiseOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from "@ant-design/icons"
import {
  Calendar,
  Card,
  Col,
  List,
  Progress,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
} from "antd"
import dayjs, { Dayjs } from "dayjs"
import { useEffect, useMemo, useState } from "react"
import { api } from "../api"
import { loadRelationOptions, LookupMap } from "../relations"

const metrics = [
  {
    title: "Khách đang chờ",
    value: 18,
    suffix: "khách",
    icon: <TeamOutlined />,
    tone: "rose",
    trend: "+12% tuần này",
  },
  {
    title: "Đang tư vấn",
    value: 9,
    suffix: "ca",
    icon: <MedicineBoxOutlined />,
    tone: "gold",
    trend: "4 bác sĩ active",
  },
  {
    title: "Đang điều trị",
    value: 27,
    suffix: "liệu trình",
    icon: <ExperimentOutlined />,
    tone: "violet",
    trend: "82% đúng lịch",
  },
  {
    title: "Hậu phẫu",
    value: 14,
    suffix: "case",
    icon: <SafetyCertificateOutlined />,
    tone: "cyan",
    trend: "3 cần follow-up",
  },
]

const pipeline = [
  { label: "Tư vấn", value: 74, color: "#e889ae" },
  { label: "Phẫu thuật", value: 48, color: "#d7a45b" },
  { label: "Liệu trình", value: 86, color: "#9b7cff" },
  { label: "Hậu phẫu", value: 62, color: "#62d8d2" },
]

interface DashboardEvent {
  id: string
  type: "appointment" | "schedule"
  title: string
  start: string
  end?: string
  tone: string
  meta: string
}

export function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(dayjs())
  const [events, setEvents] = useState<DashboardEvent[]>([])
  const [lookups, setLookups] = useState<LookupMap>({})

  useEffect(() => {
    Promise.all([
      api.get("/records/appointments", { params: { pageSize: 200 } }),
      api.get("/records/work-schedules", { params: { pageSize: 200 } }).catch(
        () => ({ data: { data: [] } }),
      ),
      loadRelationOptions(["customerId", "staffId"]),
    ]).then(([appointments, workSchedules, relationLookups]) => {
      const appointmentEvents = appointments.data.data.map(
        (item: Record<string, any>) => ({
          id: item.id,
          type: "appointment" as const,
          title: `${item.type} - ${relationLookups.customers?.[item.customerId] || item.customerId || "Khách hàng"}`,
          start: item.startTime,
          end: item.endTime,
          tone: "pink",
          meta: [item.status, item.doctorName, item.room].filter(Boolean).join(" | "),
        }),
      )
      const scheduleEvents = workSchedules.data.data.map(
        (item: Record<string, any>) => ({
          id: item.id,
          type: "schedule" as const,
          title: `${item.shiftLabel} - ${relationLookups.staff?.[item.staffId] || item.staffId}`,
          start: item.startTime || `${item.workDate}T00:00:00.000Z`,
          end: item.endTime,
          tone: "cyan",
          meta: [item.status, item.room, item.note].filter(Boolean).join(" | "),
        }),
      )

      setLookups(relationLookups)
      setEvents([...appointmentEvents, ...scheduleEvents])
    })
  }, [])

  const selectedEvents = useMemo(
    () =>
      events
        .filter((item) => dayjs(item.start).isSame(selectedDate, "day"))
        .sort((left, right) => dayjs(left.start).valueOf() - dayjs(right.start).valueOf()),
    [events, selectedDate],
  )

  const appointmentCount = events.filter((item) => item.type === "appointment").length
  const scheduleCount = events.filter((item) => item.type === "schedule").length

  return (
    <>
      <div className="hero-panel">
        <div>
          <Typography.Text className="eyebrow">
            Clinic command center
          </Typography.Text>
          <Typography.Title level={1}>Tổng quan vận hành</Typography.Title>
          <Typography.Paragraph>
            Theo dõi hành trình khách hàng, lịch hẹn, điều trị và dữ liệu vận
            hành trong một CMS có thể cấu hình theo nghiệp vụ.
          </Typography.Paragraph>
        </div>
        <div className="hero-summary">
          <div className="hero-revenue">
            <DollarOutlined />
            <div>
              <Typography.Text>Doanh thu hôm nay</Typography.Text>
              <Typography.Title level={3}>128.5M</Typography.Title>
            </div>
          </div>
          <Space wrap>
            <Tag className="soft-tag">Custom fields</Tag>
            <Tag className="soft-tag">Dynamic forms</Tag>
            <Tag className="soft-tag">Print templates</Tag>
            <Tag className="soft-tag">Calendar điều phối</Tag>
          </Space>
        </div>
      </div>
      <Row gutter={[16, 16]}>
        {metrics.map((metric) => (
          <Col key={metric.title} xs={24} md={12} xl={6}>
            <Card className={`metric-card metric-${metric.tone}`}>
              <div className="metric-topline">
                <div className="metric-icon">{metric.icon}</div>
                <Tag className="soft-tag">{metric.trend}</Tag>
              </div>
              <Statistic
                title={metric.title}
                value={metric.value}
                suffix={metric.suffix}
              />
            </Card>
          </Col>
        ))}
      </Row>
      <Row gutter={[16, 16]} className="dashboard-grid">
        <Col xs={24} lg={14}>
          <Card
            className="glass-card spacious-card"
            title="Luồng vận hành hôm nay"
          >
            <div className="pipeline-list">
              {pipeline.map((item) => (
                <div className="pipeline-row" key={item.label}>
                  <div>
                    <Typography.Text strong>{item.label}</Typography.Text>
                    <Typography.Text type="secondary">
                      {item.value}% kế hoạch
                    </Typography.Text>
                  </div>
                  <Progress
                    percent={item.value}
                    strokeColor={item.color}
                    trailColor="rgba(255,255,255,0.08)"
                  />
                </div>
              ))}
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card className="glass-card spacious-card" title="Điều phối lịch nhanh">
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <Typography.Text>
                {appointmentCount} lịch hẹn, {scheduleCount} ca làm việc đang được điều phối.
              </Typography.Text>
              {selectedEvents.slice(0, 4).map((event) => (
                <div key={event.id} className="pipeline-row">
                  <div>
                    <Typography.Text strong>{dayjs(event.start).format("HH:mm")}</Typography.Text>
                    <Typography.Text type="secondary">{event.title}</Typography.Text>
                  </div>
                  <Tag className="soft-tag">{event.type === "appointment" ? "Lịch hẹn" : "Ca làm"}</Tag>
                </div>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} className="dashboard-grid">
        <Col xs={24} lg={14}>
          <Card className="glass-card spacious-card" title="Calendar lịch hẹn & lịch làm việc">
            <Calendar
              fullscreen={false}
              value={selectedDate}
              onSelect={setSelectedDate}
              fullCellRender={(value: Dayjs) => {
                const dayEvents = events.filter((item) =>
                  dayjs(item.start).isSame(value, "day"),
                )
                return (
                  <div style={{ minHeight: 96, padding: 6 }}>
                    <Typography.Text strong>{value.date()}</Typography.Text>
                    <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
                      {dayEvents.slice(0, 3).map((event) => (
                        <Tag key={event.id} color={event.tone} style={{ marginInlineEnd: 0 }}>
                          {dayjs(event.start).format("HH:mm")} {event.type === "appointment" ? "Hẹn" : "Ca"}
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
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card
            className="glass-card spacious-card"
            title={`Lịch ngày ${selectedDate.format("DD/MM/YYYY")}`}
          >
            <List
              locale={{ emptyText: "Chưa có lịch trong ngày" }}
              dataSource={selectedEvents}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={item.type === "appointment" ? <CalendarOutlined /> : <RiseOutlined />}
                    title={item.title}
                    description={`${dayjs(item.start).format("HH:mm")}${item.end ? ` - ${dayjs(item.end).format("HH:mm")}` : ""}${item.meta ? ` | ${item.meta}` : ""}`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </>
  )
}
