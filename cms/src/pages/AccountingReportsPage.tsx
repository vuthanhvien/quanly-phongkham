import { BankOutlined, DollarOutlined, FundOutlined, RiseOutlined } from "@ant-design/icons"
import { Button, Card, Col, DatePicker, Row, Select, Space, Statistic, Table, Tabs, Typography, message } from "antd"
import type { TabsProps } from "antd"
import dayjs, { Dayjs } from "dayjs"
import { useEffect, useMemo, useState } from "react"
import { api } from "../api"
import { getFirstOptionValue } from "../utils/branchDefaults"
import { getApiErrorMessage } from "../utils/apiError"

type ReportKey =
  | "general-ledger"
  | "trial-balance"
  | "cash-flow"
  | "receivables"
  | "payables"
  | "cash-book"
  | "bank-book"

type OptionRow = { id: string; name?: string; code?: string; accountNumber?: string; fullName?: string }

const REPORT_TABS: TabsProps["items"] = [
  { key: "general-ledger", label: "Sổ cái" },
  { key: "trial-balance", label: "Cân đối phát sinh" },
  { key: "cash-flow", label: "Dòng tiền" },
  { key: "receivables", label: "Phải thu" },
  { key: "payables", label: "Phải trả" },
  { key: "cash-book", label: "Sổ quỹ tiền mặt" },
  { key: "bank-book", label: "Sổ tiền gửi NH" },
]

export function AccountingReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportKey>("general-ledger")
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<any[]>([])
  const [summary, setSummary] = useState<Record<string, number>>({})
  const [branches, setBranches] = useState<OptionRow[]>([])
  const [periods, setPeriods] = useState<OptionRow[]>([])
  const [accounts, setAccounts] = useState<OptionRow[]>([])
  const [fromDate, setFromDate] = useState<Dayjs | null>(dayjs().startOf("month"))
  const [toDate, setToDate] = useState<Dayjs | null>(dayjs().endOf("month"))
  const [branchId, setBranchId] = useState<string>()
  const [periodId, setPeriodId] = useState<string>()
  const [accountId, setAccountId] = useState<string>()

  useEffect(() => {
    void loadLookups()
  }, [])

  useEffect(() => {
    void loadReport(activeTab)
  }, [activeTab])

  async function loadLookups() {
    try {
      const [branchResponse, periodResponse, accountResponse] = await Promise.all([
        api.get("/records/branches", { params: { pageSize: 500 } }),
        api.get("/records/accounting-periods", { params: { pageSize: 500 } }),
        api.get("/records/accounting-chart-accounts", { params: { pageSize: 500 } }),
      ])
      const nextBranches = branchResponse.data.data || []
      setBranches(nextBranches)
      setPeriods(periodResponse.data.data || [])
      setAccounts(accountResponse.data.data || [])
      setBranchId((current) => current || getFirstOptionValue(nextBranches))
    } catch (error: any) {
      message.error(getApiErrorMessage(error, "Không thể tải dữ liệu lọc báo cáo"))
    }
  }

  async function loadReport(reportKey = activeTab) {
    setLoading(true)
    try {
      const response = await api.get(`/reports/accounting/${reportKey}`, {
        params: buildParams(reportKey),
      })
      setRows(response.data.data || [])
      setSummary(response.data.summary || {})
    } catch (error: any) {
      message.error(getApiErrorMessage(error, "Không thể tải báo cáo"))
      setRows([])
      setSummary({})
    } finally {
      setLoading(false)
    }
  }

  function buildParams(reportKey: ReportKey) {
    const params: Record<string, string> = {}
    if (fromDate) params.fromDate = fromDate.format("YYYY-MM-DD")
    if (toDate) params.toDate = toDate.format("YYYY-MM-DD")
    if (branchId) params.branchId = branchId
    if (periodId) params.periodId = periodId
    if (needsAccountFilter(reportKey) && accountId) params.accountId = accountId
    return params
  }

  const columns = useMemo(() => getColumns(activeTab), [activeTab])
  const metricCards = useMemo(() => getMetricCards(activeTab, summary), [activeTab, summary])

  return (
    <>
      <div className="page-header">
        <div>
          <Typography.Title level={3}>Báo cáo kế toán</Typography.Title>
          <Typography.Text type="secondary">
            Xem sổ cái, phát sinh, dòng tiền và công nợ theo dữ liệu đã ghi sổ.
          </Typography.Text>
        </div>
      </div>

      <Card className="glass-card detail-card" style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} align="bottom">
          <Col xs={24} md={12} xl={4}>
            <Typography.Text type="secondary">Từ ngày</Typography.Text>
            <DatePicker style={{ width: "100%" }} value={fromDate} onChange={setFromDate} />
          </Col>
          <Col xs={24} md={12} xl={4}>
            <Typography.Text type="secondary">Đến ngày</Typography.Text>
            <DatePicker style={{ width: "100%" }} value={toDate} onChange={setToDate} />
          </Col>
          <Col xs={24} md={12} xl={4}>
            <Typography.Text type="secondary">Chi nhánh</Typography.Text>
            <Select
              allowClear
              options={branches.map((item) => ({ value: item.id, label: `${item.code || item.name || item.id}` }))}
              placeholder="Tất cả chi nhánh"
              style={{ width: "100%" }}
              value={branchId}
              onChange={setBranchId}
            />
          </Col>
          <Col xs={24} md={12} xl={4}>
            <Typography.Text type="secondary">Kỳ kế toán</Typography.Text>
            <Select
              allowClear
              options={periods.map((item) => ({ value: item.id, label: `${item.code || ""} ${item.name || ""}`.trim() }))}
              placeholder="Tất cả kỳ"
              style={{ width: "100%" }}
              value={periodId}
              onChange={setPeriodId}
            />
          </Col>
          <Col xs={24} md={12} xl={5}>
            <Typography.Text type="secondary">Tài khoản</Typography.Text>
            <Select
              allowClear
              disabled={!needsAccountFilter(activeTab)}
              options={accounts.map((item) => ({ value: item.id, label: `${item.accountNumber || ""} - ${item.name || ""}` }))}
              placeholder={needsAccountFilter(activeTab) ? "Chọn tài khoản" : "Không áp dụng"}
              style={{ width: "100%" }}
              value={accountId}
              onChange={setAccountId}
            />
          </Col>
          <Col xs={24} md={12} xl={3}>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button className="primary-glow" type="primary" onClick={() => void loadReport()}>
                Xem báo cáo
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {metricCards.map((item) => (
          <Col key={item.title} xs={24} md={12} xl={6}>
            <Card className="glass-card detail-card">
              <Statistic
                title={item.title}
                value={item.value}
                prefix={item.icon}
                formatter={(value) => formatNumber(value)}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="table-card">
        <Tabs
          activeKey={activeTab}
          items={REPORT_TABS}
          onChange={(key) => setActiveTab(key as ReportKey)}
        />
        <Table
          columns={columns}
          dataSource={rows}
          loading={loading}
          pagination={{ pageSize: 50 }}
          rowKey={(row) => row.id || row.voucherId || row.customerId || row.supplierId || `${row.accountNumber}-${row.voucherCode}`}
          scroll={{ x: "max-content" }}
        />
      </Card>
    </>
  )
}

function needsAccountFilter(reportKey: ReportKey) {
  return reportKey === "general-ledger"
}

function getMetricCards(reportKey: ReportKey, summary: Record<string, number>) {
  if (reportKey === "trial-balance") {
    return [
      { title: "Tổng phát sinh Nợ", value: summary.totalDebit || 0, icon: <RiseOutlined /> },
      { title: "Tổng phát sinh Có", value: summary.totalCredit || 0, icon: <FundOutlined /> },
    ]
  }
  if (reportKey === "cash-flow") {
    return [
      { title: "Tổng thu", value: summary.inflow || 0, icon: <DollarOutlined /> },
      { title: "Tổng chi", value: summary.outflow || 0, icon: <BankOutlined /> },
      { title: "Lưu chuyển thuần", value: summary.netAmount || 0, icon: <FundOutlined /> },
    ]
  }
  if (reportKey === "receivables") {
    return [{ title: "Dư phải thu", value: summary.receivableBalance || 0, icon: <RiseOutlined /> }]
  }
  if (reportKey === "payables") {
    return [{ title: "Dư phải trả", value: summary.payableBalance || 0, icon: <BankOutlined /> }]
  }
  if (reportKey === "cash-book" || reportKey === "bank-book") {
    return [
      { title: "Tổng thu", value: summary.totalInflow || 0, icon: <DollarOutlined /> },
      { title: "Tổng chi", value: summary.totalOutflow || 0, icon: <BankOutlined /> },
      { title: "Số dư cuối", value: summary.endingBalance || 0, icon: <FundOutlined /> },
    ]
  }
  return [
    { title: "Số dòng", value: summary.totalRows || 0, icon: <FundOutlined /> },
  ]
}

function getColumns(reportKey: ReportKey) {
  if (reportKey === "general-ledger") {
    return [
      { title: "Ngày hạch toán", dataIndex: "accountingDate", key: "accountingDate", width: 130 },
      { title: "Chứng từ", dataIndex: "voucherCode", key: "voucherCode", width: 160 },
      { title: "Tài khoản", dataIndex: "accountNumber", key: "accountNumber", width: 120 },
      { title: "Tên tài khoản", dataIndex: "accountName", key: "accountName", width: 220 },
      { title: "Diễn giải", dataIndex: "description", key: "description", width: 320 },
      { title: "Nợ", dataIndex: "debitAmount", key: "debitAmount", width: 140, render: formatNumber },
      { title: "Có", dataIndex: "creditAmount", key: "creditAmount", width: 140, render: formatNumber },
    ]
  }
  if (reportKey === "trial-balance") {
    return [
      { title: "Tài khoản", dataIndex: "accountNumber", key: "accountNumber", width: 120 },
      { title: "Tên tài khoản", dataIndex: "accountName", key: "accountName", width: 260 },
      { title: "Phát sinh Nợ", dataIndex: "totalDebit", key: "totalDebit", width: 160, render: formatNumber },
      { title: "Phát sinh Có", dataIndex: "totalCredit", key: "totalCredit", width: 160, render: formatNumber },
      { title: "Số dư", dataIndex: "balance", key: "balance", width: 160, render: formatNumber },
    ]
  }
  if (reportKey === "cash-flow") {
    return [
      { title: "Mã", dataIndex: "code", key: "code", width: 120 },
      { title: "Chỉ tiêu", dataIndex: "name", key: "name", width: 320 },
      { title: "Loại", dataIndex: "section", key: "section", width: 160 },
      { title: "Thu vào", dataIndex: "inflow", key: "inflow", width: 160, render: formatNumber },
      { title: "Chi ra", dataIndex: "outflow", key: "outflow", width: 160, render: formatNumber },
      { title: "Thuần", dataIndex: "netAmount", key: "netAmount", width: 160, render: formatNumber },
    ]
  }
  if (reportKey === "receivables") {
    return [
      { title: "Mã KH", dataIndex: "customerCode", key: "customerCode", width: 120 },
      { title: "Khách hàng", dataIndex: "customerName", key: "customerName", width: 260 },
      { title: "Phát sinh Nợ", dataIndex: "totalDebit", key: "totalDebit", width: 160, render: formatNumber },
      { title: "Phát sinh Có", dataIndex: "totalCredit", key: "totalCredit", width: 160, render: formatNumber },
      { title: "Dư phải thu", dataIndex: "balance", key: "balance", width: 160, render: formatNumber },
    ]
  }
  if (reportKey === "payables") {
    return [
      { title: "Mã NCC", dataIndex: "supplierCode", key: "supplierCode", width: 120 },
      { title: "Nhà cung cấp", dataIndex: "supplierName", key: "supplierName", width: 260 },
      { title: "Phát sinh Nợ", dataIndex: "totalDebit", key: "totalDebit", width: 160, render: formatNumber },
      { title: "Phát sinh Có", dataIndex: "totalCredit", key: "totalCredit", width: 160, render: formatNumber },
      { title: "Dư phải trả", dataIndex: "balance", key: "balance", width: 160, render: formatNumber },
    ]
  }
  return [
    { title: "Ngày", dataIndex: "accountingDate", key: "accountingDate", width: 130 },
    { title: "Chứng từ", dataIndex: "voucherCode", key: "voucherCode", width: 160 },
    { title: "Tài khoản", dataIndex: "accountNumber", key: "accountNumber", width: 120 },
    { title: "Diễn giải", dataIndex: "description", key: "description", width: 320 },
    { title: "Thu", dataIndex: "debitAmount", key: "debitAmount", width: 140, render: formatNumber },
    { title: "Chi", dataIndex: "creditAmount", key: "creditAmount", width: 140, render: formatNumber },
    { title: "Số dư", dataIndex: "runningBalance", key: "runningBalance", width: 160, render: formatNumber },
  ]
}

function formatNumber(value: unknown) {
  const amount = Number(value || 0)
  return new Intl.NumberFormat("vi-VN").format(amount)
}
