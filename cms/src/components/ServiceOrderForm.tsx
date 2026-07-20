import { DeleteOutlined, PlusOutlined } from "@ant-design/icons"
import { Button, Card, Form, Input, InputNumber, Select, Space, Table, Typography, message } from "antd"
import type { ColumnsType } from "antd/es/table"
import { useEffect, useMemo, useState } from "react"
import { api } from "../api"
import { getFirstOptionValue } from "../utils/branchDefaults"
import { getApiErrorMessage } from "../utils/apiError"

interface ServiceOrderFormProps {
  id?: string
  compact?: boolean
  initialValues?: Record<string, unknown>
  onCancel?: () => void
  onSuccess?: () => void
}

interface OptionItem {
  value: string
  label: string
}

interface ProductOption {
  value: string
  label: string
  name: string
  sellingPrice: number
}

interface OrderLineValue {
  productId?: string
  itemName?: string
  quantity?: number
  unitPrice?: number
}

export function ServiceOrderForm({ id, compact, initialValues, onCancel, onSuccess }: ServiceOrderFormProps) {
  const editing = Boolean(id)
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [customerOptions, setCustomerOptions] = useState<OptionItem[]>([])
  const [branchOptions, setBranchOptions] = useState<OptionItem[]>([])
  const [staffOptions, setStaffOptions] = useState<OptionItem[]>([])
  const [productOptions, setProductOptions] = useState<ProductOption[]>([])
  const items = Form.useWatch("items", { form, preserve: true }) as OrderLineValue[] | undefined

  useEffect(() => {
    void loadLookups()
  }, [])

  useEffect(() => {
    if (!editing) {
      const defaultItems = normalizeItems(initialValues?.items)
      form.setFieldsValue({
        status: "DRAFT",
        orderDate: new Date().toISOString().slice(0, 10),
        items: defaultItems.length > 0 ? defaultItems : [createEmptyItem()],
        ...(initialValues || {}),
      })
      return
    }
    void loadRecord()
  }, [editing, form, id, initialValues])

  const totalAmount = useMemo(
    () => normalizeItems(items).reduce((sum, item) => sum + Number(item?.quantity || 0) * Number(item?.unitPrice || 0), 0),
    [items],
  )

  async function loadLookups() {
    setLookupLoading(true)
    try {
      const [customersResponse, branchesResponse, staffResponse, productsResponse] = await Promise.all([
        api.get("/records/customers", { params: { pageSize: 200 } }),
        api.get("/records/branches", { params: { pageSize: 200 } }),
        api.get("/records/staff", { params: { pageSize: 200 } }),
        api.get("/records/service-orders/product-options"),
      ])

      setCustomerOptions(
        (customersResponse.data.data || []).map((row: Record<string, unknown>) => ({
          value: String(row.id),
          label: `${row.code || ""} - ${row.fullName || row.id}`,
        })),
      )
      const nextBranchOptions = (branchesResponse.data.data || []).map((row: Record<string, unknown>) => ({
        value: String(row.id),
        label: `${row.slug || ""} - ${row.name || row.id}`,
      }))
      setBranchOptions(nextBranchOptions)
      setStaffOptions(
        (staffResponse.data.data || []).map((row: Record<string, unknown>) => ({
          value: String(row.id),
          label: `${row.code || ""} - ${row.fullName || row.id}`,
        })),
      )
      setProductOptions(
        (productsResponse.data.data || []).map((row: Record<string, unknown>) => ({
          value: String(row.id),
          label: `${row.code || ""} - ${row.name || row.id}`,
          name: String(row.name || row.id),
          sellingPrice: Number(row.sellingPrice || 0),
        })),
      )
      if (!editing && !form.getFieldValue("branchId")) {
        form.setFieldsValue({ branchId: getFirstOptionValue(nextBranchOptions) })
      }
    } catch (error: any) {
      message.error(getApiErrorMessage(error, "Không tải được danh sách sản phẩm/lookup cho đơn hàng"))
    } finally {
      setLookupLoading(false)
    }
  }

  async function loadRecord() {
    const response = await api.get(`/records/service-orders/${id}`)
    const data = response.data.data
    const normalizedItems = normalizeItems(data.items)
    form.setFieldsValue({
      ...data,
      ...(initialValues || {}),
      items: normalizedItems.length > 0 ? normalizedItems : [createEmptyItem()],
    })
  }

  function handleProductChange(index: number, productId?: string) {
    const product = productOptions.find((item) => item.value === productId)
    const nextItems = normalizeItems(form.getFieldValue("items"))
    nextItems[index] = {
      ...nextItems[index],
      productId,
      itemName: product?.name,
      unitPrice: product ? Number(nextItems[index]?.unitPrice || product.sellingPrice) : nextItems[index]?.unitPrice,
      quantity: Number(nextItems[index]?.quantity || 1),
    }
    form.setFieldsValue({ items: nextItems })
  }

  function handleItemFieldChange<K extends keyof OrderLineValue>(index: number, key: K, fieldValue: OrderLineValue[K]) {
    const nextItems = normalizeItems(form.getFieldValue("items"))
    nextItems[index] = {
      ...nextItems[index],
      [key]: fieldValue,
    }
    form.setFieldsValue({ items: nextItems })
  }

  async function submit(values: Record<string, unknown>) {
    setSubmitting(true)
    try {
      const normalizedItems = normalizeItems(form.getFieldValue("items"))
        .map((item) => ({
          productId: item.productId,
          itemName: item.itemName,
          quantity: Number(item.quantity || 0),
          unitPrice: Number(item.unitPrice || 0),
        }))
        .filter((item) => item.productId)

      if (normalizedItems.length === 0) {
        message.error("Chọn ít nhất 1 sản phẩm cho đơn hàng")
        return
      }
      if (normalizedItems.some((item) => item.quantity <= 0)) {
        message.error("Số lượng sản phẩm phải lớn hơn 0")
        return
      }

      const payload = {
        ...values,
        totalAmount,
        items: normalizedItems,
      }
      if (editing) {
        await api.patch(`/records/service-orders/${id}`, payload)
      } else {
        await api.post("/records/service-orders", payload)
      }
      message.success("Đã lưu đơn hàng")
      onSuccess?.()
    } catch (error: any) {
      message.error(getApiErrorMessage(error, "Không thể lưu đơn hàng"))
    } finally {
      setSubmitting(false)
    }
  }

  const itemColumns: ColumnsType<OrderLineValue & { key: number; index: number }> = [
    {
      title: "Sản phẩm",
      dataIndex: "productId",
      key: "productId",
      width: 280,
      render: (_value, row) => (
        <Select
          getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
          loading={lookupLoading}
          notFoundContent={lookupLoading ? "Đang tải sản phẩm..." : "Không có sản phẩm"}
          options={productOptions}
          optionFilterProp="label"
          placeholder="Chọn sản phẩm"
          popupMatchSelectWidth={false}
          showSearch
          style={{ width: "100%" }}
          value={row.productId}
          onChange={(value) => handleProductChange(row.index, value)}
        />
      ),
    },
    {
      title: "Tên hiển thị",
      dataIndex: "itemName",
      key: "itemName",
      width: 220,
      render: (_value, row) => (
        <Input placeholder="Tên sản phẩm" value={row.itemName} onChange={(event) => handleItemFieldChange(row.index, "itemName", event.target.value)} />
      ),
    },
    {
      title: "SL",
      dataIndex: "quantity",
      key: "quantity",
      width: 100,
      render: (_value, row) => (
        <InputNumber min={1} style={{ width: "100%" }} value={row.quantity} onChange={(value) => handleItemFieldChange(row.index, "quantity", Number(value || 0))} />
      ),
    },
    {
      title: "Đơn giá",
      dataIndex: "unitPrice",
      key: "unitPrice",
      width: 150,
      render: (_value, row) => (
        <InputNumber min={0} style={{ width: "100%" }} value={row.unitPrice} onChange={(value) => handleItemFieldChange(row.index, "unitPrice", Number(value || 0))} />
      ),
    },
    {
      title: "Thành tiền",
      key: "lineTotal",
      width: 150,
      render: (_value, row) => {
        const currentItems = normalizeItems(form.getFieldValue("items"))
        const item = currentItems[row.index] || {}
        return <Typography.Text>{formatNumber(Number(item.quantity || 0) * Number(item.unitPrice || 0))}</Typography.Text>
      },
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

  function addItem() {
    const currentItems = normalizeItems(form.getFieldValue("items"))
    currentItems.push(createEmptyItem())
    form.setFieldsValue({ items: currentItems })
  }

  function removeItem(index: number) {
    const currentItems = normalizeItems(form.getFieldValue("items"))
    currentItems.splice(index, 1)
    form.setFieldsValue({ items: currentItems.length > 0 ? currentItems : [createEmptyItem()] })
  }

  const dataSource = normalizeItems(items).map((item, index) => ({ ...item, key: index, index }))

  return (
    <>
      {!compact && <Typography.Title level={3}>{editing ? "Cập nhật" : "Thêm"} đơn hàng</Typography.Title>}
      <Form form={form} layout="vertical" onFinish={(values) => void submit(values)}>
        <div className="service-order-grid">
          <Form.Item label="Mã đơn" name="code" rules={[{ required: true, message: "Nhập mã đơn" }]}>
            <Input placeholder="Mã đơn" />
          </Form.Item>
          <Form.Item label="Khách hàng" name="customerId" rules={[{ required: true, message: "Chọn khách hàng" }]}>
            <Select options={customerOptions} optionFilterProp="label" placeholder="Chọn khách hàng" showSearch />
          </Form.Item>
          <Form.Item label="Chi nhánh" name="branchId" rules={[{ required: true, message: "Chọn chi nhánh" }]}>
            <Select options={branchOptions} optionFilterProp="label" placeholder="Chọn chi nhánh" showSearch />
          </Form.Item>
          <Form.Item label="Ngày đơn" name="orderDate" rules={[{ required: true, message: "Chọn ngày đơn" }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item label="Nhân sự thực hiện" name="performerStaffId">
            <Select allowClear options={staffOptions} optionFilterProp="label" placeholder="Chọn nhân sự" showSearch />
          </Form.Item>
          <Form.Item label="Trạng thái" name="status" rules={[{ required: true, message: "Chọn trạng thái" }]}>
            <Select options={[{ value: 'DRAFT', label: 'Nháp' }, { value: 'CONFIRMED', label: 'Đã xác nhận' }, { value: 'COMPLETED', label: 'Hoàn thành' }, { value: 'CANCELLED', label: 'Đã hủy' }]} />
          </Form.Item>
        </div>

        <Card className="glass-card service-order-items-card" title="Sản phẩm trong đơn" extra={<Button icon={<PlusOutlined />} onClick={addItem}>Thêm sản phẩm</Button>}>
          <Table columns={itemColumns} dataSource={dataSource} pagination={false} rowKey="key" scroll={{ x: 900 }} />
          <div className="service-order-summary">
            <Typography.Text type="secondary">Tổng tiền</Typography.Text>
            <Typography.Title level={4}>{formatNumber(totalAmount)}</Typography.Title>
          </div>
        </Card>

        <Form.Item label="Ghi chú" name="note">
          <Input.TextArea rows={3} />
        </Form.Item>

        <Space>
          <Button className="primary-glow" htmlType="submit" loading={submitting} type="primary">Lưu</Button>
          <Button onClick={onCancel}>Hủy</Button>
        </Space>
      </Form>
    </>
  )
}

function createEmptyItem(): OrderLineValue {
  return { quantity: 1, unitPrice: 0 }
}

function normalizeItems(value: unknown): OrderLineValue[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => ({
    productId: (item as Record<string, unknown>)?.productId ? String((item as Record<string, unknown>).productId) : undefined,
    itemName: (item as Record<string, unknown>)?.itemName ? String((item as Record<string, unknown>).itemName) : undefined,
    quantity: Number((item as Record<string, unknown>)?.quantity || 0),
    unitPrice: Number((item as Record<string, unknown>)?.unitPrice || 0),
  }))
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(Number(value || 0))
}
