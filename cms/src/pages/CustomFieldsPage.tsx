import {
  AppstoreOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ImportOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons"
import {
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Typography,
  Upload,
  message,
} from "antd"
import type { UploadProps } from "antd"
import type { ColumnsType } from "antd/es/table"
import { useEffect, useMemo, useState } from "react"
import * as XLSX from "xlsx"
import { api } from "../api"
import { CustomField, entityLabels } from "../models"

const CUSTOM_FIELD_TYPES = [
  { value: "text", label: "Văn bản (text)" },
  { value: "number", label: "Số (number)" },
  { value: "date", label: "Ngày tháng (date)" },
  { value: "boolean", label: "Bật/tắt (boolean)" },
  { value: "select", label: "Danh sách chọn (select)" },
  { value: "textarea", label: "Đoạn văn bản (textarea)" },
  { value: "relative", label: "Liên kết bản ghi (relative)" },
  { value: "file", label: "Tệp đính kèm (file)" },
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
  const [batchRows, setBatchRows] = useState<BatchFieldRow[]>([])
  const [importModal, setImportModal] = useState(false)
  const [importPayload, setImportPayload] = useState<ParsedFieldInput[]>([])
  const [fieldForm] = Form.useForm()
  const currentFieldType = Form.useWatch("dataType", fieldForm)
  const fieldKeys = useMemo(
    () => new Set(fields.map((field) => field.key)),
    [fields],
  )

  useEffect(() => {
    void load()
  }, [entityType])

  async function load() {
    const response = await api.get("/settings/custom-fields", {
      params: { entityType },
    })
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
    setBatchRows(
      mode === "create"
        ? [createEmptyBatchRow(0)]
        : fields.map((field, index) => toBatchRow(field, index)),
    )
    setBatchModal(true)
  }

  async function submitBatch() {
    const parsed = batchRows
      .map((row) => normalizeBatchRow(row))
      .filter((row) => row.label && row.key)

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
        message.error(
          `Các key đã tồn tại: ${Array.from(new Set(duplicateKeys)).join(", ")}`,
        )
        return
      }
    }

    for (const item of parsed) {
      const payload = normalizeFieldPayload(
        item as unknown as Record<string, unknown>,
        entityType,
      )
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
    setBatchRows([])
    await load()
  }

  function exportFields() {
    const payload = fields.map((field) => ({
      label: field.label,
      key: field.key,
      dataType: field.dataType,
      options: (field.options || []).join(", "),
      relationResource: field.relationResource || "",
      sortOrder: field.sortOrder || 0,
      isActive: field.isActive ? "true" : "false",
    }))
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(payload)
    XLSX.utils.book_append_sheet(workbook, worksheet, "CustomFields")
    XLSX.writeFile(workbook, `${entityType}-custom-fields.xlsx`)
  }

  const uploadProps: UploadProps = {
    accept: ".xlsx,.xls",
    beforeUpload: async (file) => {
      const parsed = await parseExcelFile(file)
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
    setImportModal(false)
    await submitBatchPayload(importPayload, mode)
  }

  async function submitBatchPayload(
    parsed: ParsedFieldInput[],
    mode: "create" | "upsert",
  ) {
    const existingByKey = new Map(fields.map((field) => [field.key, field]))

    if (mode === "create") {
      const duplicateKeys = parsed
        .map((item) => sanitizeFieldKey(String(item.key || "")))
        .filter((key) => fieldKeys.has(key))
      if (duplicateKeys.length > 0) {
        message.error(
          `Các key đã tồn tại: ${Array.from(new Set(duplicateKeys)).join(", ")}`,
        )
        return
      }
    }

    for (const item of parsed) {
      const payload = normalizeFieldPayload(
        item as unknown as Record<string, unknown>,
        entityType,
      )
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
        <Typography.Title level={3}>Trường tuỳ biến</Typography.Title>
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
          <Button
            className="primary-glow"
            icon={<AppstoreOutlined />}
            type="primary"
            onClick={openCreateField}
          >
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
            <Button icon={<ImportOutlined />}>Nhập file</Button>
          </Upload>
        </Space>
      </div>
      <Card className="glass-card settings-card">
        <Typography.Paragraph type="secondary">
          Custom field dùng chung cho tất cả role. Phần hiển thị và bắt buộc
          nhập sẽ được cấu hình riêng theo role trong màn Cấu hình động.
        </Typography.Paragraph>
        <Table
          size="small"
          pagination={false}
          rowKey="id"
          dataSource={fields}
          scroll={{ x: "max-content" }}
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
                  <Button
                    danger
                    type="link"
                    onClick={() => deleteField(row.id)}
                  >
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
        maskClosable={false}
        onCancel={() => {
          setFieldModal(false)
          setEditingField(null)
        }}
      >
        <Form form={fieldForm} layout="vertical" onFinish={saveField}>
          <Form.Item
            name="label"
            label="Tên hiển thị"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="key"
            label="Key dữ liệu"
            rules={[{ required: true }]}
          >
            <Input placeholder="vi_du_field" />
          </Form.Item>
          <Form.Item name="dataType" label="Kiểu" initialValue="text">
            <Select options={CUSTOM_FIELD_TYPES} />
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
        title={
          batchMode === "create"
            ? "Add multi custom fields"
            : "Update multi custom fields"
        }
        open={batchModal}
        maskClosable={false}
        onCancel={() => setBatchModal(false)}
        onOk={() => void submitBatch()}
        okText={
          batchMode === "create" ? "Thêm hàng loạt" : "Cập nhật hàng loạt"
        }
        width={1440}
      >
        <Typography.Paragraph type="secondary">
          Chỉnh nhiều field trực tiếp theo dạng bảng. `Add multi` dùng để thêm
          mới hàng loạt, `Update multi` mở toàn bộ field hiện có để sửa đồng
          loạt.
        </Typography.Paragraph>
        <Space style={{ marginBottom: 16 }}>
          <Button
            icon={<PlusOutlined />}
            onClick={() =>
              setBatchRows((current) => [
                ...current,
                createEmptyBatchRow(current.length),
              ])
            }
          >
            Thêm dòng
          </Button>
          <Button
            onClick={() =>
              setBatchRows(
                batchMode === "create"
                  ? [createEmptyBatchRow(0)]
                  : fields.map((field, index) => toBatchRow(field, index)),
              )
            }
          >
            Reset dữ liệu
          </Button>
        </Space>
        <Table
          columns={buildBatchColumns(setBatchRows)}
          dataSource={batchRows}
          pagination={false}
          rowKey="__rowKey"
          scroll={{ x: "max-content", y: 520 }}
          size="small"
        />
      </Modal>
      <Modal
        title="Nhập trường tuỳ biến từ file"
        open={importModal}
        maskClosable={false}
        onCancel={() => setImportModal(false)}
        width={1120}
        footer={[
          <Button key="cancel" onClick={() => setImportModal(false)}>
            Hủy
          </Button>,
          <Button key="create" onClick={() => void confirmImport("create")}>
            Import thêm mới
          </Button>,
          <Button
            key="upsert"
            className="primary-glow"
            type="primary"
            onClick={() => void confirmImport("upsert")}
          >
            Import cập nhật
          </Button>,
        ]}
      >
        <Typography.Paragraph type="secondary">
          Đã đọc được {importPayload.length} field từ file Excel. Chọn cách
          import phù hợp.
        </Typography.Paragraph>
        <Table
          size="small"
          rowKey="key"
          pagination={false}
          scroll={{ x: "max-content", y: 360 }}
          dataSource={importPayload}
          columns={[
            { title: "Label", dataIndex: "label" },
            { title: "Key", dataIndex: "key" },
            { title: "Type", dataIndex: "dataType" },
            {
              title: "Options",
              dataIndex: "options",
              render: (value) =>
                Array.isArray(value) ? value.join(", ") : value || "-",
            },
            {
              title: "Relation",
              dataIndex: "relationResource",
              render: (value) => value || "-",
            },
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

interface BatchFieldRow {
  __rowKey: string
  label: string
  key: string
  dataType: string
  options: string
  relationResource?: string
  sortOrder: number
  isActive: boolean
}

function createEmptyBatchRow(index: number): BatchFieldRow {
  return {
    __rowKey: `new-${index}-${Date.now()}`,
    label: "",
    key: "",
    dataType: "text",
    options: "",
    relationResource: undefined,
    sortOrder: index,
    isActive: true,
  }
}

function toBatchRow(field: CustomField, index: number): BatchFieldRow {
  return {
    __rowKey: field.id,
    label: field.label,
    key: field.key,
    dataType: field.dataType,
    options: (field.options || []).join(", "),
    relationResource: field.relationResource,
    sortOrder: field.sortOrder || index,
    isActive: field.isActive,
  }
}

function normalizeBatchRow(row: BatchFieldRow): ParsedFieldInput {
  return {
    label: row.label.trim(),
    key: sanitizeFieldKey(row.key),
    dataType: row.dataType,
    options: row.options,
    relationResource:
      row.dataType === "relative" ? row.relationResource : undefined,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
  }
}

function sanitizeFieldKey(key: string) {
  return key.trim().replace(/[^a-zA-Z0-9_]/g, "_")
}

function normalizeFieldPayload(
  values: Record<string, unknown>,
  entityType: string,
) {
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
      values.dataType === "file"
        ? "files"
        : values.dataType === "relative"
          ? values.relationResource
          : undefined,
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
    const mapped = Object.fromEntries(
      headers.map((header, index) => [header, values[index]?.trim() || ""]),
    )
    return normalizeParsedField(mapped)
  })
}

async function parseExcelFile(file: File) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: "array" })
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
    defval: "",
  })
  return rows.map(normalizeParsedField)
}

function normalizeParsedField(item: Record<string, unknown>): ParsedFieldInput {
  return {
    label: String(item.label || ""),
    key: sanitizeFieldKey(String(item.key || "")),
    dataType: String(item.dataType || "text"),
    options: Array.isArray(item.options)
      ? item.options.map((value) => String(value))
      : item.options !== undefined
        ? String(item.options)
        : undefined,
    relationResource: item.relationResource
      ? String(item.relationResource)
      : undefined,
    sortOrder: item.sortOrder ? Number(item.sortOrder) : 0,
    isActive:
      item.isActive === false || String(item.isActive).toLowerCase() === "false"
        ? false
        : true,
  }
}

function buildBatchColumns(
  setBatchRows: React.Dispatch<React.SetStateAction<BatchFieldRow[]>>,
): ColumnsType<BatchFieldRow> {
  return [
    {
      title: "Nhãn",
      dataIndex: "label",
      width: 220,
      render: (_, row) => (
        <Input
          value={row.label}
          onChange={(event) =>
            setBatchRows((current) =>
              current.map((item) =>
                item.__rowKey === row.__rowKey
                  ? { ...item, label: event.target.value }
                  : item,
              ),
            )
          }
        />
      ),
    },
    {
      title: "Key",
      dataIndex: "key",
      width: 220,
      render: (_, row) => (
        <Input
          value={row.key}
          onChange={(event) =>
            setBatchRows((current) =>
              current.map((item) =>
                item.__rowKey === row.__rowKey
                  ? { ...item, key: event.target.value }
                  : item,
              ),
            )
          }
        />
      ),
    },
    {
      title: "Kiểu",
      dataIndex: "dataType",
      width: 150,
      render: (_, row) => (
        <Select
          value={row.dataType}
          options={CUSTOM_FIELD_TYPES}
          onChange={(value) =>
            setBatchRows((current) =>
              current.map((item) =>
                item.__rowKey === row.__rowKey
                  ? {
                      ...item,
                      dataType: value,
                      relationResource:
                        value === "relative"
                          ? item.relationResource
                          : undefined,
                      options: value === "select" ? item.options : "",
                    }
                  : item,
              ),
            )
          }
        />
      ),
    },
    {
      title: "Options",
      dataIndex: "options",
      width: 260,
      render: (_, row) =>
        row.dataType === "select" ? (
          <Input
            value={row.options}
            placeholder="A, B, C"
            onChange={(event) =>
              setBatchRows((current) =>
                current.map((item) =>
                  item.__rowKey === row.__rowKey
                    ? { ...item, options: event.target.value }
                    : item,
                ),
              )
            }
          />
        ) : (
          <Typography.Text type="secondary">-</Typography.Text>
        ),
    },
    {
      title: "Liên kết",
      dataIndex: "relationResource",
      width: 220,
      render: (_, row) =>
        row.dataType === "relative" ? (
          <Select
            value={row.relationResource}
            options={RELATIVE_RESOURCE_OPTIONS}
            onChange={(value) =>
              setBatchRows((current) =>
                current.map((item) =>
                  item.__rowKey === row.__rowKey
                    ? { ...item, relationResource: value }
                    : item,
                ),
              )
            }
          />
        ) : (
          <Typography.Text type="secondary">-</Typography.Text>
        ),
    },
    {
      title: "Thứ tự",
      dataIndex: "sortOrder",
      width: 120,
      render: (_, row) => (
        <InputNumber
          value={row.sortOrder}
          onChange={(value) =>
            setBatchRows((current) =>
              current.map((item) =>
                item.__rowKey === row.__rowKey
                  ? { ...item, sortOrder: Number(value || 0) }
                  : item,
              ),
            )
          }
        />
      ),
    },
    {
      title: "Hoạt động",
      dataIndex: "isActive",
      width: 120,
      render: (_, row) => (
        <Checkbox
          checked={row.isActive}
          onChange={(event) =>
            setBatchRows((current) =>
              current.map((item) =>
                item.__rowKey === row.__rowKey
                  ? { ...item, isActive: event.target.checked }
                  : item,
              ),
            )
          }
        />
      ),
    },
    {
      title: "",
      key: "actions",
      width: 88,
      render: (_, row) => (
        <Button
          danger
          icon={<DeleteOutlined />}
          type="text"
          onClick={() =>
            setBatchRows((current) =>
              current.filter((item) => item.__rowKey !== row.__rowKey),
            )
          }
        />
      ),
    },
  ]
}
