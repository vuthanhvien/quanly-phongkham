import { DatabaseOutlined, ReloadOutlined } from "@ant-design/icons"
import { Button, Card, Select, Space, Statistic, Table, Typography } from "antd"
import { useEffect, useMemo, useState } from "react"
import { api } from "../api"
import { useAppUi } from "../app-ui"
import { getApiErrorMessage } from "../utils/apiError"
import { toastError } from "../toast"

type StockBatch = { id: string; productId?: string; branchId?: string; storageLocation?: string; batchNumber?: string; expiryDate?: string; remainingQuantity?: number; unit?: string }
type Option = { value: string; label: string }

export function InventoryPage() {
  const { settings } = useAppUi()
  const [loading, setLoading] = useState(false)
  const [batches, setBatches] = useState<StockBatch[]>([])
  const [products, setProducts] = useState<Record<string, string>>({})
  const [branches, setBranches] = useState<Record<string, string>>({})
  const [branchId, setBranchId] = useState<string>()

  const load = async () => {
    setLoading(true)
    try {
      const [batchResponse, productResponse, branchResponse] = await Promise.all([
        api.get("/records/stock-batches", { params: { pageSize: 1000 } }),
        api.get("/records/products", { params: { pageSize: 1000 } }),
        api.get("/records/branches", { params: { pageSize: 200 } }),
      ])
      setBatches(batchResponse.data.data || [])
      setProducts(Object.fromEntries((productResponse.data.data || []).map((row: Record<string, unknown>) => [String(row.id), [row.code, row.name].filter(Boolean).join(" · ") || String(row.id)])))
      setBranches(Object.fromEntries((branchResponse.data.data || []).map((row: Record<string, unknown>) => [String(row.id), String(row.name || row.slug || row.id)])))
    } catch (error) {
      toastError(getApiErrorMessage(error, "Không tải được tồn kho"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])
  const filteredBatches = useMemo(() => batches.filter((batch) => !branchId || batch.branchId === branchId), [batches, branchId])
  const rows = useMemo(() => {
    const groups = new Map<string, { key: string; product: string; unit: string; quantity: number; batches: StockBatch[] }>()
    filteredBatches.forEach((batch) => {
      const key = `${batch.productId || ""}:${batch.unit || ""}:${settings.clinicFeatures.stockLocations ? batch.storageLocation || "" : ""}`
      const group = groups.get(key) || { key, product: products[String(batch.productId || "")] || "SP chưa xác định", unit: String(batch.unit || ""), quantity: 0, batches: [] }
      group.quantity += Number(batch.remainingQuantity || 0)
      group.batches.push(batch)
      groups.set(key, group)
    })
    return [...groups.values()].sort((left, right) => left.product.localeCompare(right.product, "vi"))
  }, [filteredBatches, products, settings.clinicFeatures.stockLocations])
  const branchOptions: Option[] = Object.entries(branches).map(([value, label]) => ({ value, label }))
  const totalStock = rows.reduce((total, row) => total + row.quantity, 0)
  const lotTracking = settings.clinicFeatures.lotTracking

  return <>
    <div className="page-header">
      <Typography.Title className="page-title-with-icon" level={3}><DatabaseOutlined /><span>Tồn kho</span></Typography.Title>
      <Space wrap>
        <Select allowClear options={branchOptions} placeholder="Tất cả chi nhánh" style={{ width: 220 }} value={branchId} onChange={setBranchId} />
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>Tải lại</Button>
      </Space>
    </div>
    <Card className="glass-card table-card" title="Tồn theo SP" extra={<Statistic suffix="đơn vị" title="Tổng tồn" value={totalStock} />}>
      <Table
        loading={loading}
        dataSource={rows}
        pagination={{ pageSize: 50, showSizeChanger: true }}
        expandable={lotTracking ? {
          rowExpandable: (row) => row.batches.length > 0,
          expandedRowRender: (row) => <Table<StockBatch> size="small" rowKey="id" pagination={false} dataSource={row.batches} columns={[
            { title: "Chi nhánh", dataIndex: "branchId", render: (value) => branches[String(value)] || "—" },
            { title: "Số lô", dataIndex: "batchNumber", render: (value) => value || "—" },
            { title: "Hạn dùng", dataIndex: "expiryDate", render: (value) => value ? String(value).split("-").reverse().join("/") : "—" },
            { title: "Tồn còn", dataIndex: "remainingQuantity", align: "right", render: (value) => Number(value || 0).toLocaleString("vi-VN") },
            { title: "Đơn vị", dataIndex: "unit", render: (value) => value || "—" },
          ]} />,
        } : undefined}
        columns={[
          { title: "SP", dataIndex: "product", render: (value: string) => <Typography.Text strong>{value}</Typography.Text> },
          ...(settings.clinicFeatures.stockLocations ? [{ title: "Vị trí kho / phòng", dataIndex: "batches", width: 180, render: (value: StockBatch[]) => value[0]?.storageLocation || "Kho chính" }] : []),
          { title: "Tồn hiện có", dataIndex: "quantity", align: "right", width: 180, render: (value: number) => value.toLocaleString("vi-VN") },
          { title: "Đơn vị", dataIndex: "unit", width: 150, render: (value: string) => value || "—" },
          ...(lotTracking ? [{ title: "Số lô", dataIndex: "batches", width: 120, align: "right" as const, render: (value: StockBatch[]) => value.length }] : []),
        ]}
      />
    </Card>
  </>
}
