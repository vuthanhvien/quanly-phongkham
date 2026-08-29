import { BarChartOutlined, ReloadOutlined } from "@ant-design/icons"
import { Button, Card, Col, DatePicker, Progress, Row, Segmented, Space, Statistic, Table, Tag, Typography } from "antd"
import { useEffect, useMemo, useState } from "react"
import dayjs, { type Dayjs } from "dayjs"
import { api } from "../api"
import { getApiErrorMessage } from "../utils/apiError"
import { toastError } from "../toast"

type MonitorKind = "business" | "hr" | "projects" | "inventory"
type RowData = Record<string, unknown>
type Period = "Ngày" | "Tháng" | "Năm"

const config: Record<MonitorKind, { title: string; resources: string[] }> = {
  business: { title: "Monitor kinh doanh", resources: ["invoices", "expenses", "service-orders", "leads"] },
  hr: { title: "Monitor nhân sự", resources: ["staff", "attendances", "leave-requests", "payrolls", "recruitment-positions", "candidate-applications", "recruitment-interviews", "recruitment-offers"] },
  projects: { title: "Monitor dự án", resources: ["projects", "tasks"] },
  inventory: { title: "Monitor kho – hàng hoá", resources: ["products", "stock-batches", "warehouses", "suppliers"] },
}

export function OperationsMonitorPage({ kind }: { kind: MonitorKind }) {
  const [period, setPeriod] = useState<Period>("Tháng")
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<Record<string, RowData[]>>({})
  const setting = config[kind]

  const load = async () => {
    setLoading(true)
    try {
      const results = await Promise.all(setting.resources.map(async (resource) => [resource, (await api.get(`/records/${resource}`, { params: { pageSize: 1000 } })).data.data || []] as const))
      setData(Object.fromEntries(results))
    } catch (error) {
      toastError(getApiErrorMessage(error, "Không tải được dữ liệu monitor"))
    } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [kind])

  const filteredData = useMemo(() => filterMonitorData(data, dateRange), [data, dateRange])
  const summary = useMemo(() => buildSummary(kind, filteredData), [kind, filteredData])
  const series = useMemo(() => buildSeries(kind, filteredData, period), [kind, filteredData, period])

  return <>
    <div className="page-header">
      <Typography.Title className="page-title-with-icon" level={3}><BarChartOutlined /><span>{setting.title}</span></Typography.Title>
      <Space wrap><DatePicker.RangePicker allowClear format="DD/MM/YYYY" placeholder={["Từ ngày", "Đến ngày"]} value={dateRange} onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)} /><Segmented options={["Ngày", "Tháng", "Năm"]} value={period} onChange={(value) => setPeriod(value as Period)} /><Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>Tải lại</Button></Space>
    </div>
    <Row gutter={[16, 16]}>{summary.cards.map((item) => { const card = item as { title: string; value: number; currency?: boolean; suffix?: string; color: string }; return <Col key={card.title} lg={6} md={12} xs={24}><Card className="glass-card"><Statistic title={card.title} value={card.value} precision={card.currency ? 0 : undefined} suffix={card.currency ? "₫" : card.suffix} valueStyle={{ color: card.color }} /></Card></Col> })}</Row>
    <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
      <Col lg={16} xs={24}><Card className="glass-card" title={`Xu hướng theo ${period.toLowerCase()}`}><MiniBars values={series} currency={kind === "business"} /></Card></Col>
      <Col lg={8} xs={24}><Card className="glass-card" title="Cảnh báo cần xử lý"><Space direction="vertical" size={12} style={{ width: "100%" }}>{summary.alerts.length ? summary.alerts.map((item) => <div key={item.label}><Space style={{ justifyContent: "space-between", width: "100%" }}><Typography.Text>{item.label}</Typography.Text><Tag color={item.color}>{item.value}</Tag></Space><Progress percent={Math.min(100, item.percent)} showInfo={false} status={item.color === "error" ? "exception" : "active"} /></div>) : <Typography.Text type="secondary">Chưa có cảnh báo.</Typography.Text>}</Space></Card></Col>
    </Row>
    <Card className="glass-card table-card" style={{ marginTop: 16 }} title={summary.tableTitle}><Table<RowData> columns={summary.columns} dataSource={summary.rows} loading={loading} pagination={{ pageSize: 10 }} rowKey={(row) => String(row.id || row.code || row.name)} /></Card>
  </>
}

function buildSummary(kind: MonitorKind, data: Record<string, RowData[]>) {
  if (kind === "business") {
    const invoices = data.invoices || []; const expenses = data.expenses || []; const orders = data["service-orders"] || []; const leads = data.leads || []
    const revenue = sum(invoices, "paidAmount") || sum(invoices, "totalAmount"); const cost = sum(expenses, "amount") || sum(expenses, "totalAmount"); const pending = invoices.filter((row) => !["PAID", "CANCELLED"].includes(String(row.status))).length
    return { cards: [{ title: "Doanh thu đã thu", value: revenue, currency: true, color: "#089981" }, { title: "Chi phí", value: cost, currency: true, color: "#e57c3a" }, { title: "Lợi nhuận tạm tính", value: revenue - cost, currency: true, color: revenue >= cost ? "#246bfd" : "#ef4444" }, { title: "Đơn hàng", value: orders.length, suffix: "đơn", color: "#7c3aed" }], alerts: [{ label: "Hóa đơn chưa thu đủ", value: `${pending} hóa đơn`, percent: invoices.length ? pending / invoices.length * 100 : 0, color: pending ? "error" : "success" }, { label: "Lead chưa chuyển đổi", value: `${leads.filter((row) => row.status !== "CONVERTED").length} lead`, percent: leads.length ? leads.filter((row) => row.status !== "CONVERTED").length / leads.length * 100 : 0, color: "warning" }], tableTitle: "Hóa đơn gần đây", rows: invoices.slice(0, 20), columns: basicColumns(["code", "customerId", "totalAmount", "paidAmount", "status"]) }
  }
  if (kind === "hr") {
    const staff = data.staff || []; const attendance = data.attendances || []; const leave = data["leave-requests"] || []; const payroll = data.payrolls || []; const positions = data["recruitment-positions"] || []; const applications = data["candidate-applications"] || []; const interviews = data["recruitment-interviews"] || []; const offers = data["recruitment-offers"] || []; const present = attendance.filter((row) => String(row.status).toLowerCase() === "present").length; const pendingLeave = leave.filter((row) => String(row.status).toLowerCase() === "pending").length; const openPositions = positions.filter((row) => String(row.status).toUpperCase() === "OPEN").length; const activeCandidates = applications.filter((row) => !["HIRED", "REJECTED"].includes(String(row.stage).toUpperCase())).length; const pendingOffers = offers.filter((row) => ["DRAFT", "SENT"].includes(String(row.status).toUpperCase())).length; const upcomingInterviews = interviews.filter((row) => String(row.status).toUpperCase() === "SCHEDULED" && new Date(String(row.scheduledAt)) >= new Date()).length
    return { cards: [{ title: "Nhân sự đang hoạt động", value: staff.filter((row) => row.isActive !== false).length, suffix: "người", color: "#246bfd" }, { title: "Lượt có mặt", value: present, suffix: "lượt", color: "#089981" }, { title: "Vị trí đang tuyển", value: openPositions, suffix: "vị trí", color: "#7c3aed" }, { title: "Ứng viên trong pipeline", value: activeCandidates, suffix: "ứng viên", color: "#e57c3a" }], alerts: [{ label: "Đơn nghỉ chờ duyệt", value: `${pendingLeave} đơn`, percent: leave.length ? pendingLeave / leave.length * 100 : 0, color: pendingLeave ? "warning" : "success" }, { label: "Chấm công thiếu giờ", value: `${attendance.filter((row) => !row.checkOut).length} lượt`, percent: attendance.length ? attendance.filter((row) => !row.checkOut).length / attendance.length * 100 : 0, color: "error" }, { label: "Lịch phỏng vấn sắp tới", value: `${upcomingInterviews} lịch`, percent: interviews.length ? upcomingInterviews / interviews.length * 100 : 0, color: "processing" }, { label: "Offer chờ phản hồi", value: `${pendingOffers} offer`, percent: offers.length ? pendingOffers / offers.length * 100 : 0, color: pendingOffers ? "warning" : "success" }], tableTitle: "Tuyển dụng cần theo dõi", rows: [...interviews.filter((row) => String(row.status).toUpperCase() === "SCHEDULED"), ...offers.filter((row) => ["DRAFT", "SENT"].includes(String(row.status).toUpperCase()))].slice(0, 20), columns: basicColumns(["candidateApplicationId", "scheduledAt", "proposedStartDate", "status"]) }
  }
  if (kind === "inventory") {
    const products = data.products || []; const batches = data["stock-batches"] || []; const warehouses = data.warehouses || []; const suppliers = data.suppliers || []
    const totalQuantity = sum(batches, "remainingQuantity"); const lowStock = products.filter((product) => Number(product.minStockLevel || 0) > 0 && batches.filter((batch) => batch.productId === product.id).reduce((sum, batch) => sum + Number(batch.remainingQuantity || 0), 0) <= Number(product.minStockLevel || 0)); const soon = new Date(); soon.setDate(soon.getDate() + 30); const expiring = batches.filter((batch) => batch.expiryDate && new Date(String(batch.expiryDate)) <= soon && Number(batch.remainingQuantity || 0) > 0)
    return { cards: [{ title: "Sản phẩm", value: products.length, suffix: "SP", color: "#246bfd" }, { title: "Tồn hiện có", value: totalQuantity, suffix: "đơn vị", color: "#089981" }, { title: "Kho đang dùng", value: warehouses.filter((row) => row.isActive !== false).length, suffix: "kho", color: "#7c3aed" }, { title: "Nhà cung cấp", value: suppliers.length, suffix: "NCC", color: "#e57c3a" }], alerts: [{ label: "Sản phẩm tồn thấp", value: `${lowStock.length} SP`, percent: products.length ? lowStock.length / products.length * 100 : 0, color: lowStock.length ? "error" : "success" }, { label: "Lô sắp hết hạn (30 ngày)", value: `${expiring.length} lô`, percent: batches.length ? expiring.length / batches.length * 100 : 0, color: expiring.length ? "warning" : "success" }, { label: "Lô hết tồn", value: `${batches.filter((batch) => Number(batch.remainingQuantity || 0) <= 0).length} lô`, percent: batches.length ? batches.filter((batch) => Number(batch.remainingQuantity || 0) <= 0).length / batches.length * 100 : 0, color: "processing" }], tableTitle: "Lô hàng cần chú ý", rows: [...lowStock.map((product) => ({ ...product, warning: "Tồn thấp" })), ...expiring.map((batch) => ({ ...batch, warning: "Sắp hết hạn" }))].slice(0, 20), columns: basicColumns(["code", "name", "batchNumber", "expiryDate", "remainingQuantity", "warning"]) }
  }
  const projects = data.projects || []; const tasks = data.tasks || []; const done = tasks.filter((row) => ["DONE", "COMPLETED"].includes(String(row.status).toUpperCase())).length; const overdue = tasks.filter((row) => row.dueDate && new Date(String(row.dueDate)) < new Date() && !["DONE", "COMPLETED"].includes(String(row.status).toUpperCase())).length
  return { cards: [{ title: "Dự án đang chạy", value: projects.filter((row) => String(row.status).toUpperCase() !== "COMPLETED").length, suffix: "dự án", color: "#246bfd" }, { title: "Tổng công việc", value: tasks.length, suffix: "việc", color: "#7c3aed" }, { title: "Hoàn thành", value: done, suffix: "việc", color: "#089981" }, { title: "Quá hạn", value: overdue, suffix: "việc", color: "#ef4444" }], alerts: [{ label: "Công việc quá hạn", value: `${overdue} việc`, percent: tasks.length ? overdue / tasks.length * 100 : 0, color: overdue ? "error" : "success" }, { label: "Tiến độ hoàn thành", value: `${tasks.length ? Math.round(done / tasks.length * 100) : 0}%`, percent: tasks.length ? done / tasks.length * 100 : 0, color: "success" }], tableTitle: "Công việc cần theo dõi", rows: tasks.filter((row) => !["DONE", "COMPLETED"].includes(String(row.status).toUpperCase())).slice(0, 20), columns: basicColumns(["code", "title", "projectId", "dueDate", "status"]) }
}

function buildSeries(kind: MonitorKind, data: Record<string, RowData[]>, period: Period) {
  const source = kind === "business" ? (data.invoices || []) : kind === "hr" ? (data.attendances || []) : kind === "inventory" ? (data["stock-batches"] || []) : (data.tasks || [])
  const buckets = new Map<string, number>(); const formatter = period === "Ngày" ? (date: Date) => date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) : period === "Tháng" ? (date: Date) => `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}` : (date: Date) => String(date.getFullYear())
  source.forEach((row) => { const date = new Date(String(row.issuedAt || row.orderDate || row.date || row.dueDate || row.createdAt || "")); if (Number.isNaN(date.getTime())) return; const key = formatter(date); buckets.set(key, (buckets.get(key) || 0) + (kind === "business" ? Number(row.paidAmount || row.totalAmount || 0) : 1)); })
  return [...buckets.entries()].slice(-12).map(([label, value]) => ({ label, value }))
}
function filterMonitorData(data: Record<string, RowData[]>, range: [Dayjs, Dayjs] | null) {
  if (!range) return data
  const [from, to] = range
  return Object.fromEntries(Object.entries(data).map(([resource, rows]) => [resource, rows.filter((row) => {
    const rawDate = row.issuedAt || row.orderDate || row.date || row.dueDate || row.appliedAt || row.scheduledAt || row.proposedStartDate || row.movementDate || row.createdAt
    if (!rawDate) return ["products", "warehouses", "suppliers", "staff", "recruitment-positions"].includes(resource)
    const date = dayjs(String(rawDate)); return date.isValid() && !date.isBefore(from.startOf("day")) && !date.isAfter(to.endOf("day"))
  })]))
}
function sum(rows: RowData[], field: string) { return rows.reduce((total, row) => total + Number(row[field] || 0), 0) }
function basicColumns(keys: string[]) { return keys.map((key) => ({ title: ({ code: "Mã", name: "Tên", customerId: "Khách hàng", totalAmount: "Tổng tiền", paidAmount: "Đã thu", status: "Trạng thái", staffId: "Nhân viên", startDate: "Từ ngày", endDate: "Đến ngày", leaveType: "Loại nghỉ", title: "Công việc", projectId: "Dự án", dueDate: "Hạn xử lý", batchNumber: "Số lô", expiryDate: "Hạn dùng", remainingQuantity: "Tồn còn", warning: "Cảnh báo" } as Record<string, string>)[key] || key, dataIndex: key, render: (value: unknown) => value === undefined || value === null || value === "" ? "—" : typeof value === "number" ? value.toLocaleString("vi-VN") : String(value) })) }
function MiniBars({ values, currency }: { values: Array<{ label: string; value: number }>; currency: boolean }) { const max = Math.max(...values.map((item) => item.value), 1); return <div className="monitor-bars">{values.length ? values.map((item) => <div className="monitor-bar" key={item.label}><Typography.Text type="secondary">{item.label}</Typography.Text><div className="monitor-bar-track"><div className="monitor-bar-fill" style={{ width: `${item.value / max * 100}%` }} /></div><Typography.Text strong>{currency ? `${item.value.toLocaleString("vi-VN")} ₫` : item.value.toLocaleString("vi-VN")}</Typography.Text></div>) : <Typography.Text type="secondary">Chưa có dữ liệu trong kỳ.</Typography.Text>}</div> }
