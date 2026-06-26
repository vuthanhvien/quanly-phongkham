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

interface Department {
  id: string
  code: string
  name: string
  branchId?: string
  managerStaffId?: string
  description?: string
  parentId?: string
  sortOrder: number
  isActive: boolean
  children?: Department[]
}

interface Branch {
  id: string
  name: string
}

interface Staff {
  id: string
  fullName: string
  code: string
}

function buildTree(flat: Department[]): Department[] {
  const map = new Map<string, Department>()
  flat.forEach((d) => map.set(d.id, { ...d, children: [] }))
  const roots: Department[] = []
  flat.forEach((d) => {
    const node = map.get(d.id)!
    if (d.parentId && map.has(d.parentId)) {
      map.get(d.parentId)!.children!.push(node)
    } else {
      roots.push(node)
    }
  })
  map.forEach((node) => {
    if (!node.children?.length) delete node.children
  })
  return roots
}

export function DepartmentsPage() {
  const [flat, setFlat] = useState<Department[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [form] = Form.useForm()

  useEffect(() => { void load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [deptRes, branchRes, staffRes] = await Promise.all([
        api.get("/records/departments", { params: { pageSize: 500 } }),
        api.get("/records/branches", { params: { pageSize: 200 } }),
        api.get("/records/staff", { params: { pageSize: 500 } }),
      ])
      setFlat(deptRes.data.data as Department[])
      setBranches(branchRes.data.data.map((r: Record<string, unknown>) => ({ id: String(r.id), name: String(r.name || r.slug) })))
      setStaffList(staffRes.data.data.map((r: Record<string, unknown>) => ({ id: String(r.id), fullName: String(r.fullName || r.code), code: String(r.code) })))
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

  function openEdit(dept: Department) {
    setEditing(dept)
    form.setFieldsValue({
      code: dept.code,
      name: dept.name,
      branchId: dept.branchId ?? null,
      managerStaffId: dept.managerStaffId ?? null,
      description: dept.description ?? "",
      parentId: dept.parentId ?? null,
      sortOrder: dept.sortOrder,
      isActive: dept.isActive,
    })
    setModalOpen(true)
  }

  async function save(values: Record<string, unknown>) {
    const payload = {
      ...values,
      parentId: values.parentId || null,
      branchId: values.branchId || null,
      managerStaffId: values.managerStaffId || null,
    }
    try {
      if (editing) {
        await api.patch(`/records/departments/${editing.id}`, payload)
        void message.success("Đã cập nhật phòng ban")
      } else {
        await api.post("/records/departments", payload)
        void message.success("Đã thêm phòng ban")
      }
      setModalOpen(false)
      setEditing(null)
      await load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Có lỗi xảy ra"
      void message.error(msg)
    }
  }

  function confirmDelete(dept: Department) {
    Modal.confirm({
      title: `Xóa "${dept.name}"?`,
      content: "Không thể xóa nếu còn phòng ban con.",
      okType: "danger",
      okText: "Xóa",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          await api.delete(`/records/departments/${dept.id}`)
          void message.success("Đã xóa")
          await load()
        } catch (err: unknown) {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Có lỗi xảy ra"
          void message.error(msg)
        }
      },
    })
  }

  const tree = buildTree(flat)

  const branchMap = Object.fromEntries(branches.map((b) => [b.id, b.name]))
  const staffMap = Object.fromEntries(staffList.map((s) => [s.id, s.fullName]))

  const parentOptions = flat
    .filter((d) => d.id !== editing?.id)
    .map((d) => ({ value: d.id, label: d.name }))

  const columns = [
    {
      title: "Tên phòng ban",
      key: "name",
      render: (_: unknown, row: Department) => (
        <Space>
          <Typography.Text strong>{row.name}</Typography.Text>
          <code style={{ fontSize: 11, opacity: 0.6 }}>{row.code}</code>
        </Space>
      ),
    },
    {
      title: "Chi nhánh",
      dataIndex: "branchId",
      key: "branchId",
      width: 160,
      render: (v?: string) => v ? <Tag>{branchMap[v] || v}</Tag> : "—",
    },
    {
      title: "Trưởng bộ phận",
      dataIndex: "managerStaffId",
      key: "managerStaffId",
      width: 180,
      render: (v?: string) => v ? staffMap[v] || v : "—",
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      width: 110,
      render: (v: boolean) => <Tag color={v ? "success" : "default"}>{v ? "Bật" : "Tắt"}</Tag>,
    },
    {
      title: "",
      key: "actions",
      width: 180,
      render: (_: unknown, row: Department) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<PlusCircleOutlined />} onClick={() => openCreate(row.id)}>
            Thêm con
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => confirmDelete(row)} />
        </Space>
      ),
    },
  ]

  return (
    <>
      <div className="page-header">
        <Typography.Title level={3} style={{ margin: 0 }}>Phòng ban</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate()}>
          Thêm phòng ban
        </Button>
      </div>

      <Card className="glass-card">
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
        title={editing ? "Chỉnh sửa phòng ban" : "Thêm phòng ban"}
        open={modalOpen}
        footer={null}
        maskClosable={false}
        width={560}
        onCancel={() => { setModalOpen(false); setEditing(null) }}
      >
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item name="name" label="Tên phòng ban" rules={[{ required: true, message: "Nhập tên" }]}>
            <Input placeholder="VD: Phòng kỹ thuật, Bộ phận lễ tân..." />
          </Form.Item>
          <Form.Item name="code" label="Mã phòng ban" rules={[{ required: true, message: "Nhập mã" }]}>
            <Input placeholder="VD: PB-001" />
          </Form.Item>
          <Form.Item
            name="parentId"
            label="Thuộc phòng ban (cha)"
            extra="Để trống → phòng ban cấp gốc. Xóa giá trị để đưa lên top."
          >
            <Select
              allowClear
              placeholder="— Cấp gốc (không có cha) —"
              options={parentOptions}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="branchId" label="Chi nhánh">
            <Select
              allowClear
              placeholder="Chọn chi nhánh..."
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="managerStaffId" label="Trưởng bộ phận">
            <Select
              allowClear
              placeholder="Chọn nhân viên..."
              options={staffList.map((s) => ({ value: s.id, label: `${s.fullName} (${s.code})` }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự" initialValue={0}>
            <Input type="number" style={{ width: 120 }} />
          </Form.Item>
          <Form.Item name="isActive" label="Trạng thái" valuePropName="checked" initialValue>
            <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
          </Form.Item>
          <Button type="primary" htmlType="submit" className="primary-glow">
            {editing ? "Cập nhật" : "Thêm phòng ban"}
          </Button>
        </Form>
      </Modal>
    </>
  )
}
