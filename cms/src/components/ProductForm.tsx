import { DeleteOutlined, PlusOutlined } from "@ant-design/icons"
import { Button, Card, Form, Input, InputNumber, Select, Space, Table, Typography, message } from "antd"
import type { ColumnsType } from "antd/es/table"
import { useEffect, useMemo, useState } from "react"
import { api } from "../api"
import { getApiErrorMessage } from "../utils/apiError"

interface ProductFormProps {
  id?: string
  compact?: boolean
  initialValues?: Record<string, unknown>
  onCancel?: () => void
  onSuccess?: () => void
}

type BundleItem = { productId?: string; quantity?: number }
type ProductOption = { value: string; label: string; productType: string }

export function ProductForm({ id, compact, initialValues, onCancel, onSuccess }: ProductFormProps) {
  const editing = Boolean(id)
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [products, setProducts] = useState<ProductOption[]>([])
  const productType = Form.useWatch("productType", form)
  const bundleItems = Form.useWatch("bundleItems", form) as BundleItem[] | undefined

  useEffect(() => { void loadProducts() }, [])
  useEffect(() => {
    if (editing) { void loadRecord(); return }
    form.setFieldsValue({ productType: "CONSUMABLE", purchaseUnit: "hộp", usageUnit: "cái", conversionFactor: 1, sellingPrice: 0, minStockLevel: 0, bundleItems: [], ...(initialValues || {}) })
  }, [editing, form, id, initialValues])

  async function loadProducts() {
    try {
      const response = await api.get("/records/products", { params: { pageSize: 500 } })
      setProducts((response.data.data || []).map((item: Record<string, unknown>) => ({
        value: String(item.id), label: `${item.code || ""} - ${item.name || item.id}`, productType: String(item.productType || ""),
      })))
    } catch (error) { message.error(getApiErrorMessage(error, "Không tải được danh sách sản phẩm")) }
  }

  async function loadRecord() {
    try {
      const response = await api.get(`/records/products/${id}`)
      form.setFieldsValue({ ...response.data.data, ...(initialValues || {}), bundleItems: normalizeBundleItems(response.data.data?.bundleItems) })
    } catch (error) { message.error(getApiErrorMessage(error, "Không tải được sản phẩm")) }
  }

  async function submit(values: Record<string, unknown>) {
    const items = normalizeBundleItems(form.getFieldValue("bundleItems"))
    if (values.productType === "COMBO" && items.length === 0) { message.error("Combo cần có ít nhất một sản phẩm/dịch vụ thành phần"); return }
    setSubmitting(true)
    try {
      const payload = { ...values, bundleItems: values.productType === "COMBO" ? items : [] }
      if (editing) await api.patch(`/records/products/${id}`, payload)
      else await api.post("/records/products", payload)
      message.success("Đã lưu sản phẩm")
      onSuccess?.()
    } catch (error) { message.error(getApiErrorMessage(error, "Không thể lưu sản phẩm")) }
    finally { setSubmitting(false) }
  }

  function setBundleItems(items: BundleItem[]) { form.setFieldsValue({ bundleItems: items }) }
  const componentOptions = useMemo(() => products.filter((product) => product.value !== id && product.productType !== "COMBO"), [products, id])
  const rows = normalizeBundleItems(bundleItems).map((item, index) => ({ ...item, key: index, index }))
  const columns: ColumnsType<BundleItem & { key: number; index: number }> = [
    { title: "Sản phẩm / dịch vụ", dataIndex: "productId", render: (_value, row) => <Select showSearch optionFilterProp="label" options={componentOptions} placeholder="Chọn thành phần" value={row.productId} onChange={(productId) => { const items = normalizeBundleItems(form.getFieldValue("bundleItems")); items[row.index] = { ...items[row.index], productId }; setBundleItems(items) }} /> },
    { title: "SL / số buổi", dataIndex: "quantity", width: 150, render: (_value, row) => <InputNumber min={1} style={{ width: "100%" }} value={row.quantity} onChange={(quantity) => { const items = normalizeBundleItems(form.getFieldValue("bundleItems")); items[row.index] = { ...items[row.index], quantity: Number(quantity || 0) }; setBundleItems(items) }} /> },
    { title: "", width: 52, render: (_value, row) => <Button danger type="text" icon={<DeleteOutlined />} onClick={() => { const items = normalizeBundleItems(form.getFieldValue("bundleItems")); items.splice(row.index, 1); setBundleItems(items) }} /> },
  ]

  return <>
    {!compact && <Typography.Title level={3}>{editing ? "Cập nhật" : "Thêm"} sản phẩm</Typography.Title>}
    <Form form={form} layout="vertical" onFinish={(values) => void submit(values)}>
      <div className="service-order-grid">
        <Form.Item label="Mã SP" name="code" rules={[{ required: true, message: "Nhập mã sản phẩm" }]}><Input /></Form.Item>
        <Form.Item label="Tên sản phẩm" name="name" rules={[{ required: true, message: "Nhập tên sản phẩm" }]}><Input /></Form.Item>
        <Form.Item label="Mã vạch" name="barcode"><Input /></Form.Item>
        <Form.Item label="Loại" name="productType"><Select options={[{ value: "CONSUMABLE", label: "Vật tư tiêu hao" }, { value: "REUSABLE", label: "Thiết bị tái dùng" }, { value: "RETAIL", label: "Sản phẩm bán lẻ" }, { value: "SERVICE", label: "Dịch vụ" }, { value: "COMBO", label: "Combo / Gói dịch vụ" }]} /></Form.Item>
        <Form.Item label="Ngành / nhóm / loại" name="category"><Input /></Form.Item>
        <Form.Item label="Đơn vị nhập" name="purchaseUnit"><Input /></Form.Item>
        <Form.Item label="Đơn vị xuất" name="usageUnit"><Input /></Form.Item>
        <Form.Item label="Quy đổi" name="conversionFactor"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
        <Form.Item label="Giá bán gói / SP" name="sellingPrice"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
        <Form.Item label="Tồn tối thiểu" name="minStockLevel"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
      </div>
      {productType === "COMBO" && <Card className="glass-card service-order-items-card" title="Thành phần của combo" extra={<Button icon={<PlusOutlined />} onClick={() => setBundleItems([...normalizeBundleItems(form.getFieldValue("bundleItems")), { quantity: 1 }])}>Thêm thành phần</Button>}>
        <Typography.Paragraph type="secondary">Khi chọn combo trong đơn, các thành phần này sẽ tự được thêm vào. Giá bán vẫn lấy theo giá của combo.</Typography.Paragraph>
        <Table columns={columns} dataSource={rows} pagination={false} rowKey="key" />
      </Card>}
      <Space><Button className="primary-glow" htmlType="submit" loading={submitting} type="primary">Lưu</Button><Button onClick={onCancel}>Hủy</Button></Space>
    </Form>
  </>
}

function normalizeBundleItems(value: unknown): BundleItem[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => ({ productId: (item as Record<string, unknown>)?.productId ? String((item as Record<string, unknown>).productId) : undefined, quantity: Number((item as Record<string, unknown>)?.quantity || 0) }))
}
