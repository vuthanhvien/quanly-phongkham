import { DeleteOutlined, PlusOutlined } from "@ant-design/icons"
import { Button, Card, Form, Input, InputNumber, Select, Space, Switch, Table, Typography, message } from "antd"
import type { ColumnsType } from "antd/es/table"
import { useEffect, useMemo, useState } from "react"
import { api } from "../api"
import { getApiErrorMessage } from "../utils/apiError"
import { formatNumberInput, parseNumberInput } from "../utils/numberInput"
import { RecordDraftControls } from "./RecordDraftControls"

interface ProductFormProps {
  id?: string
  compact?: boolean
  initialValues?: Record<string, unknown>
  onCancel?: () => void
  onSuccess?: () => void
}

type BundleItem = { productId?: string; quantity?: number }
type VariantItem = { id?: string; code?: string; name?: string; barcode?: string; attributeSummary?: string; sellingPrice?: number; minStockLevel?: number; isActive?: boolean }
type ProductOption = { value: string; label: string; productType: string }
type ProductCategory = { id: string; name: string; parentId?: string; level: number; isActive: boolean }
type UnitOption = { value: string; label: string }

export function ProductForm({ id, compact, initialValues, onCancel, onSuccess }: ProductFormProps) {
  const editing = Boolean(id)
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [products, setProducts] = useState<ProductOption[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [units, setUnits] = useState<UnitOption[]>([])
  const productType = Form.useWatch("productType", form)
  const bundleItems = Form.useWatch("bundleItems", { form, preserve: true }) as BundleItem[] | undefined
  const hasVariants = Form.useWatch("hasVariants", form) as boolean | undefined
  const variants = Form.useWatch("variants", { form, preserve: true }) as VariantItem[] | undefined

  useEffect(() => { void Promise.all([loadProducts(), loadCategories(), loadUnits()]) }, [])
  useEffect(() => {
    if (editing) { void loadRecord(); return }
    form.setFieldsValue({ productType: "CONSUMABLE", sellingPrice: 0, minStockLevel: 0, bundleItems: [], variants: [], ...(initialValues || {}) })
  }, [editing, form, id, initialValues])

  async function loadProducts() {
    try {
      const response = await api.get("/records/products", { params: { pageSize: 500 } })
      setProducts((response.data.data || []).map((item: Record<string, unknown>) => ({
        value: String(item.id), label: `${item.code || ""} - ${item.name || item.id}`, productType: String(item.productType || ""),
      })))
    } catch (error) { message.error(getApiErrorMessage(error, "Không tải được danh sách sản phẩm")) }
  }

  async function loadCategories() {
    try {
      const response = await api.get("/product-categories")
      setCategories((response.data.data || []).map((item: Record<string, unknown>) => ({
        id: String(item.id),
        name: String(item.name || ""),
        parentId: item.parentId ? String(item.parentId) : undefined,
        level: Number(item.level || 1),
        isActive: item.isActive !== false,
      })))
    } catch (error) { message.error(getApiErrorMessage(error, "Không tải được danh mục sản phẩm")) }
  }

  async function loadUnits() {
    try {
      const response = await api.get("/records/units", { params: { pageSize: 500 } })
      // A product is stocked in the root unit; conversion units are selected on movements.
      setUnits((response.data.data || []).filter((item: Record<string, unknown>) => !item.baseUnitId).map((item: Record<string, unknown>) => ({ value: String(item.id), label: String(item.name || item.id) })))
    } catch (error) { message.error(getApiErrorMessage(error, "Không tải được đơn vị tính")) }
  }

  async function loadRecord() {
    try {
      const response = await api.get(`/records/products/${id}`)
      form.setFieldsValue({ ...response.data.data, ...(initialValues || {}), bundleItems: normalizeBundleItems(response.data.data?.bundleItems), variants: normalizeVariantItems(response.data.data?.variants).map((item) => ({ ...item, attributeSummary: Object.values((item as any).attributeValues || {}).join(" / ") })) })
    } catch (error) { message.error(getApiErrorMessage(error, "Không tải được sản phẩm")) }
  }

  async function submit(values: Record<string, unknown>) {
    const items = normalizeBundleItems(form.getFieldValue("bundleItems"))
    if (values.productType === "COMBO" && items.length === 0) { message.error("Combo cần có ít nhất một sản phẩm/dịch vụ thành phần"); return }
    setSubmitting(true)
    try {
      const payload = { ...values, hasVariants: Boolean(values.hasVariants), variants: values.hasVariants ? normalizeVariants(form.getFieldValue("variants")) : [], bundleItems: values.productType === "COMBO" ? items : [] }
      if (editing) await api.patch(`/records/products/${id}`, payload)
      else await api.post("/records/products", payload)
      message.success("Đã lưu sản phẩm")
      onSuccess?.()
    } catch (error) { message.error(getApiErrorMessage(error, "Không thể lưu sản phẩm")) }
    finally { setSubmitting(false) }
  }

  function setBundleItems(items: BundleItem[]) { form.setFieldsValue({ bundleItems: items }) }
  function setVariants(items: VariantItem[]) { form.setFieldsValue({ variants: items }) }
  const componentOptions = useMemo(() => products.filter((product) => product.value !== id && product.productType !== "COMBO"), [products, id])
  const categoryOptions = useMemo(() => {
    const categoriesById = new Map(categories.map((category) => [category.id, category]))
    const getPath = (category: ProductCategory) => {
      const names = [category.name]
      const seen = new Set([category.id])
      let parentId = category.parentId
      while (parentId && !seen.has(parentId)) {
        seen.add(parentId)
        const parent = categoriesById.get(parentId)
        if (!parent) break
        names.unshift(parent.name)
        parentId = parent.parentId
      }
      return names.filter(Boolean).join(" / ")
    }
    return categories
      .filter((category) => category.isActive)
      .map((category) => ({ value: getPath(category), label: getPath(category) }))
      .sort((left, right) => left.label.localeCompare(right.label, "vi"))
  }, [categories])
  const rows = normalizeBundleItems(bundleItems).map((item, index) => ({ ...item, key: index, index }))
  const columns: ColumnsType<BundleItem & { key: number; index: number }> = [
    { title: "Sản phẩm / dịch vụ", dataIndex: "productId", render: (_value, row) => <Select showSearch optionFilterProp="label" options={componentOptions} placeholder="Chọn thành phần" style={{ width: "100%" }} value={row.productId} onChange={(productId) => { const items = normalizeBundleItems(form.getFieldValue("bundleItems")); items[row.index] = { ...items[row.index], productId }; setBundleItems(items) }} /> },
    { title: "SL / số buổi", dataIndex: "quantity", width: 150, render: (_value, row) => <InputNumber formatter={formatNumberInput} min={1} parser={parseNumberInput} style={{ width: "100%" }} value={row.quantity} onChange={(quantity) => { const items = normalizeBundleItems(form.getFieldValue("bundleItems")); items[row.index] = { ...items[row.index], quantity: Number(quantity || 0) }; setBundleItems(items) }} /> },
    { title: "", width: 52, render: (_value, row) => <Button danger type="text" icon={<DeleteOutlined />} onClick={() => { const items = normalizeBundleItems(form.getFieldValue("bundleItems")); items.splice(row.index, 1); setBundleItems(items) }} /> },
  ]
  const variantRows = normalizeVariantItems(variants).map((item, index) => ({ ...item, key: index, index }))
  function updateVariant<K extends keyof VariantItem>(index: number, key: K, value: VariantItem[K]) { const next = normalizeVariantItems(form.getFieldValue("variants")); next[index] = { ...next[index], [key]: value }; setVariants(next) }
  const variantColumns: ColumnsType<VariantItem & { key: number; index: number }> = [
    { title: "SKU", dataIndex: "code", width: 140, render: (_v, row) => <Input value={row.code} onChange={(event) => updateVariant(row.index, "code", event.target.value)} /> },
    { title: "Tên biến thể", dataIndex: "name", width: 170, render: (_v, row) => <Input placeholder="30ml, Đỏ / M" value={row.name} onChange={(event) => updateVariant(row.index, "name", event.target.value)} /> },
    { title: "Thuộc tính", dataIndex: "attributeSummary", width: 170, render: (_v, row) => <Input placeholder="30ml / Đỏ" value={row.attributeSummary} onChange={(event) => updateVariant(row.index, "attributeSummary", event.target.value)} /> },
    { title: "Barcode", dataIndex: "barcode", width: 140, render: (_v, row) => <Input value={row.barcode} onChange={(event) => updateVariant(row.index, "barcode", event.target.value)} /> },
    { title: "Giá bán", dataIndex: "sellingPrice", width: 135, render: (_v, row) => <InputNumber formatter={formatNumberInput} min={0} parser={parseNumberInput} style={{ width: "100%" }} value={row.sellingPrice} onChange={(value) => updateVariant(row.index, "sellingPrice", Number(value || 0))} /> },
    { title: "", width: 52, render: (_v, row) => <Button danger type="text" icon={<DeleteOutlined />} onClick={() => { const next = normalizeVariantItems(form.getFieldValue("variants")); next.splice(row.index, 1); setVariants(next) }} /> },
  ]

  return <>
    {!compact && <Typography.Title level={3}>{editing ? "Cập nhật" : "Thêm"} sản phẩm</Typography.Title>}
    <Form form={form} layout="vertical" onFinish={(values) => void submit(values)}>
      <div className="service-order-grid">
        <Form.Item label="Mã SP" name="code" rules={[{ required: true, message: "Nhập mã sản phẩm" }]}><Input /></Form.Item>
        <Form.Item label="Tên sản phẩm" name="name" rules={[{ required: true, message: "Nhập tên sản phẩm" }]}><Input /></Form.Item>
        <Form.Item label="Mã vạch" name="barcode"><Input /></Form.Item>
        <Form.Item label="Loại" name="productType"><Select options={[{ value: "CONSUMABLE", label: "Vật tư tiêu hao" }, { value: "REUSABLE", label: "Thiết bị tái dùng" }, { value: "RETAIL", label: "Sản phẩm bán lẻ" }, { value: "SERVICE", label: "Dịch vụ" }, { value: "COMBO", label: "Combo / Gói dịch vụ" }]} /></Form.Item>
        <Form.Item label="Ngành / nhóm / loại" name="category">
          <Select
            allowClear
            getPopupContainer={() => document.body}
            optionFilterProp="label"
            options={categoryOptions}
            placeholder="Chọn Ngành / Nhóm / Loại"
            showSearch
          />
        </Form.Item>
        <Form.Item label="Đơn vị cơ sở" name="baseUnitId" rules={[{ required: true, message: "Chọn đơn vị cơ sở" }]}><Select showSearch optionFilterProp="label" options={units} placeholder="Chọn đơn vị cơ sở" /></Form.Item>
        <Form.Item label="Có biến thể" name="hasVariants" valuePropName="checked"><Switch /></Form.Item>
        <Form.Item label="Giá bán gói / SP" name="sellingPrice"><InputNumber formatter={formatNumberInput} min={0} parser={parseNumberInput} style={{ width: "100%" }} /></Form.Item>
        <Form.Item label="Tồn tối thiểu" name="minStockLevel"><InputNumber formatter={formatNumberInput} min={0} parser={parseNumberInput} style={{ width: "100%" }} /></Form.Item>
      </div>
      {hasVariants ? <Card className="glass-card service-order-items-card" title="Biến thể / SKU" extra={<Button htmlType="button" icon={<PlusOutlined />} onClick={() => setVariants([...normalizeVariantItems(form.getFieldValue("variants")), { sellingPrice: Number(form.getFieldValue("sellingPrice") || 0), isActive: true }])}>Thêm biến thể</Button>}><Table columns={variantColumns} dataSource={variantRows} pagination={false} rowKey="key" scroll={{ x: 800 }} /></Card> : null}
      {productType === "COMBO" && <Card className="glass-card service-order-items-card" title="Thành phần của combo" extra={<Button htmlType="button" icon={<PlusOutlined />} onClick={() => setBundleItems([...normalizeBundleItems(form.getFieldValue("bundleItems")), { quantity: 1 }])}>Thêm thành phần</Button>}>
        <Typography.Paragraph type="secondary">Khi chọn combo trong đơn, các thành phần này sẽ tự được thêm vào. Giá bán vẫn lấy theo giá của combo.</Typography.Paragraph>
        <Table columns={columns} dataSource={rows} pagination={false} rowKey="key" />
      </Card>}
      <Space><Button className="primary-glow" htmlType="submit" loading={submitting} type="primary">Lưu</Button>{!editing ? <RecordDraftControls resource="products" getPayload={() => ({ ...form.getFieldsValue(true), bundleItems: normalizeBundleItems(form.getFieldValue("bundleItems")) })} onRestore={(payload) => form.setFieldsValue({ ...payload, bundleItems: normalizeBundleItems(payload.bundleItems) })} /> : null}<Button onClick={onCancel}>Hủy</Button></Space>
    </Form>
  </>
}

function normalizeBundleItems(value: unknown): BundleItem[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => ({ productId: (item as Record<string, unknown>)?.productId ? String((item as Record<string, unknown>).productId) : undefined, quantity: Number((item as Record<string, unknown>)?.quantity || 0) }))
}

function normalizeVariantItems(value: unknown): VariantItem[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => ({ ...(item as VariantItem) }))
}

function normalizeVariants(value: unknown) {
  return normalizeVariantItems(value)
    .filter((item) => item.code?.trim() || item.name?.trim())
    .map((item) => ({
      id: item.id,
      code: String(item.code || "").trim(),
      name: String(item.name || "").trim(),
      barcode: String(item.barcode || "").trim() || undefined,
      attributeValues: item.attributeSummary?.trim() ? { option: item.attributeSummary.trim() } : {},
      sellingPrice: Number(item.sellingPrice || 0),
      minStockLevel: Number(item.minStockLevel || 0),
      isActive: item.isActive !== false,
    }))
}
