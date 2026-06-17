import {
  CalendarOutlined,
  DollarOutlined,
  ExperimentOutlined,
  FileDoneOutlined,
  LineChartOutlined,
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

interface DashboardMetric {
  title: string
  value: number
  suffix: string
  icon: React.ReactNode
  tone: string
  trend: string
}

interface DashboardPipeline {
  label: string
  value: number
  color: string
}

interface DashboardEvent {
  id: string
  type: "appointment" | "schedule"
  title: string
  start: string
  end?: string
  tone: string
  meta: string
}

interface ListPayload<T> {
  data: T[]
  total: number
}

const DEFAULT_METRICS: DashboardMetric[] = [
  {
    title: "Khách hàng",
    value: 0,
    suffix: "khách",
    icon: <TeamOutlined />,
    tone: "rose",
    trend: "0 hồ sơ",
  },
  {
    title: "Leads",
    value: 0,
    suffix: "lead",
    icon: <LineChartOutlined />,
    tone: "gold",
    trend: "0 đầu mối",
  },
  {
    title: "Đang điều trị",
    value: 0,
    suffix: "liệu trình",
    icon: <ExperimentOutlined />,
    tone: "violet",
    trend: "0 liệu trình",
  },
  {
    title: "Hồ sơ điều trị",
    value: 0,
    suffix: "case",
    icon: <SafetyCertificateOutlined />,
    tone: "cyan",
    trend: "0 hồ sơ",
  },
]

const DEFAULT_PIPELINE: DashboardPipeline[] = [
  { label: "Tư vấn", value: 0, color: "#e889ae" },
  { label: "Đơn dịch vụ", value: 0, color: "#d7a45b" },
  { label: "Lịch hẹn", value: 0, color: "#9b7cff" },
  { label: "Hóa đơn", value: 0, color: "#62d8d2" },
]

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}

function parseAmount(value: unknown) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

async function fetchList<T>(resource: string, pageSize = 10000) {
  const response = await api.get(`/records/${resource}`, { params: { pageSize } })
  return response.data as ListPayload<T>
}

export function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(dayjs())
  const [events, setEvents] = useState<DashboardEvent[]>([])
  const [lookups, setLookups] = useState<LookupMap>({})
  const [metrics, setMetrics] = useState<DashboardMetric[]>(DEFAULT_METRICS)
  const [pipeline, setPipeline] = useState<DashboardPipeline[]>(DEFAULT_PIPELINE)
  const [revenue, setRevenue] = useState(0)

  useEffect(() => {
    Promise.all([
      fetchList<Record<string, any>>("appointments", 200),
      fetchList<Record<string, any>>("work-schedules", 200).catch(
        () => ({ data: [], total: 0 }),
      ),
      fetchList<Record<string, any>>("customers"),
      fetchList<Record<string, any>>("leads"),
      fetchList<Record<string, any>>("treatments"),
      fetchList<Record<string, any>>("medical-episodes"),
      fetchList<Record<string, any>>("consultations"),
      fetchList<Record<string, any>>("service-orders"),
      fetchList<Record<string, any>>("invoices"),
      loadRelationOptions(["customerId", "staffId"]),
    ]).then(([
      appointments,
      workSchedules,
      customers,
      leads,
      treatments,
      medicalEpisodes,
      consultations,
      serviceOrders,
      invoices,
      relationLookups,
    ]) => {
      const appointmentEvents = appointments.data.map(
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
      const scheduleEvents = workSchedules.data.map(
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

      const paidRevenue = invoices.data.reduce(
        (sum, item) => sum + parseAmount(item.paidAmount),
        0,
      )

      const nextMetrics: DashboardMetric[] = [
        {
          title: "Khách hàng",
          value: customers.total,
          suffix: "khách",
          icon: <TeamOutlined />,
          tone: "rose",
          trend: `${customers.total.toLocaleString("vi-VN")} hồ sơ`,
        },
        {
          title: "Leads",
          value: leads.total,
          suffix: "lead",
          icon: <LineChartOutlined />,
          tone: "gold",
          trend: `${leads.total.toLocaleString("vi-VN")} đầu mối`,
        },
        {
          title: "Đang điều trị",
          value: treatments.total,
          suffix: "liệu trình",
          icon: <ExperimentOutlined />,
          tone: "violet",
          trend: `${treatments.total.toLocaleString("vi-VN")} liệu trình`,
        },
        {
          title: "Hồ sơ điều trị",
          value: medicalEpisodes.total,
          suffix: "case",
          icon: <SafetyCertificateOutlined />,
          tone: "cyan",
          trend: `${medicalEpisodes.total.toLocaleString("vi-VN")} hồ sơ`,
        },
      ]

      const pipelineTotals = [
        { label: "Tư vấn", total: consultations.total, color: "#e889ae" },
        { label: "Đơn dịch vụ", total: serviceOrders.total, color: "#d7a45b" },
        { label: "Lịch hẹn", total: appointments.total, color: "#9b7cff" },
        { label: "Hóa đơn", total: invoices.total, color: "#62d8d2" },
      ]
      const maxTotal = Math.max(...pipelineTotals.map((item) => item.total), 1)
      const nextPipeline = pipelineTotals.map((item) => ({
        label: `${item.label} (${item.total.toLocaleString("vi-VN")})`,
        value: Math.round((item.total / maxTotal) * 100),
        color: item.color,
      }))

      setLookups(relationLookups)
      setEvents([...appointmentEvents, ...scheduleEvents])
      setRevenue(paidRevenue)
      setMetrics(nextMetrics)
      setPipeline(nextPipeline)
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
              <Typography.Title level={3}>{formatCompactCurrency(revenue)}</Typography.Title>
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
                      {item.value}% theo quy mô dữ liệu
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
