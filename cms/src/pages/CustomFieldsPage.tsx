import {
  AppstoreOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  ImportOutlined,
  MoreOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons"
import {
  Button,
  Card,
  Checkbox,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tree,
  Tooltip,
  Typography,
  Upload,
  message,
} from "antd"
import type { UploadProps } from "antd"
import type { ColumnsType } from "antd/es/table"
import { useEffect, useMemo, useState, type Key } from "react"
import * as XLSX from "xlsx"
import { api } from "../api"
import { appModuleGroups } from "../company-types"
import { ModalTitleBar } from "../components/ModalTitleBar"
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
  { value: "image", label: "Một hình ảnh (image)" },
  { value: "images", label: "Nhiều hình ảnh (images)" },
  { value: "dynamic-table", label: "Bảng dữ liệu động" },
]

const RELATIVE_RESOURCE_OPTIONS = Object.entries(entityLabels).map(
  ([value, label]) => ({ value, label }),
)

export function CustomFieldsPage() {
  const [entityType, setEntityType] = useState("customers")
  const [activeTab, setActiveTab] = useState("fields")
  const [codeFormula, setCodeFormula] = useState("")
  const [codeEnabled, setCodeEnabled] = useState(true)
  const [savingCode, setSavingCode] = useState(false)
  const [fields, setFields] = useState<CustomField[]>([])
  const [customTables, setCustomTables] = useState<Array<{ id: string; name: string; key: string }>>([])
  const [fieldModal, setFieldModal] = useState(false)
  const [editingField, setEditingField] = useState<CustomField | null>(null)
  const [fullscreenPopup, setFullscreenPopup] = useState<string | null>(null)
  const [batchModal, setBatchModal] = useState(false)
  const [batchMode, setBatchMode] = useState<"create" | "upsert">("create")
  const [batchRows, setBatchRows] = useState<BatchFieldRow[]>([])
  const [importModal, setImportModal] = useState(false)
  const [importPayload, setImportPayload] = useState<ParsedFieldInput[]>([])
  const [selectedFieldIds, setSelectedFieldIds] = useState<Key[]>([])
  const [fieldForm] = Form.useForm()
  const currentFieldType = Form.useWatch("dataType", fieldForm)
  const fieldKeys = useMemo(
    () => new Set(fields.map((field) => field.key)),
    [fields],
  )

  useEffect(() => {
    void load()
  }, [entityType])

  useEffect(() => {
    api.get("/settings/custom-tables").then((response) => setCustomTables(response.data.data || [])).catch(() => setCustomTables([]))
  }, [])

  async function load() {
    const [fieldResponse, codeResponse] = await Promise.all([
      api.get("/settings/custom-fields", { params: { entityType } }),
      api.get(`/settings/code-generation/${entityType}`),
    ])
    setFields(fieldResponse.data.data)
    setCodeFormula(codeResponse.data?.data?.formula || "")
    setCodeEnabled(codeResponse.data?.data?.isActive !== false)
    setSelectedFieldIds([])
  }

  async function saveCodeSetting() {
    setSavingCode(true)
    try {
      await api.put(`/settings/code-generation/${entityType}`, { formula: codeFormula, isActive: codeEnabled })
      message.success("Đã lưu công thức sinh mã")
    } finally {
      setSavingCode(false)
    }
  }

  const moduleTree = useMemo(() => {
    const grouped = new Set<string>()
    const groups = appModuleGroups.map((group) => {
      const children = group.modules.filter((key) => entityLabels[key]).map((key) => {
        grouped.add(key)
        return { key, title: entityLabels[key] }
      })
      return children.length ? { key: `group-${group.key}`, title: group.label, selectable: false, children } : null
    }).filter(Boolean) as Array<{ key: string; title: string; selectable: false; children: Array<{ key: string; title: string }> }>
    const remaining = Object.keys(entityLabels).filter((key) => !grouped.has(key)).map((key) => ({ key, title: entityLabels[key] }))
    if (remaining.length) groups.push({ key: "group-other", title: "Khác", selectable: false, children: remaining })
    return groups
  }, [])

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
    setFullscreenPopup((current) => current === "field" ? null : current)
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

  function archiveSelectedFields() {
    const ids = selectedFieldIds.map(String)
    if (!ids.length) return
    Modal.confirm({
      title: `Lưu trữ ${ids.length} trường tuỳ biến?`,
      content: "Các trường đã lưu trữ sẽ không còn hiển thị trên form.",
      okButtonProps: { danger: true },
      okText: "Lưu trữ",
      cancelText: "Hủy",
      onOk: async () => {
        await Promise.all(ids.map((id) => api.delete(`/settings/custom-fields/${id}`)))
        message.success(`Đã lưu trữ ${ids.length} trường tuỳ biến`)
        await load()
      },
    })
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
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["label", "key", "dataType", "options", "relationResource", "sortOrder", "isActive"],
      ...payload.map((field) => [field.label, field.key, field.dataType, field.options, field.relationResource, field.sortOrder, field.isActive]),
    ])
    XLSX.utils.book_append_sheet(workbook, worksheet, "CustomFields")
    XLSX.writeFile(workbook, `${entityType}-custom-fields.xlsx`)
  }

  function exportSampleFields() {
    const payload = buildSampleFields(entityType, 0).map((field) => ({
      label: field.label,
      key: field.key,
      dataType: field.dataType,
      options: Array.isArray(field.options) ? field.options.join(", ") : "",
      relationResource: "",
      sortOrder: field.sortOrder,
      isActive: field.isActive ? "true" : "false",
    }))
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["label", "key", "dataType", "options", "relationResource", "sortOrder", "isActive"],
      ...payload.map((field) => [field.label, field.key, field.dataType, field.options, field.relationResource, field.sortOrder, field.isActive]),
    ])
    XLSX.utils.book_append_sheet(workbook, worksheet, "CustomFields")
    XLSX.writeFile(workbook, `${entityType}-custom-fields-test.xlsx`)
    message.success(`Đã export ${payload.length} field mẫu cho ${entityLabels[entityType] || entityType}`)
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
      message.warning("Tệp nhập chưa có dữ liệu hợp lệ")
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
          {selectedFieldIds.length > 0 ? (
            <Button danger icon={<DeleteOutlined />} onClick={archiveSelectedFields}>
              Lưu trữ đã chọn ({selectedFieldIds.length})
            </Button>
          ) : null}
          <Button
            className="primary-glow"
            icon={<AppstoreOutlined />}
            type="primary"
            onClick={openCreateField}
          >
            Thêm field
          </Button>
          <Dropdown
            dropdownRender={() => (
              <Card size="small" styles={{ body: { display: "grid", gap: 4, minWidth: 190 } }}>
                <Button icon={<UploadOutlined />} type="text" onClick={() => openBatch("create")}>Thêm nhiều trường</Button>
                <Button icon={<UploadOutlined />} type="text" onClick={() => openBatch("upsert")}>Cập nhật nhiều trường</Button>
                <Button icon={<DownloadOutlined />} type="text" onClick={exportFields}>Xuất cấu hình</Button>
                <Button icon={<DownloadOutlined />} type="text" onClick={exportSampleFields}>Tải dữ liệu mẫu</Button>
                <Upload {...uploadProps}>
                  <Button block icon={<ImportOutlined />} type="text">Nhập file</Button>
                </Upload>
              </Card>
            )}
            trigger={["click"]}
          >
            <Button icon={<MoreOutlined />}>Thao tác</Button>
          </Dropdown>
        </Space>
      </div>
      <div className="custom-fields-workspace">
        <Card className="glass-card custom-fields-module-tree" title="Module">
          <Tree
            defaultExpandAll
            selectedKeys={[entityType]}
            treeData={moduleTree}
            onSelect={(keys) => {
              const selected = String(keys[0] || "")
              if (selected && !selected.startsWith("group-")) setEntityType(selected)
            }}
          />
        </Card>
        <div className="custom-fields-content">
          <Tabs
            activeKey={activeTab}
            items={[
              { key: "fields", label: "Trường tuỳ biến" },
              { key: "settings", label: "Cài đặt mã" },
            ]}
            onChange={setActiveTab}
          />
          {activeTab === "fields" && <Card className="glass-card settings-card">
        <Typography.Paragraph type="secondary">
          Custom field dùng chung cho tất cả role. Phần hiển thị và bắt buộc
          nhập sẽ được cấu hình riêng theo role trong màn Cấu hình động.
        </Typography.Paragraph>
        <Table
          size="small"
          pagination={false}
          rowKey="id"
          dataSource={fields}
          rowSelection={{
            selectedRowKeys: selectedFieldIds,
            onChange: setSelectedFieldIds,
            preserveSelectedRowKeys: true,
          }}
          scroll={{ x: "max-content" }}
          columns={[
            { title: "Nhãn", dataIndex: "label" },
            { title: "Mã trường", dataIndex: "key" },
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
              width: 96,
              render: (_, row) => (
                <Space size={2}>
                  <Tooltip title="Sửa trường">
                    <Button icon={<EditOutlined />} type="text" onClick={() => openEditField(row)} />
                  </Tooltip>
                  <Tooltip title="Lưu trữ">
                    <Button danger icon={<DeleteOutlined />} type="text" onClick={() => deleteField(row.id)} />
                  </Tooltip>
                </Space>
              ),
            },
          ]}
        />
          </Card>}
          {activeTab === "settings" && (
            <Card className="glass-card settings-card" title={`Sinh mã tự động · ${entityLabels[entityType] || entityType}`}>
              <Typography.Paragraph type="secondary">
                Khi tạo mới và không nhập mã, hệ thống sẽ sinh mã theo công thức này. Mã nhập thủ công vẫn được giữ nguyên.
              </Typography.Paragraph>
              <Form layout="vertical" onFinish={() => void saveCodeSetting()}>
                <Form.Item label="Công thức mã" extra="Ví dụ: OR-{NUMBER:4}, HD-{YMD}-{NUMBER_DAY:3}">
                  <Input value={codeFormula} onChange={(event) => setCodeFormula(event.target.value)} placeholder={defaultCodeFormula(entityType)} />
                </Form.Item>
                <Form.Item label="Bật tự động sinh mã" valuePropName="checked">
                  <Checkbox checked={codeEnabled} onChange={(event) => setCodeEnabled(event.target.checked)}>Tự động sinh mã khi để trống</Checkbox>
                </Form.Item>
                <Typography.Paragraph type="secondary">
                  <code>{previewCodeFormula(codeFormula, entityType)}</code>
                  <br />
                  <strong>{'{NUMBER:4}'}</strong>: số tăng toàn bộ, 4 ký tự. <strong>{'{NUMBER_DAY:3}'}</strong>: số tăng lại mỗi ngày, 3 ký tự. <strong>{'{YMD}'}</strong>: ngày hiện tại dạng YYYYMMDD.
                </Typography.Paragraph>
                <Button className="primary-glow" htmlType="submit" loading={savingCode} type="primary">Lưu cài đặt mã</Button>
              </Form>
            </Card>
          )}
        </div>
      </div>
      <Modal
        className={`quick-drawer${fullscreenPopup === "field" ? " quick-drawer-fullscreen" : ""}`}
        title={
          <ModalTitleBar
            fullscreen={fullscreenPopup === "field"}
            title={editingField ? "Cập nhật custom field" : "Thêm custom field"}
            onToggleFullscreen={() => setFullscreenPopup((current) => current === "field" ? null : "field")}
          />
        }
        open={fieldModal}
        footer={null}
        maskClosable={false}
        width={fullscreenPopup === "field" ? "calc(100vw - 24px)" : 560}
        onCancel={() => {
          setFieldModal(false)
          setEditingField(null)
          setFullscreenPopup((current) => current === "field" ? null : current)
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
          {currentFieldType === "dynamic-table" && (
            <Form.Item
              name="customTableId"
              label="Bảng dữ liệu liên kết"
              rules={[{ required: true, message: "Chọn bảng dữ liệu động" }]}
            >
              <Select options={customTables.map((table) => ({ value: table.id, label: `${table.name} (${table.key})` }))} />
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
        className={`quick-drawer${fullscreenPopup === "batch" ? " quick-drawer-fullscreen" : ""}`}
        title={
          <ModalTitleBar
            fullscreen={fullscreenPopup === "batch"}
            title={batchMode === "create" ? "Thêm nhiều trường tuỳ biến" : "Cập nhật nhiều trường tuỳ biến"}
            onToggleFullscreen={() => setFullscreenPopup((current) => current === "batch" ? null : "batch")}
          />
        }
        open={batchModal}
        maskClosable={false}
        onCancel={() => {
          setBatchModal(false)
          setFullscreenPopup((current) => current === "batch" ? null : current)
        }}
        onOk={() => void submitBatch()}
        okText={
          batchMode === "create" ? "Thêm hàng loạt" : "Cập nhật hàng loạt"
        }
        width={fullscreenPopup === "batch" ? "calc(100vw - 24px)" : 1440}
      >
        <Typography.Paragraph type="secondary">
          Chỉnh nhiều trường trực tiếp theo dạng bảng. `Thêm nhiều trường` dùng để thêm
          mới hàng loạt, `Cập nhật nhiều trường` mở toàn bộ trường hiện có để sửa đồng
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
        className={`quick-drawer${fullscreenPopup === "import" ? " quick-drawer-fullscreen" : ""}`}
        title={
          <ModalTitleBar
            fullscreen={fullscreenPopup === "import"}
            title="Nhập trường tuỳ biến từ file"
            onToggleFullscreen={() => setFullscreenPopup((current) => current === "import" ? null : "import")}
          />
        }
        open={importModal}
        maskClosable={false}
        onCancel={() => {
          setImportModal(false)
          setFullscreenPopup((current) => current === "import" ? null : current)
        }}
        width={fullscreenPopup === "import" ? "calc(100vw - 24px)" : 1120}
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
            { title: "Nhãn", dataIndex: "label" },
            { title: "Mã trường", dataIndex: "key" },
            { title: "Kiểu dữ liệu", dataIndex: "dataType" },
            {
              title: "Lựa chọn",
              dataIndex: "options",
              render: (value) =>
                Array.isArray(value) ? value.join(", ") : value || "-",
            },
            {
              title: "Liên kết",
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

function defaultCodeFormula(resource: string) {
  const prefixes: Record<string, string> = {
    appointments: "APT", branches: "BRA", customers: "CUS", departments: "DEP", expenses: "EXP",
    invoices: "INV", leads: "LEAD", medical_episodes: "MED", "medical-episodes": "MED", products: "PROD",
    projects: "PROJ", rooms: "ROOM", service_orders: "SO", "service-orders": "SO", staff: "STF",
    suppliers: "SUP", tasks: "TASK", treatments: "TRT", users: "USR",
  }
  const normalized = String(resource || "").trim().toLowerCase()
  const prefix = prefixes[normalized] || normalized.split(/[-_]/).filter(Boolean).map((part) => part.slice(0, 2)).join("").slice(0, 4).toUpperCase() || "REC"
  return `${prefix}-{NUMBER:6}`
}

function previewCodeFormula(formula: string, resource = "") {
  const now = new Date()
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`
  return (formula || defaultCodeFormula(resource))
    .replace(/\{YMD\}/g, ymd)
    .replace(/\{NUMBER(?::\d+)?\}/g, "0001")
    .replace(/\{NUMBER_DAY(?::\d+)?\}/g, "001")
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
    customTableId: values.dataType === "dynamic-table" ? values.customTableId : undefined,
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
      throw new Error("JSON nhập phải là mảng dữ liệu")
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
  const normalized = Object.fromEntries(
    Object.entries(item).map(([key, value]) => [key.trim().toLowerCase(), value]),
  ) as Record<string, unknown>

  return {
    label: String(normalized.label || normalized["nhãn"] || ""),
    key: sanitizeFieldKey(String(normalized.key || "")),
    dataType: String(normalized.datatype || normalized.type || "text"),
    options: Array.isArray(normalized.options)
      ? normalized.options.map((value) => String(value))
      : normalized.options !== undefined
        ? String(normalized.options)
        : undefined,
    relationResource: normalized.relationresource || normalized.relation
      ? String(normalized.relationresource || normalized.relation)
      : undefined,
    sortOrder: normalized.sortorder ? Number(normalized.sortorder) : 0,
    isActive:
      normalized.isactive === false || String(normalized.isactive).toLowerCase() === "false"
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
      title: "Mã trường",
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
      title: "Lựa chọn",
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

function buildSampleFields(entityType: string, startSortOrder: number) {
  const keyPrefix = `sample_${entityType.replace(/[^a-z0-9]+/gi, "_")}`
  const templates = [
    { suffix: "text", label: "Thông tin bổ sung", dataType: "text" },
    { suffix: "note", label: "Ghi chú nội bộ", dataType: "textarea" },
    { suffix: "priority", label: "Mức ưu tiên", dataType: "select", options: ["Thấp", "Trung bình", "Cao"] },
    { suffix: "score", label: "Điểm đánh giá", dataType: "number" },
    { suffix: "date", label: "Ngày theo dõi", dataType: "date" },
  ]

  return Array.from({ length: 50 }, (_, index) => {
    const template = templates[index % templates.length]
    const number = String(index + 1).padStart(2, "0")
    return {
      entityType,
      key: `${keyPrefix}_${template.suffix}_${number}`,
      label: `Mẫu ${number} - ${template.label}`,
      dataType: template.dataType,
      options: template.options,
      required: false,
      isActive: true,
      sortOrder: startSortOrder + index,
    }
  })
}
