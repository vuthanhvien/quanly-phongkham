import { AppstoreOutlined, DownloadOutlined, ImportOutlined, UploadOutlined } from "@ant-design/icons"
import { Button, Card, Checkbox, Form, Input, InputNumber, Modal, Select, Space, Table, Typography, Upload, message } from "antd"
import type { UploadProps } from "antd"
import { useEffect, useMemo, useState } from "react"
import { api } from "../api"
import { CustomField, entityLabels } from "../models"

const CUSTOM_FIELD_TYPES = [
  "text",
  "number",
  "date",
  "boolean",
  "select",
  "textarea",
  "relative",
]

const RELATIVE_RESOURCE_OPTIONS = Object.entries(entityLabels).map(
  ([value, label]) => ({ value, label }),
)

export function CustomFieldsPage() {
  const [entityType, setEntityType] = useState("customers")
  const [fields, setFields] = useState<CustomField[]>([])
  const [fieldModal, setFieldModal] = useState(false)
  const [editingField, setEditingField] = useState<CustomField | null>(null)
  const [batchModal, setBatchModal] = useState(false)
  const [batchMode, setBatchMode] = useState<"create" | "upsert">("create")
  const [batchPayload, setBatchPayload] = useState("")
  const [importModal, setImportModal] = useState(false)
  const [importPayload, setImportPayload] = useState<ParsedFieldInput[]>([])
  const [fieldForm] = Form.useForm()
  const currentFieldType = Form.useWatch("dataType", fieldForm)
  const fieldKeys = useMemo(() => new Set(fields.map((field) => field.key)), [fields])

  useEffect(() => {
    void load()
  }, [entityType])

  async function load() {
    const response = await api.get("/settings/custom-fields", { params: { entityType } })
    setFields(response.data.data)
  }

  async function saveField(values: Record<string, unknown>) {
    const payload = normalizeFieldPayload(values, entityType)
    if (editingField) {
      await api.patch(`/settings/custom-fields/${editingField.id}`, payload)
      message.success("Đã cập nhật field")
    } else {
      await api.post("/settings/custom-fields", payload)
      message.success("Đã thêm trường tùy biến")
    }
    setFieldModal(false)
    setEditingField(null)
    fieldForm.resetFields()
    await load()
  }

  function openCreateField() {
    setEditingField(null)
    fieldForm.resetFields()
    fieldForm.setFieldsValue({ dataType: "text", sortOrder: 0, isActive: true })
    setFieldModal(true)
  }

  function openEditField(field: CustomField) {
    setEditingField(field)
    fieldForm.setFieldsValue({
      ...field,
      options: field.options?.join(", "),
    })
    setFieldModal(true)
  }

  async function deleteField(id: string) {
    await api.delete(`/settings/custom-fields/${id}`)
    message.success("Đã xóa field")
    await load()
  }

  function openBatch(mode: "create" | "upsert") {
    setBatchMode(mode)
    setBatchPayload(buildBatchTemplate(entityType, mode))
    setBatchModal(true)
  }

  async function submitBatch() {
    const parsed = parseBatchPayload(batchPayload)
    if (parsed.length === 0) {
      message.warning("Chưa có dữ liệu để xử lý")
      return
    }

    const existingByKey = new Map(fields.map((field) => [field.key, field]))

    if (batchMode === "create") {
      const duplicateKeys = parsed
        .map((item) => sanitizeFieldKey(String(item.key || "")))
        .filter((key) => fieldKeys.has(key))
      if (duplicateKeys.length > 0) {
        message.error(`Các key đã tồn tại: ${Array.from(new Set(duplicateKeys)).join(", ")}`)
        return
      }
    }

    for (const item of parsed) {
      const payload = normalizeFieldPayload(item as unknown as Record<string, unknown>, entityType)
      const existing = existingByKey.get(String(payload.key))
      if (existing) {
        await api.patch(`/settings/custom-fields/${existing.id}`, payload)
      } else {
        await api.post("/settings/custom-fields", payload)
      }
    }

    message.success(
      batchMode === "create"
        ? `Đã thêm ${parsed.length} field`
        : `Đã import/cập nhật ${parsed.length} field`,
    )
    setBatchModal(false)
    setBatchPayload("")
    await load()
  }

  function exportFields() {
    const payload = fields.map((field) => ({
      label: field.label,
      key: field.key,
      dataType: field.dataType,
      options: field.options || [],
      relationResource: field.relationResource,
      sortOrder: field.sortOrder || 0,
      isActive: field.isActive,
    }))
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${entityType}-custom-fields.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const uploadProps: UploadProps = {
    accept: ".json,.csv,.tsv,.txt",
    beforeUpload: async (file) => {
      const text = await file.text()
      const parsed = parseBatchPayload(text)
      setImportPayload(parsed)
      setImportModal(true)
      return false
    },
    showUploadList: false,
  }

  async function confirmImport(mode: "create" | "upsert") {
    if (importPayload.length === 0) {
      message.warning("File import chưa có dữ liệu hợp lệ")
      return
    }
    setBatchMode(mode)
    setBatchPayload(JSON.stringify(importPayload, null, 2))
    setImportModal(false)
    await submitBatchPayload(importPayload, mode)
  }

  async function submitBatchPayload(parsed: ParsedFieldInput[], mode: "create" | "upsert") {
    const existingByKey = new Map(fields.map((field) => [field.key, field]))

    if (mode === "create") {
      const duplicateKeys = parsed
        .map((item) => sanitizeFieldKey(String(item.key || "")))
        .filter((key) => fieldKeys.has(key))
      if (duplicateKeys.length > 0) {
        message.error(`Các key đã tồn tại: ${Array.from(new Set(duplicateKeys)).join(", ")}`)
        return
      }
    }

    for (const item of parsed) {
      const payload = normalizeFieldPayload(item as unknown as Record<string, unknown>, entityType)
      const existing = existingByKey.get(String(payload.key))
      if (existing) {
        if (mode === "create") continue
        await api.patch(`/settings/custom-fields/${existing.id}`, payload)
      } else {
        await api.post("/settings/custom-fields", payload)
      }
    }

    message.success(
      mode === "create"
        ? `Đã import thêm ${parsed.length} field`
        : `Đã import/cập nhật ${parsed.length} field`,
    )
    setImportModal(false)
    setImportPayload([])
    await load()
  }

  return (
    <>
      <div className="page-header">
        <div>
          <Typography.Text className="eyebrow">
            No-code operations
          </Typography.Text>
          <Typography.Title level={2}>Custom fields</Typography.Title>
        </div>
        <Space wrap>
          <Select
            value={entityType}
            onChange={setEntityType}
            style={{ width: 240 }}
            options={Object.entries(entityLabels).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <Button className="primary-glow" icon={<AppstoreOutlined />} type="primary" onClick={openCreateField}>
            Thêm field
          </Button>
          <Button icon={<UploadOutlined />} onClick={() => openBatch("create")}>
            Add multi
          </Button>
          <Button icon={<UploadOutlined />} onClick={() => openBatch("upsert")}>
            Update multi
          </Button>
          <Button icon={<DownloadOutlined />} onClick={exportFields}>
            Export
          </Button>
          <Upload {...uploadProps}>
            <Button icon={<ImportOutlined />}>Import</Button>
          </Upload>
        </Space>
      </div>
      <Card className="glass-card settings-card">
        <Typography.Paragraph type="secondary">
          Custom field dùng chung cho tất cả role. Phần hiển thị và bắt buộc nhập sẽ được cấu hình riêng theo role trong màn Cấu hình động.
        </Typography.Paragraph>
        <Table
          size="small"
          pagination={false}
          rowKey="id"
          dataSource={fields}
          columns={[
            { title: "Nhãn", dataIndex: "label" },
            { title: "Key", dataIndex: "key" },
            { title: "Kiểu", dataIndex: "dataType" },
            {
              title: "Liên kết",
              render: (_, row) =>
                row.relationResource
                  ? entityLabels[row.relationResource] || row.relationResource
                  : "-",
            },
            {
              title: "Hoạt động",
              dataIndex: "isActive",
              render: (value) => (value ? "Bật" : "Tắt"),
            },
            {
              title: "",
              render: (_, row) => (
                <Space>
                  <Button type="link" onClick={() => openEditField(row)}>
                    Sửa
                  </Button>
                  <Button danger type="link" onClick={() => deleteField(row.id)}>
                    Xóa
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>
      <Modal
        title={editingField ? "Cập nhật custom field" : "Thêm custom field"}
        open={fieldModal}
        footer={null}
        onCancel={() => {
          setFieldModal(false)
          setEditingField(null)
        }}
      >
        <Form form={fieldForm} layout="vertical" onFinish={saveField}>
          <Form.Item name="label" label="Tên hiển thị" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="key" label="Key dữ liệu" rules={[{ required: true }]}>
            <Input placeholder="vi_du_field" />
          </Form.Item>
          <Form.Item name="dataType" label="Kiểu" initialValue="text">
            <Select
              options={CUSTOM_FIELD_TYPES.map((value) => ({
                value,
                label: value,
              }))}
            />
          </Form.Item>
          {currentFieldType === "select" && (
            <Form.Item name="options" label="Lựa chọn (ngăn cách dấu phẩy)">
              <Input />
            </Form.Item>
          )}
          {currentFieldType === "relative" && (
            <Form.Item
              name="relationResource"
              label="Bảng liên kết"
              rules={[{ required: true, message: "Chọn bảng liên kết" }]}
            >
              <Select options={RELATIVE_RESOURCE_OPTIONS} />
            </Form.Item>
          )}
          <Form.Item name="sortOrder" label="Thứ tự" initialValue={0}>
            <InputNumber />
          </Form.Item>
          <Form.Item name="isActive" valuePropName="checked" initialValue>
            <Checkbox>Cho phép sử dụng</Checkbox>
          </Form.Item>
          <Button className="primary-glow" htmlType="submit" type="primary">
            {editingField ? "Cập nhật field" : "Lưu field"}
          </Button>
        </Form>
      </Modal>
      <Modal
        title={batchMode === "create" ? "Add multi custom fields" : "Update multi custom fields"}
        open={batchModal}
        onCancel={() => setBatchModal(false)}
        onOk={() => void submitBatch()}
        okText={batchMode === "create" ? "Thêm hàng loạt" : "Cập nhật hàng loạt"}
        width={920}
      >
        <Typography.Paragraph type="secondary">
          Dán JSON array hoặc CSV/TSV với các cột: `label`, `key`, `dataType`, `options`, `relationResource`, `sortOrder`, `isActive`.
        </Typography.Paragraph>
        <Input.TextArea
          autoSize={{ minRows: 16, maxRows: 24 }}
          value={batchPayload}
          onChange={(event) => setBatchPayload(event.target.value)}
        />
      </Modal>
      <Modal
        title="Import custom fields"
        open={importModal}
        onCancel={() => setImportModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setImportModal(false)}>
            Hủy
          </Button>,
          <Button key="create" onClick={() => void confirmImport("create") }>
            Import thêm mới
          </Button>,
          <Button key="upsert" className="primary-glow" type="primary" onClick={() => void confirmImport("upsert") }>
            Import cập nhật
          </Button>,
        ]}
      >
        <Typography.Paragraph type="secondary">
          Đã đọc được {importPayload.length} field từ file. Chọn cách import phù hợp.
        </Typography.Paragraph>
        <Table
          size="small"
          rowKey="key"
          pagination={false}
          dataSource={importPayload.slice(0, 8)}
          columns={[
            { title: "Label", dataIndex: "label" },
            { title: "Key", dataIndex: "key" },
            { title: "Type", dataIndex: "dataType" },
          ]}
        />
      </Modal>
    </>
  )
}

interface ParsedFieldInput {
  label: string
  key: string
  dataType?: string
  options?: string[] | string
  relationResource?: string
  sortOrder?: number | string
  isActive?: boolean | string
}

function buildBatchTemplate(entityType: string, mode: "create" | "upsert") {
  return JSON.stringify(
    [
      {
        label: mode === "create" ? "Nguồn marketing" : "Nguồn khách",
        key: mode === "create" ? "nguon_marketing" : "nguon_khach",
        dataType: "select",
        options: ["Facebook", "TikTok", "Referral"],
        relationResource: null,
        sortOrder: 10,
        isActive: true,
        entityType,
      },
    ],
    null,
    2,
  )
}

function sanitizeFieldKey(key: string) {
  return key.trim().replace(/[^a-zA-Z0-9_]/g, "_")
}

function normalizeFieldPayload(values: Record<string, unknown>, entityType: string) {
  return {
    ...values,
    entityType,
    key: sanitizeFieldKey(String(values.key || "")),
    required: false,
    isActive: values.isActive ?? true,
    sortOrder: Number(values.sortOrder || 0),
    options:
      values.dataType === "select" && values.options
        ? normalizeOptions(values.options)
        : undefined,
    relationResource:
      values.dataType === "relative" ? values.relationResource : undefined,
  }
}

function normalizeOptions(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseBatchPayload(text: string): ParsedFieldInput[] {
  const source = text.trim()
  if (!source) return []

  if (source.startsWith("[")) {
    const parsed = JSON.parse(source)
    if (!Array.isArray(parsed)) {
      throw new Error("JSON import phải là array")
    }
    return parsed.map(normalizeParsedField)
  }

  const rows = source.split(/\r?\n/).filter(Boolean)
  if (rows.length < 2) {
    throw new Error("CSV/TSV cần ít nhất 2 dòng")
  }
  const delimiter = rows[0].includes("\t") ? "\t" : ","
  const headers = rows[0].split(delimiter).map((item) => item.trim())
  return rows.slice(1).map((row) => {
    const values = row.split(delimiter)
    const mapped = Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() || ""]))
    return normalizeParsedField(mapped)
  })
}

function normalizeParsedField(item: Record<string, unknown>): ParsedFieldInput {
  return {
    label: String(item.label || ""),
    key: sanitizeFieldKey(String(item.key || "")),
    dataType: String(item.dataType || "text"),
    options:
      Array.isArray(item.options)
        ? item.options.map((value) => String(value))
        : item.options !== undefined
          ? String(item.options)
          : undefined,
    relationResource: item.relationResource ? String(item.relationResource) : undefined,
    sortOrder: item.sortOrder ? Number(item.sortOrder) : 0,
    isActive: item.isActive === false || String(item.isActive).toLowerCase() === "false" ? false : true,
  }
}