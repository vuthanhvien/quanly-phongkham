import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusCircleOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons"
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from "antd"
import type { UploadFile } from "antd"
import { useEffect, useState } from "react"
import * as XLSX from "xlsx"
import { api } from "../api"

interface ItemCategory {
  id: string
  name: string
  code?: string
  description?: string
  parentId?: string
  level: number
  sortOrder: number
  isActive: boolean
  children?: ItemCategory[]
}

interface ImportRow {
  code?: string
  name?: string
  parentCode?: string
  description?: string
  sortOrder?: number
  isActive?: boolean | string | number
}

interface ImportResult {
  success: number
  failed: number
  results: Array<ItemCategory & { _action: string }>
  errors: Array<{ rowIndex: number; code?: string; error: string }>
}

const LEVEL_LABELS: Record<number, string> = { 1: "Ngành", 2: "Nhóm", 3: "Loại" }
const LEVEL_COLORS: Record<number, string> = { 1: "blue", 2: "green", 3: "orange" }

function buildTree(flat: ItemCategory[]): ItemCategory[] {
  const map = new Map<string, ItemCategory>()
  flat.forEach((item) => map.set(item.id, { ...item, children: [] }))

  const roots: ItemCategory[] = []
  flat.forEach((item) => {
    const node = map.get(item.id)!
    if (item.parentId) {
      const parent = map.get(item.parentId)
      if (parent) {
        parent.children!.push(node)
      } else {
        roots.push(node)
      }
    } else {
      roots.push(node)
    }
  })

  map.forEach((node) => {
    if (node.children && node.children.length === 0) delete node.children
  })

  return roots
}

export function CategoriesPage() {
  const [flat, setFlat] = useState<ItemCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ItemCategory | null>(null)
  const [form] = Form.useForm()

  // Import state
  const [importModal, setImportModal] = useState(false)
  const [importRows, setImportRows] = useState<ImportRow[]>([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [fileList, setFileList] = useState<UploadFile[]>([])

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await api.get("/product-categories")
      setFlat(res.data.data as ItemCategory[])
    } finally {
      setLoading(false)
    }
  }

  function openCreate(parentId?: string) {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ parentId: parentId ?? null, isActive: true, sortOrder: 0 })
    setModalOpen(true)
  }

  function openEdit(cat: ItemCategory) {
    setEditing(cat)
    form.setFieldsValue({
      name: cat.name,
      code: cat.code ?? "",
      description: cat.description ?? "",
      parentId: cat.parentId ?? null,
      sortOrder: cat.sortOrder,
      isActive: cat.isActive,
    })
    setModalOpen(true)
  }

  async function save(values: Record<string, unknown>) {
    const payload = { ...values, parentId: values.parentId || null }
    try {
      if (editing) {
        await api.patch(`/product-categories/${editing.id}`, payload)
        void message.success("Đã cập nhật danh mục")
      } else {
        await api.post("/product-categories", payload)
        void message.success("Đã thêm danh mục")
      }
      setModalOpen(false)
      setEditing(null)
      await load()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Có lỗi xảy ra"
      void message.error(msg)
    }
  }

  function confirmDelete(cat: ItemCategory) {
    Modal.confirm({
      title: `Xóa "${cat.name}"?`,
      content: "Không thể xóa nếu còn danh mục con.",
      okType: "danger",
      okText: "Xóa",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          await api.delete(`/product-categories/${cat.id}`)
          void message.success("Đã xóa")
          await load()
        } catch (err: unknown) {
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            "Có lỗi xảy ra"
          void message.error(msg)
        }
      },
    })
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ["code", "name", "parentCode", "description", "sortOrder", "isActive"],
      ["DA-LIEU", "Da liễu", "", "Nhóm ngành da liễu", "1", "1"],
      ["DIEU-TRI-MUN", "Điều trị mụn", "DA-LIEU", "Dịch vụ điều trị mụn", "1", "1"],
      ["CAM-MUN-CAP-DO-1", "Cấm mụn cấp độ 1", "DIEU-TRI-MUN", "", "1", "1"],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "categories")
    XLSX.writeFile(wb, "categories-template.xlsx")
  }

  function handleFileUpload(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: "array" })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<ImportRow>(ws, { defval: "" })
      setImportRows(rows)
      setImportResult(null)
    }
    reader.readAsArrayBuffer(file)
    return false
  }

  async function runImport() {
    if (!importRows.length) return
    setImporting(true)
    try {
      const res = await api.post("/product-categories/import", { rows: importRows })
      setImportResult(res.data as ImportResult)
      await load()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Import thất bại"
      void message.error(msg)
    } finally {
      setImporting(false)
    }
  }

  function closeImport() {
    setImportModal(false)
    setImportRows([])
    setImportResult(null)
    setFileList([])
  }

  const tree = buildTree(flat)

  const parentOptions = flat
    .filter((c) => c.level < 3 && c.id !== editing?.id)
    .map((c) => ({
      value: c.id,
      label: `${"　".repeat(c.level - 1)}${LEVEL_LABELS[c.level]}: ${c.name}`,
    }))

  const columns = [
    {
      title: "Tên danh mục",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Mã",
      dataIndex: "code",
      key: "code",
      width: 120,
      render: (v?: string) => (v ? <code style={{ fontSize: 12 }}>{v}</code> : "—"),
    },
    {
      title: "Cấp",
      dataIndex: "level",
      key: "level",
      width: 90,
      render: (v: number) => (
        <Tag color={LEVEL_COLORS[v]}>{LEVEL_LABELS[v] ?? `Cấp ${v}`}</Tag>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      width: 110,
      render: (v: boolean) => (
        <Tag color={v ? "success" : "default"}>{v ? "Bật" : "Tắt"}</Tag>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 200,
      render: (_: unknown, row: ItemCategory) => (
        <Space size={0}>
          {row.level < 3 && (
            <Button
              type="link"
              size="small"
              icon={<PlusCircleOutlined />}
              onClick={() => openCreate(row.id)}
            >
              Thêm con
            </Button>
          )}
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(row)}
          />
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => confirmDelete(row)}
          />
        </Space>
      ),
    },
  ]

  const importPreviewColumns = [
    { title: "code", dataIndex: "code", key: "code", width: 120 },
    { title: "name", dataIndex: "name", key: "name" },
    { title: "parentCode", dataIndex: "parentCode", key: "parentCode", width: 120 },
    { title: "description", dataIndex: "description", key: "description" },
    { title: "sortOrder", dataIndex: "sortOrder", key: "sortOrder", width: 80 },
    {
      title: "isActive",
      dataIndex: "isActive",
      key: "isActive",
      width: 80,
      render: (v: unknown) => String(v),
    },
  ]

  return (
    <>
      <div className="page-header">
        <div>
          <Typography.Title level={3}>Ngành / Nhóm / Loại</Typography.Title>
        </div>
        <Space>
          <Button icon={<UploadOutlined />} onClick={() => setImportModal(true)}>
            Import
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate()}>
            Thêm ngành
          </Button>
        </Space>
      </div>

      <Card className="glass-card">
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
          Cấu trúc 3 cấp: <Tag color="blue">Ngành</Tag> →{" "}
          <Tag color="green">Nhóm</Tag> → <Tag color="orange">Loại</Tag>
        </Typography.Paragraph>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={tree}
          columns={columns}
          pagination={false}
          size="small"
          scroll={{ x: "max-content" }}
          expandable={{ defaultExpandAllRows: true }}
          indentSize={28}
        />
      </Card>

      {/* Create / Edit modal */}
      <Modal
        title={editing ? "Chỉnh sửa danh mục" : "Thêm danh mục"}
        open={modalOpen}
        footer={null}
        maskClosable={false}
        onCancel={() => {
          setModalOpen(false)
          setEditing(null)
        }}
      >
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item name="name" label="Tên danh mục" rules={[{ required: true, message: "Nhập tên danh mục" }]}>
            <Input placeholder="VD: Da liễu, Điều trị mụn, Dưỡng da..." />
          </Form.Item>
          <Form.Item name="code" label="Mã (tùy chọn)">
            <Input placeholder="VD: DL-001" />
          </Form.Item>
          <Form.Item name="parentId" label="Thuộc về (danh mục cha)">
            <Select
              allowClear
              placeholder="— Cấp gốc (Ngành) —"
              options={parentOptions}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} placeholder="Mô tả ngắn về danh mục này..." />
          </Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự hiển thị" initialValue={0}>
            <Input type="number" style={{ width: 120 }} />
          </Form.Item>
          <Form.Item name="isActive" label="Trạng thái" valuePropName="checked" initialValue>
            <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
          </Form.Item>
          <Button type="primary" htmlType="submit" className="primary-glow">
            {editing ? "Cập nhật" : "Thêm danh mục"}
          </Button>
        </Form>
      </Modal>

      {/* Import modal */}
      <Modal
        title="Import Ngành / Nhóm / Loại"
        open={importModal}
        onCancel={closeImport}
        footer={null}
        width={860}
      >
        {!importResult ? (
          <>
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message='Dùng cột "parentCode" để xác định cha con'
              description="File cần có cột: code, name, parentCode (để trống nếu là Ngành gốc), description, sortOrder, isActive (1/0). Nếu code đã tồn tại sẽ cập nhật, chưa có thì tạo mới."
            />
            <Space style={{ marginBottom: 16 }}>
              <Button icon={<DownloadOutlined />} onClick={downloadTemplate}>
                Tải file mẫu
              </Button>
            </Space>
            <Upload
              accept=".xlsx,.xls,.csv"
              fileList={fileList}
              beforeUpload={(file) => {
                setFileList([file as UploadFile])
                handleFileUpload(file)
                return false
              }}
              onRemove={() => {
                setFileList([])
                setImportRows([])
              }}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>Chọn file Excel / CSV</Button>
            </Upload>

            {importRows.length > 0 && (
              <>
                <Typography.Text type="secondary" style={{ display: "block", margin: "12px 0 8px" }}>
                  Đọc được {importRows.length} dòng — xem trước:
                </Typography.Text>
                <Table
                  rowKey={(_, i) => String(i)}
                  dataSource={importRows.slice(0, 20)}
                  columns={importPreviewColumns}
                  pagination={false}
                  size="small"
                  scroll={{ x: "max-content", y: 260 }}
                  style={{ marginBottom: 16 }}
                />
                {importRows.length > 20 && (
                  <Typography.Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
                    ... và {importRows.length - 20} dòng khác
                  </Typography.Text>
                )}
                <Button
                  type="primary"
                  className="primary-glow"
                  loading={importing}
                  onClick={runImport}
                >
                  Xác nhận import {importRows.length} dòng
                </Button>
              </>
            )}
          </>
        ) : (
          <>
            <Space style={{ marginBottom: 16 }} size={12}>
              <Tag color="success" style={{ fontSize: 14, padding: "4px 10px" }}>
                Thành công: {importResult.success}
              </Tag>
              {importResult.failed > 0 && (
                <Tag color="error" style={{ fontSize: 14, padding: "4px 10px" }}>
                  Thất bại: {importResult.failed}
                </Tag>
              )}
            </Space>

            {importResult.errors.length > 0 && (
              <Alert
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
                message={`${importResult.failed} dòng lỗi`}
                description={
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {importResult.errors.map((e, i) => (
                      <li key={i}>
                        Dòng {e.rowIndex}{e.code ? ` (code: ${e.code})` : ""}: {e.error}
                      </li>
                    ))}
                  </ul>
                }
              />
            )}

            <Space>
              <Button type="primary" onClick={closeImport}>
                Đóng
              </Button>
              <Button
                onClick={() => {
                  setImportResult(null)
                  setImportRows([])
                  setFileList([])
                }}
              >
                Import thêm
              </Button>
            </Space>
          </>
        )}
      </Modal>
    </>
  )
}
