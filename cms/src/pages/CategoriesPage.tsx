import {
  DeleteOutlined,
  EditOutlined,
  PlusCircleOutlined,
  PlusOutlined,
} from "@ant-design/icons"
import {
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
  message,
} from "antd"
import { useEffect, useState } from "react"
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

  return (
    <>
      <div className="page-header">
        <div>
          <Typography.Title level={3}>Ngành / Nhóm / Loại</Typography.Title>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate()}>
          Thêm ngành
        </Button>
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
    </>
  )
}
