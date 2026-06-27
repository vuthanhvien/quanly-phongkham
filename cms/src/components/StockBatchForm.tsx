import { DeleteOutlined, PlusOutlined } from "@ant-design/icons"
import { Button, Card, Form, Input, InputNumber, Select, Space, Table, Typography, message } from "antd"
import type { ColumnsType } from "antd/es/table"
import { useEffect, useMemo, useState } from "react"
import { api } from "../api"
import { getApiErrorMessage } from "../utils/apiError"

interface StockBatchFormProps {
  compact?: boolean
  onCancel?: () => void
  onSuccess?: () => void
}

interface OptionItem {
  value: string
  label: string
}

interface ProductOption extends OptionItem {
  usageUnit: string
  purchaseUnit: string
}

interface BatchOption extends OptionItem {
  productId: string
  branchId: string
  supplierId?: string
  batchNumber: string
  expiryDate?: string
  remainingQuantity: number
  unit: string
}

interface ReceiptLineValue {
  productId?: string
  batchNumber?: string
  expiryDate?: string
  quantity?: number
  unit?: string
  supplierId?: string
}

interface IssueLineValue {
  batchId?: string
  quantity?: number
}

export function StockBatchForm({ compact, onCancel, onSuccess }: StockBatchFormProps) {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [branchOptions, setBranchOptions] = useState<OptionItem[]>([])
  const [supplierOptions, setSupplierOptions] = useState<OptionItem[]>([])
  const [productOptions, setProductOptions] = useState<ProductOption[]>([])
  const [batchOptions, setBatchOptions] = useState<BatchOption[]>([])
  const movementType = Form.useWatch("movementType", form) as "IMPORT" | "EXPORT" | undefined
  const branchId = Form.useWatch("branchId", form) as string | undefined
  const supplierId = Form.useWatch("supplierId", form) as string | undefined
  const items = Form.useWatch("items", { form, preserve: true }) as Array<ReceiptLineValue | IssueLineValue> | undefined

  useEffect(() => {
    void loadLookups()
    form.setFieldsValue({
      movementType: "IMPORT",
      movementDate: new Date().toISOString().slice(0, 10),
      items: [createReceiptItem()],
    })
  }, [form])

  useEffect(() => {
    if (!movementType) return
    const currentItems = Array.isArray(form.getFieldValue("items")) ? form.getFieldValue("items") : []
    if (movementType === "IMPORT") {
      const nextItems = currentItems.length > 0
        ? currentItems.map((item: Record<string, unknown>) => ({
            productId: item.productId ? String(item.productId) : undefined,
            batchNumber: item.batchNumber ? String(item.batchNumber) : "",
            expiryDate: item.expiryDate ? String(item.expiryDate) : undefined,
            quantity: Number(item.quantity || 1),
            unit: item.unit ? String(item.unit) : undefined,
            supplierId: item.supplierId ? String(item.supplierId) : supplierId,
          }))
        : [createReceiptItem(supplierId)]
      form.setFieldsValue({ items: nextItems })
      return
    }
    const nextItems = currentItems.length > 0
      ? currentItems.map((item: Record<string, unknown>) => ({
          batchId: item.batchId ? String(item.batchId) : undefined,
          quantity: Number(item.quantity || 1),
        }))
      : [createIssueItem()]
    form.setFieldsValue({ items: nextItems })
  }, [form, movementType, supplierId])

  async function loadLookups() {
    setLookupLoading(true)
    try {
      const response = await api.get("/records/stock-batches/form-options")
      const payload = response.data.data || {}
      setBranchOptions(
        (payload.branches || []).map((row: Record<string, unknown>) => ({
          value: String(row.id),
          label: `${row.slug || ""} - ${row.name || row.id}`,
        })),
      )
      setSupplierOptions(
        (payload.suppliers || []).map((row: Record<string, unknown>) => ({
          value: String(row.id),
          label: `${row.code || ""} - ${row.name || row.id}`,
        })),
      )
      setProductOptions(
        (payload.products || []).map((row: Record<string, unknown>) => ({
          value: String(row.id),
          label: `${row.code || ""} - ${row.name || row.id}`,
          usageUnit: String(row.usageUnit || "cai"),
          purchaseUnit: String(row.purchaseUnit || "cai"),
        })),
      )
      setBatchOptions(
        (payload.batches || []).map((row: Record<string, unknown>) => ({
          value: String(row.id),
          label: `${row.batchNumber || row.id} - tồn ${formatNumber(Number(row.remainingQuantity || 0))} ${row.unit || ""}`,
          productId: String(row.productId || ""),
          branchId: String(row.branchId || ""),
          supplierId: row.supplierId ? String(row.supplierId) : undefined,
          batchNumber: String(row.batchNumber || ""),
          expiryDate: row.expiryDate ? String(row.expiryDate) : undefined,
          remainingQuantity: Number(row.remainingQuantity || 0),
          unit: String(row.unit || "cai"),
        })),
      )
    } catch (error: any) {
      message.error(getApiErrorMessage(error, "Không tải được danh sách sản phẩm / lô hàng"))
    } finally {
      setLookupLoading(false)
    }
  }

  function handleMovementTypeChange(value: "IMPORT" | "EXPORT") {
    form.setFieldsValue({
      movementType: value,
      items: value === "IMPORT" ? [createReceiptItem(supplierId)] : [createIssueItem()],
    })
  }

  function handleReceiptProductChange(index: number, productId?: string) {
    const product = productOptions.find((item) => item.value === productId)
    const nextItems = normalizeReceiptItems(form.getFieldValue("items"))
    nextItems[index] = {
      ...nextItems[index],
      productId,
      unit: nextItems[index]?.unit || product?.usageUnit || product?.purchaseUnit || "cai",
      supplierId: nextItems[index]?.supplierId || supplierId,
    }
    form.setFieldsValue({ items: nextItems })
  }

  function handleReceiptFieldChange<K extends keyof ReceiptLineValue>(index: number, key: K, fieldValue: ReceiptLineValue[K]) {
    const nextItems = normalizeReceiptItems(form.getFieldValue("items"))
    nextItems[index] = { ...nextItems[index], [key]: fieldValue }
    form.setFieldsValue({ items: nextItems })
  }

  function handleIssueBatchChange(index: number, batchId?: string) {
    const nextItems = normalizeIssueItems(form.getFieldValue("items"))
    nextItems[index] = {
      ...nextItems[index],
      batchId,
      quantity: Number(nextItems[index]?.quantity || 1),
    }
    form.setFieldsValue({ items: nextItems })
  }

  function handleIssueFieldChange<K extends keyof IssueLineValue>(index: number, key: K, fieldValue: IssueLineValue[K]) {
    const nextItems = normalizeIssueItems(form.getFieldValue("items"))
    nextItems[index] = { ...nextItems[index], [key]: fieldValue }
    form.setFieldsValue({ items: nextItems })
  }

  function addItem() {
    if (movementType === "EXPORT") {
      const nextItems = normalizeIssueItems(form.getFieldValue("items"))
      nextItems.push(createIssueItem())
      form.setFieldsValue({ items: nextItems })
      return
    }
    const nextItems = normalizeReceiptItems(form.getFieldValue("items"))
    nextItems.push(createReceiptItem(supplierId))
    form.setFieldsValue({ items: nextItems })
  }

  function removeItem(index: number) {
    if (movementType === "EXPORT") {
      const nextItems = normalizeIssueItems(form.getFieldValue("items"))
      nextItems.splice(index, 1)
      form.setFieldsValue({ items: nextItems.length > 0 ? nextItems : [createIssueItem()] })
      return
    }
    const nextItems = normalizeReceiptItems(form.getFieldValue("items"))
    nextItems.splice(index, 1)
    form.setFieldsValue({ items: nextItems.length > 0 ? nextItems : [createReceiptItem(supplierId)] })
  }

  async function submit(values: Record<string, unknown>) {
    setSubmitting(true)
    try {
      if (values.movementType === "EXPORT") {
        const normalizedItems = normalizeIssueItems(form.getFieldValue("items"))
          .map((item) => ({
            batchId: item.batchId,
            quantity: Number(item.quantity || 0),
          }))
          .filter((item) => item.batchId)

        if (normalizedItems.length === 0) {
          message.error("Chọn ít nhất 1 lô hàng để xuất kho")
          return
        }

        await api.post("/records/stock-batches/issue", {
          code: values.code,
          movementDate: values.movementDate,
          note: values.note,
          items: normalizedItems,
        })
        message.success("Đã xuất kho")
        onSuccess?.()
        return
      }

      const normalizedItems = normalizeReceiptItems(form.getFieldValue("items"))
        .map((item) => ({
          productId: item.productId,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          quantity: Number(item.quantity || 0),
          unit: item.unit,
          supplierId: item.supplierId || values.supplierId,
        }))
        .filter((item) => item.productId)

      if (normalizedItems.length === 0) {
        message.error("Chọn ít nhất 1 sản phẩm để nhập kho")
        return
      }

      await api.post("/records/stock-batches/receipt", {
        code: values.code,
        movementDate: values.movementDate,
        branchId: values.branchId,
        supplierId: values.supplierId,
        note: values.note,
        items: normalizedItems,
      })
      message.success("Đã nhập kho")
      onSuccess?.()
    } catch (error: any) {
      message.error(getApiErrorMessage(error, "Không thể lưu phiếu kho"))
    } finally {
      setSubmitting(false)
    }
  }

  const filteredBatchOptions = useMemo(() => {
    return batchOptions.filter((item) => !branchId || item.branchId === branchId)
  }, [batchOptions, branchId])

  const receiptColumns: ColumnsType<ReceiptLineValue & { key: number; index: number }> = [
    {
      title: "Sản phẩm",
      dataIndex: "productId",
      key: "productId",
      width: 260,
      render: (_value, row) => (
        <Select
          showSearch
          optionFilterProp="label"
          loading={lookupLoading}
          options={productOptions}
          placeholder="Chọn sản phẩm"
          value={row.productId}
          onChange={(value) => handleReceiptProductChange(row.index, value)}
        />
      ),
    },
    {
      title: "Số lô",
      dataIndex: "batchNumber",
      key: "batchNumber",
      width: 160,
      render: (_value, row) => (
        <Input value={row.batchNumber} placeholder="VD: LO-0627" onChange={(event) => handleReceiptFieldChange(row.index, "batchNumber", event.target.value)} />
      ),
    },
    {
      title: "Hạn dùng",
      dataIndex: "expiryDate",
      key: "expiryDate",
      width: 150,
      render: (_value, row) => (
        <Input type="date" value={row.expiryDate} onChange={(event) => handleReceiptFieldChange(row.index, "expiryDate", event.target.value)} />
      ),
    },
    {
      title: "SL nhập",
      dataIndex: "quantity",
      key: "quantity",
      width: 110,
      render: (_value, row) => (
        <InputNumber min={1} style={{ width: "100%" }} value={row.quantity} onChange={(value) => handleReceiptFieldChange(row.index, "quantity", Number(value || 0))} />
      ),
    },
    {
      title: "Đơn vị",
      dataIndex: "unit",
      key: "unit",
      width: 120,
      render: (_value, row) => (
        <Input value={row.unit} placeholder="cai" onChange={(event) => handleReceiptFieldChange(row.index, "unit", event.target.value)} />
      ),
    },
    {
      title: "",
      key: "action",
      width: 60,
      render: (_value, row) => (
        <Button danger icon={<DeleteOutlined />} type="text" onClick={() => removeItem(row.index)} />
      ),
    },
  ]

  const issueColumns: ColumnsType<IssueLineValue & { key: number; index: number }> = [
    {
      title: "Lô hàng",
      dataIndex: "batchId",
      key: "batchId",
      width: 360,
      render: (_value, row) => (
        <Select
          showSearch
          optionFilterProp="label"
          loading={lookupLoading}
          options={filteredBatchOptions}
          placeholder="Chọn lô hàng để xuất"
          value={row.batchId}
          onChange={(value) => handleIssueBatchChange(row.index, value)}
        />
      ),
    },
    {
      title: "Thông tin",
      key: "batchInfo",
      width: 280,
      render: (_value, row) => {
        const batch = filteredBatchOptions.find((item) => item.value === row.batchId)
        if (!batch) return <Typography.Text type="secondary">Chưa chọn lô</Typography.Text>
        return (
          <Space direction="vertical" size={0}>
            <Typography.Text>{batch.batchNumber}</Typography.Text>
            <Typography.Text type="secondary">
              Tồn hiện tại: {formatNumber(batch.remainingQuantity)} {batch.unit}
            </Typography.Text>
          </Space>
        )
      },
    },
    {
      title: "SL xuất",
      dataIndex: "quantity",
      key: "quantity",
      width: 120,
      render: (_value, row) => (
        <InputNumber min={1} style={{ width: "100%" }} value={row.quantity} onChange={(value) => handleIssueFieldChange(row.index, "quantity", Number(value || 0))} />
      ),
    },
    {
      title: "",
      key: "action",
      width: 60,
      render: (_value, row) => (
        <Button danger icon={<DeleteOutlined />} type="text" onClick={() => removeItem(row.index)} />
      ),
    },
  ]

  const receiptDataSource = normalizeReceiptItems(items).map((item, index) => ({ ...item, key: index, index }))
  const issueDataSource = normalizeIssueItems(items).map((item, index) => ({ ...item, key: index, index }))

  return (
    <>
      {!compact && <Typography.Title level={3}>Phiếu nhập / xuất kho</Typography.Title>}
      <Form form={form} layout="vertical" onFinish={(values) => void submit(values)}>
        <div className="service-order-grid">
          <Form.Item label="Loại phiếu" name="movementType" rules={[{ required: true, message: "Chọn loại phiếu" }]}>
            <Select
              options={[
                { value: "IMPORT", label: "Phiếu nhập kho" },
                { value: "EXPORT", label: "Phiếu xuất kho" },
              ]}
              onChange={handleMovementTypeChange}
            />
          </Form.Item>
          <Form.Item label="Mã phiếu" name="code" rules={[{ required: true, message: "Nhập mã phiếu" }]}>
            <Input placeholder="PNK-0001 / PXK-0001" />
          </Form.Item>
          <Form.Item label="Ngày phiếu" name="movementDate" rules={[{ required: true, message: "Chọn ngày phiếu" }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item label="Chi nhánh" name="branchId" rules={[{ required: movementType !== "EXPORT", message: "Chọn chi nhánh" }]}>
            <Select allowClear={movementType === "EXPORT"} options={branchOptions} optionFilterProp="label" placeholder="Chọn chi nhánh" showSearch />
          </Form.Item>
          <Form.Item label="Nhà cung cấp" name="supplierId">
            <Select allowClear options={supplierOptions} optionFilterProp="label" placeholder="Chọn nhà cung cấp" showSearch />
          </Form.Item>
        </div>

        <Card
          className="glass-card service-order-items-card"
          title={movementType === "EXPORT" ? "Sản phẩm xuất kho" : "Sản phẩm nhập kho"}
          extra={<Button icon={<PlusOutlined />} onClick={addItem}>Thêm sản phẩm</Button>}
        >
          <Table
            columns={movementType === "EXPORT" ? issueColumns : receiptColumns}
            dataSource={movementType === "EXPORT" ? issueDataSource : receiptDataSource}
            pagination={false}
            rowKey="key"
            scroll={{ x: 900 }}
          />
        </Card>

        <Form.Item label="Ghi chú" name="note">
          <Input.TextArea rows={3} />
        </Form.Item>

        <Space>
          <Button className="primary-glow" htmlType="submit" loading={submitting} type="primary">Lưu phiếu</Button>
          <Button onClick={onCancel}>Hủy</Button>
        </Space>
      </Form>
    </>
  )
}

function createReceiptItem(defaultSupplierId?: string): ReceiptLineValue {
  return { quantity: 1, unit: "cai", supplierId: defaultSupplierId }
}

function createIssueItem(): IssueLineValue {
  return { quantity: 1 }
}

function normalizeReceiptItems(value: unknown): ReceiptLineValue[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => ({
    productId: (item as Record<string, unknown>)?.productId ? String((item as Record<string, unknown>).productId) : undefined,
    batchNumber: (item as Record<string, unknown>)?.batchNumber ? String((item as Record<string, unknown>).batchNumber) : undefined,
    expiryDate: (item as Record<string, unknown>)?.expiryDate ? String((item as Record<string, unknown>).expiryDate) : undefined,
    quantity: Number((item as Record<string, unknown>)?.quantity || 0),
    unit: (item as Record<string, unknown>)?.unit ? String((item as Record<string, unknown>).unit) : undefined,
    supplierId: (item as Record<string, unknown>)?.supplierId ? String((item as Record<string, unknown>).supplierId) : undefined,
  }))
}

function normalizeIssueItems(value: unknown): IssueLineValue[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => ({
    batchId: (item as Record<string, unknown>)?.batchId ? String((item as Record<string, unknown>).batchId) : undefined,
    quantity: Number((item as Record<string, unknown>)?.quantity || 0),
  }))
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(Number(value || 0))
}
