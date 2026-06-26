import {
  CalculatorOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  EyeOutlined,
  PlusOutlined,
} from "@ant-design/icons"
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Form,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd"
import { useEffect, useState } from "react"
import { api } from "../api"

interface Staff {
  id: string
  fullName: string
  code: string
}

interface Payroll {
  id: string
  staffId: string
  month: number
  year: number
  baseSalary: number
  workingDays: number
  actualDays: number
  overtimeHours: number
  bonus: number
  deduction: number
  netSalary: number
  status: string
  branchId?: string
  note?: string
}

interface GenerateMeta {
  contract: { contractType: string; baseSalary: number }
  attendanceSummary: { total: number; actualDays: number }
  insuranceBreakdown: { type: string; rate: number; amount: number }[]
  pit: {
    grossSalary: number
    insuranceDeduction: number
    personalDeduction: number
    dependants: number
    dependantDeduction: number
    taxableIncome: number
    pitTax: number
  }
  grossSalary: number
  insuranceDeduction: number
  pitTax: number
  totalDeduction: number
  netSalary: number
}

const STATUS_COLOR: Record<string, string> = { draft: "default", confirmed: "processing", paid: "success" }
const STATUS_LABEL: Record<string, string> = { draft: "Nháp", confirmed: "Đã xác nhận", paid: "Đã thanh toán" }

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }))
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i).map((y) => ({ value: y, label: String(y) }))

function fmt(n: number) {
  return n.toLocaleString("vi-VN") + " ₫"
}

export function PayrollsPage() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [loading, setLoading] = useState(false)

  const [genOpen, setGenOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState<{ done: number; total: number } | null>(null)
  const [genResult, setGenResult] = useState<{ payroll: Payroll; meta: GenerateMeta } | null>(null)
  const [batchResult, setBatchResult] = useState<{ success: string[]; failed: { name: string; error: string }[] } | null>(null)
  const [genForm] = Form.useForm()

  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1)
  const [filterYear, setFilterYear] = useState(CURRENT_YEAR)

  useEffect(() => { void loadStaff() }, [])
  useEffect(() => { void loadPayrolls() }, [filterMonth, filterYear])

  async function loadStaff() {
    try {
      const sr = await api.get("/records/staff", { params: { pageSize: 500 } })
      setStaffList(sr.data.data.map((r: Record<string, unknown>) => ({
        id: String(r.id),
        fullName: String(r.fullName || r.code),
        code: String(r.code),
      })))
    } catch {
      // ignore
    }
  }

  async function loadPayrolls() {
    setLoading(true)
    try {
      const pr = await api.get("/records/payrolls", { params: { pageSize: 500 } })
      const all = pr.data.data as Payroll[]
      setPayrolls(all.filter((p) => p.month === filterMonth && p.year === filterYear))
    } catch {
      setPayrolls([])
    } finally {
      setLoading(false)
    }
  }

  async function load() {
    await Promise.all([loadStaff(), loadPayrolls()])
  }

  async function runGenerate(values: Record<string, unknown>) {
    const isAll = values.staffId === "__ALL__"
    const targets = isAll ? staffList.map((s) => s.id) : [values.staffId as string]

    setGenerating(true)
    setGenResult(null)
    setBatchResult(null)
    setGenProgress(isAll ? { done: 0, total: targets.length } : null)

    if (!isAll) {
      try {
        const res = await api.post("/payroll/generate", values)
        setGenResult({ payroll: res.data.data as Payroll, meta: res.data.meta as GenerateMeta })
        void message.success("Đã tính lương thành công")
        await load()
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Có lỗi xảy ra"
        void message.error(msg)
        setGenerating(false)
      } finally {
        setGenerating(false)
      }
      return
    }

    // Batch: tính lần lượt từng NV
    const success: string[] = []
    const failed: { name: string; error: string }[] = []
    const staffMap2 = Object.fromEntries(staffList.map((s) => [s.id, `${s.fullName} (${s.code})`]))

    for (let i = 0; i < targets.length; i++) {
      const id = targets[i]
      try {
        await api.post("/payroll/generate", { ...values, staffId: id })
        success.push(staffMap2[id] || id)
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Lỗi không xác định"
        failed.push({ name: staffMap2[id] || id, error: msg })
      }
      setGenProgress({ done: i + 1, total: targets.length })
    }

    setBatchResult({ success, failed })
    setGenerating(false)
    setGenProgress(null)
    await load()
  }

  function openGenerate() {
    setGenResult(null)
    setBatchResult(null)
    setGenProgress(null)
    genForm.resetFields()
    genForm.setFieldsValue({ month: filterMonth, year: filterYear })
    setGenOpen(true)
  }

  const staffMap = Object.fromEntries(staffList.map((s) => [s.id, `${s.fullName} (${s.code})`]))

  const columns = [
    {
      title: "Nhân viên",
      dataIndex: "staffId",
      key: "staff",
      render: (v: string) => staffMap[v] || v,
      tableWidth: 220,
    },
    { title: "Tháng", key: "period", render: (_: unknown, r: Payroll) => `T${r.month}/${r.year}`, width: 100 },
    { title: "Lương cơ bản", dataIndex: "baseSalary", key: "base", render: fmt, width: 160 },
    { title: "Ngày công", key: "days", render: (_: unknown, r: Payroll) => `${r.actualDays}/${r.workingDays}`, width: 120 },
    { title: "Khấu trừ", dataIndex: "deduction", key: "deduction", render: fmt, width: 140 },
    { title: "Thưởng", dataIndex: "bonus", key: "bonus", render: fmt, width: 130 },
    {
      title: "Thực lãnh",
      dataIndex: "netSalary",
      key: "net",
      render: (v: number) => <Typography.Text strong style={{ color: "#52c41a" }}>{fmt(v)}</Typography.Text>,
      width: 160,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (v: string) => <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v] || v}</Tag>,
    },
  ]

  return (
    <>
      <div className="page-header">
        <Typography.Title level={3} style={{ margin: 0 }}>Bảng lương</Typography.Title>
        <Space>
          <Select value={filterMonth} onChange={setFilterMonth} options={MONTHS} style={{ width: 120 }} />
          <Select value={filterYear} onChange={setFilterYear} options={YEARS} style={{ width: 100 }} />
          <Button type="primary" icon={<CalculatorOutlined />} onClick={openGenerate} className="primary-glow">
            Tính lương
          </Button>
        </Space>
      </div>

      <Card className="glass-card">
        <Table
          rowKey="id"
          loading={loading}
          dataSource={payrolls}
          columns={columns}
          pagination={{ pageSize: 50 }}
          size="small"
          scroll={{ x: "max-content" }}
        />
      </Card>

      {/* Modal tính lương */}
      <Modal
        title={<Space><CalculatorOutlined /> Tính lương tự động</Space>}
        open={genOpen}
        footer={null}
        width={640}
        maskClosable={false}
        onCancel={() => { setGenOpen(false); setGenResult(null) }}
      >
        {!genResult && !batchResult ? (
          <Form form={genForm} layout="vertical" onFinish={runGenerate}>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="staffId" label="Nhân viên" rules={[{ required: true }]}>
                  <Select
                    showSearch
                    placeholder="Chọn nhân viên..."
                    optionFilterProp="label"
                    options={[
                      { value: "__ALL__", label: "🟢 Tất cả nhân viên" },
                      ...staffList.map((s) => ({ value: s.id, label: `${s.fullName} (${s.code})` })),
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="month" label="Tháng" rules={[{ required: true }]}>
                  <Select options={MONTHS} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="year" label="Năm" rules={[{ required: true }]}>
                  <Select options={YEARS} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="bonus" label="Thưởng thêm" initialValue={0}>
                  <InputNumber style={{ width: "100%" }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} min={0} addonAfter="₫" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="deduction" label="Khấu trừ thêm (ngoài BH)" initialValue={0}>
                  <InputNumber style={{ width: "100%" }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} min={0} addonAfter="₫" />
                </Form.Item>
              </Col>
            </Row>
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="Hệ thống sẽ tự động tính dựa trên hợp đồng lao động đang hiệu lực, dữ liệu chấm công trong tháng, và các khoản bảo hiểm đã cấu hình (mặc định theo luật VN: BHXH 8% + BHYT 1.5% + BHTN 1%)."
            />
            <Button type="primary" htmlType="submit" loading={generating} block icon={<CalculatorOutlined />} className="primary-glow">
              {generating && genProgress ? `Đang tính... (${genProgress.done}/${genProgress.total})` : "Tính lương"}
            </Button>
          </Form>
        ) : genResult ? (
          <div>
            <Alert
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
              message="Đã tính lương thành công"
              style={{ marginBottom: 16 }}
            />
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Loại HĐ">{genResult.meta.contract.contractType}</Descriptions.Item>
              <Descriptions.Item label="Lương cơ bản">{fmt(genResult.meta.contract.baseSalary)}</Descriptions.Item>
              <Descriptions.Item label="Ngày công thực tế">{genResult.meta.attendanceSummary.actualDays} ngày</Descriptions.Item>
              <Descriptions.Item label="Bản ghi chấm công">{genResult.meta.attendanceSummary.total} bản ghi</Descriptions.Item>
              <Descriptions.Item label="Lương gộp" span={2}>{fmt(genResult.meta.grossSalary)}</Descriptions.Item>
            </Descriptions>
            <Divider orientation="left" style={{ fontSize: 13 }}>Các khoản bảo hiểm (NV đóng)</Divider>
            {genResult.meta.insuranceBreakdown.map((ins) => (
              <Row key={ins.type} justify="space-between" style={{ marginBottom: 4, fontSize: 13 }}>
                <Col><Tag color="blue">{ins.type}</Tag> {ins.rate}%</Col>
                <Col><Typography.Text type="danger">- {fmt(ins.amount)}</Typography.Text></Col>
              </Row>
            ))}
            <Divider />
            <Row justify="space-between" style={{ fontSize: 15 }}>
              <Col><Typography.Text strong>Tổng khấu trừ BH</Typography.Text></Col>
              <Col><Typography.Text type="danger" strong>- {fmt(genResult.meta.insuranceDeduction)}</Typography.Text></Col>
            </Row>
            <Divider orientation="left" style={{ fontSize: 13 }}>Thuế TNCN</Divider>
            <Row justify="space-between" style={{ marginBottom: 4, fontSize: 13 }}>
              <Col>Lương gộp</Col>
              <Col>{fmt(genResult.meta.pit.grossSalary)}</Col>
            </Row>
            <Row justify="space-between" style={{ marginBottom: 4, fontSize: 13 }}>
              <Col>- Giảm trừ bản thân</Col>
              <Col><Typography.Text type="secondary">- {fmt(genResult.meta.pit.personalDeduction)}</Typography.Text></Col>
            </Row>
            {genResult.meta.pit.dependants > 0 && (
              <Row justify="space-between" style={{ marginBottom: 4, fontSize: 13 }}>
                <Col>- Giảm trừ người phụ thuộc ({genResult.meta.pit.dependants} người)</Col>
                <Col><Typography.Text type="secondary">- {fmt(genResult.meta.pit.dependantDeduction)}</Typography.Text></Col>
              </Row>
            )}
            <Row justify="space-between" style={{ marginBottom: 4, fontSize: 13 }}>
              <Col><strong>Thu nhập chịu thuế</strong></Col>
              <Col><strong>{fmt(genResult.meta.pit.taxableIncome)}</strong></Col>
            </Row>
            <Row justify="space-between" style={{ fontSize: 13 }}>
              <Col>Thuế TNCN phải nộp</Col>
              <Col><Typography.Text type="danger">- {fmt(genResult.meta.pit.pitTax)}</Typography.Text></Col>
            </Row>
            {genResult.payroll.bonus > 0 && (
              <Row justify="space-between" style={{ marginTop: 8, fontSize: 15 }}>
                <Col><Typography.Text strong>Thưởng</Typography.Text></Col>
                <Col><Typography.Text style={{ color: "#52c41a" }} strong>+ {fmt(genResult.payroll.bonus)}</Typography.Text></Col>
              </Row>
            )}
            <Divider />
            <Row justify="space-between" style={{ fontSize: 18 }}>
              <Col><Typography.Text strong><DollarOutlined /> Thực lãnh</Typography.Text></Col>
              <Col><Typography.Text strong style={{ color: "#52c41a", fontSize: 20 }}>{fmt(genResult.meta.netSalary)}</Typography.Text></Col>
            </Row>
            <Button
              type="primary"
              block
              icon={<EyeOutlined />}
              style={{ marginTop: 16 }}
              onClick={() => { setGenOpen(false); setGenResult(null) }}
            >
              Đóng
            </Button>
          </div>
        ) : batchResult ? (
          <div>
            <Alert
              type={batchResult.failed.length === 0 ? "success" : "warning"}
              showIcon
              message={`Hoàn tất: ${batchResult.success.length} thành công, ${batchResult.failed.length} thất bại`}
              style={{ marginBottom: 16 }}
            />
            {batchResult.success.length > 0 && (
              <>
                <Typography.Text strong style={{ color: "#52c41a" }}>Thành công ({batchResult.success.length})</Typography.Text>
                <ul style={{ marginTop: 4, marginBottom: 12, paddingLeft: 20, maxHeight: 160, overflowY: "auto" }}>
                  {batchResult.success.map((name) => <li key={name} style={{ fontSize: 13 }}>{name}</li>)}
                </ul>
              </>
            )}
            {batchResult.failed.length > 0 && (
              <>
                <Typography.Text strong type="danger">Thất bại ({batchResult.failed.length})</Typography.Text>
                <ul style={{ marginTop: 4, marginBottom: 12, paddingLeft: 20, maxHeight: 160, overflowY: "auto" }}>
                  {batchResult.failed.map((f) => (
                    <li key={f.name} style={{ fontSize: 13 }}>
                      <strong>{f.name}</strong>: <Typography.Text type="secondary">{f.error}</Typography.Text>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <Button block onClick={() => { setGenOpen(false); setBatchResult(null) }}>Đóng</Button>
          </div>
        ) : null}
      </Modal>
    </>
  )
}
