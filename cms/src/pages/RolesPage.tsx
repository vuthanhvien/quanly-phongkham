import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  UserOutlined,
} from "@ant-design/icons"
import {
  Button,
  Card,
  Checkbox,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tabs,
  Typography,
  message,
} from "antd"
import { useEffect, useMemo, useState } from "react"
import { api } from "../api"
import { BranchRoleAssignment, DynamicRole, systemRoleSelectOptions } from "../models"

interface RoleFormValues {
  key: string
  name: string
  roleMain: string
  isActive: boolean
}

interface AssignmentFormValues {
  userId: string
  branchId: string
  roleKeys: string[]
  isActive: boolean
}

const ROLE_MAIN_COLOR: Record<string, string> = {
  ADMIN: "red",
  STAFF: "blue",
  DOCTOR: "green",
}

const ROLE_MAIN_LABEL: Record<string, string> = {
  ADMIN: "Quản trị viên",
  STAFF: "Nhân viên",
  DOCTOR: "Bác sĩ",
}

export function RolesPage() {
  const [roles, setRoles] = useState<DynamicRole[]>([])
  const [assignments, setAssignments] = useState<BranchRoleAssignment[]>([])
  const [userOptions, setUserOptions] = useState<Array<{ value: string; label: string }>>([])
  const [branchOptions, setBranchOptions] = useState<Array<{ value: string; label: string }>>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("roles")

  // Role modal
  const [roleModal, setRoleModal] = useState(false)
  const [editingRole, setEditingRole] = useState<DynamicRole | null>(null)
  const [roleForm] = Form.useForm<RoleFormValues>()

  // Assignment modal
  const [assignModal, setAssignModal] = useState(false)
  const [editingAssign, setEditingAssign] = useState<BranchRoleAssignment | null>(null)
  const [assignForm] = Form.useForm<AssignmentFormValues>()

  // Filters
  const [assignSearch, setAssignSearch] = useState("")
  const [filterBranch, setFilterBranch] = useState<string | null>(null)
  const [filterRole, setFilterRole] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const [rolesRes, assignRes, usersRes, branchesRes] = await Promise.all([
        api.get("/settings/dynamic-roles"),
        api.get("/settings/branch-role-assignments"),
        api.get("/records/user-accounts", { params: { pageSize: 200 } }),
        api.get("/records/branches", { params: { pageSize: 200 } }),
      ])
      setRoles(rolesRes.data.data)
      setAssignments(assignRes.data.data)
      setUserOptions(
        usersRes.data.data.map((row: Record<string, unknown>) => ({
          value: String(row.id),
          label: `${row.fullName || row.email}`,
        })),
      )
      setBranchOptions(
        branchesRes.data.data.map((row: Record<string, unknown>) => ({
          value: String(row.id),
          label: String(row.name || row.slug),
        })),
      )
    } finally {
      setLoading(false)
    }
  }

  // ── Roles CRUD ──────────────────────────────────────────

  function openCreateRole() {
    setEditingRole(null)
    roleForm.resetFields()
    roleForm.setFieldsValue({ key: "", name: "", roleMain: "STAFF", isActive: true })
    setRoleModal(true)
  }

  function openEditRole(role: DynamicRole) {
    setEditingRole(role)
    roleForm.setFieldsValue(role)
    setRoleModal(true)
  }

  async function saveRole(values: RoleFormValues) {
    if (editingRole) {
      await api.patch(`/settings/dynamic-roles/${editingRole.id}`, values)
      void message.success("Đã cập nhật vai trò")
    } else {
      await api.post("/settings/dynamic-roles", values)
      void message.success("Đã tạo vai trò")
    }
    setRoleModal(false)
    setEditingRole(null)
    roleForm.resetFields()
    await load()
  }

  async function deleteRole(id: string) {
    await api.delete(`/settings/dynamic-roles/${id}`)
    void message.success("Đã xóa vai trò")
    await load()
  }

  // ── Assignments CRUD ─────────────────────────────────────

  function openCreateAssign() {
    setEditingAssign(null)
    assignForm.resetFields()
    assignForm.setFieldsValue({ userId: undefined as unknown as string, branchId: undefined as unknown as string, roleKeys: [], isActive: true })
    setAssignModal(true)
  }

  function openEditAssign(a: BranchRoleAssignment) {
    setEditingAssign(a)
    assignForm.setFieldsValue(a)
    setAssignModal(true)
  }

  async function saveAssign(values: AssignmentFormValues) {
    if (editingAssign) {
      await api.patch(`/settings/branch-role-assignments/${editingAssign.id}`, values)
      void message.success("Đã cập nhật phân quyền")
    } else {
      await api.post("/settings/branch-role-assignments", values)
      void message.success("Đã thêm phân quyền")
    }
    setAssignModal(false)
    setEditingAssign(null)
    assignForm.resetFields()
    await load()
  }

  async function deleteAssign(id: string) {
    await api.delete(`/settings/branch-role-assignments/${id}`)
    void message.success("Đã xóa phân quyền")
    await load()
  }

  // ── Derived data ─────────────────────────────────────────

  const userMap = useMemo(
    () => Object.fromEntries(userOptions.map((o) => [o.value, o.label])),
    [userOptions],
  )
  const branchMap = useMemo(
    () => Object.fromEntries(branchOptions.map((o) => [o.value, o.label])),
    [branchOptions],
  )
  const roleMap = useMemo(
    () => Object.fromEntries(roles.map((r) => [r.key, r])),
    [roles],
  )

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      if (filterBranch && a.branchId !== filterBranch) return false
      if (filterRole && !(a.roleKeys || []).includes(filterRole)) return false
      if (assignSearch) {
        const q = assignSearch.toLowerCase()
        const userName = (userMap[a.userId] || "").toLowerCase()
        const branchName = (branchMap[a.branchId] || "").toLowerCase()
        if (!userName.includes(q) && !branchName.includes(q)) return false
      }
      return true
    })
  }, [assignments, filterBranch, filterRole, assignSearch, userMap, branchMap])

  // ── Render ────────────────────────────────────────────────

  const rolesTab = (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Flex justify="flex-end">
        <Button icon={<PlusOutlined />} type="primary" className="primary-glow" onClick={openCreateRole}>
          Thêm vai trò
        </Button>
      </Flex>
      <Table
        loading={loading}
        size="small"
        pagination={false}
        rowKey="id"
        dataSource={roles}
        scroll={{ x: "max-content" }}
        columns={[
          {
            title: "Tên vai trò",
            dataIndex: "name",
            render: (name: string, row: DynamicRole) => (
              <Space>
                <Typography.Text strong>{name}</Typography.Text>
                <code style={{ fontSize: 11, opacity: 0.7 }}>{row.key}</code>
              </Space>
            ),
          },
          {
            title: "Loại",
            dataIndex: "roleMain",
            width: 140,
            render: (v: string) => (
              <Tag color={ROLE_MAIN_COLOR[v] || "default"}>
                {ROLE_MAIN_LABEL[v] || v}
              </Tag>
            ),
          },
          {
            title: "Trạng thái",
            dataIndex: "isActive",
            width: 100,
            render: (v: boolean) => (
              <Tag color={v ? "success" : "default"}>{v ? "Bật" : "Tắt"}</Tag>
            ),
          },
          {
            title: "",
            key: "actions",
            width: 80,
            render: (_: unknown, row: DynamicRole) => (
              <Space size={0}>
                <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditRole(row)} />
                <Popconfirm title={`Xóa vai trò "${row.name}"?`} okType="danger" okText="Xóa" cancelText="Hủy" onConfirm={() => void deleteRole(row.id)}>
                  <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
    </Space>
  )

  const assignTab = (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Flex gap={8} wrap="wrap" justify="space-between">
        <Space wrap>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Tìm theo tên user / chi nhánh..."
            value={assignSearch}
            onChange={(e) => setAssignSearch(e.target.value)}
            allowClear
            style={{ width: 240 }}
          />
          <Select
            allowClear
            placeholder="Lọc theo chi nhánh"
            options={branchOptions}
            value={filterBranch}
            onChange={(v) => setFilterBranch(v ?? null)}
            showSearch
            optionFilterProp="label"
            style={{ width: 200 }}
          />
          <Select
            allowClear
            placeholder="Lọc theo vai trò"
            options={roles.map((r) => ({ value: r.key, label: r.name }))}
            value={filterRole}
            onChange={(v) => setFilterRole(v ?? null)}
            style={{ width: 180 }}
          />
        </Space>
        <Button icon={<PlusOutlined />} type="primary" className="primary-glow" onClick={openCreateAssign}>
          Thêm phân quyền
        </Button>
      </Flex>
      <Table
        loading={loading}
        size="small"
        pagination={{ pageSize: 20, showSizeChanger: true }}
        rowKey="id"
        dataSource={filteredAssignments}
        scroll={{ x: "max-content" }}
        columns={[
          {
            title: "Người dùng",
            dataIndex: "userId",
            render: (v: string) => (
              <Space>
                <UserOutlined style={{ opacity: 0.5 }} />
                <Typography.Text>{userMap[v] || v}</Typography.Text>
              </Space>
            ),
          },
          {
            title: "Chi nhánh",
            dataIndex: "branchId",
            render: (v: string) => branchMap[v] || v,
          },
          {
            title: "Vai trò",
            dataIndex: "roleKeys",
            render: (keys: string[]) => (
              <Space size={4} wrap>
                {(keys || []).map((key) => {
                  const role = roleMap[key]
                  return (
                    <Tag key={key} color={role ? ROLE_MAIN_COLOR[role.roleMain] : "default"}>
                      {role?.name || key}
                    </Tag>
                  )
                })}
              </Space>
            ),
          },
          {
            title: "Trạng thái",
            dataIndex: "isActive",
            width: 100,
            render: (v: boolean) => (
              <Tag color={v ? "success" : "default"}>{v ? "Bật" : "Tắt"}</Tag>
            ),
          },
          {
            title: "",
            key: "actions",
            width: 80,
            render: (_: unknown, row: BranchRoleAssignment) => (
              <Space size={0}>
                <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditAssign(row)} />
                <Popconfirm title="Xóa phân quyền này?" okType="danger" okText="Xóa" cancelText="Hủy" onConfirm={() => void deleteAssign(row.id)}>
                  <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
    </Space>
  )

  return (
    <>
      <div className="page-header">
        <div>
          <Typography.Title level={3}>Vai trò & Phân quyền</Typography.Title>
        </div>
      </div>

      <Card className="glass-card">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "roles",
              label: `Vai trò (${roles.length})`,
              children: rolesTab,
            },
            {
              key: "assignments",
              label: `Phân quyền chi nhánh (${assignments.length})`,
              children: assignTab,
            },
          ]}
        />
      </Card>

      {/* Role Modal */}
      <Modal
        title={editingRole ? "Cập nhật vai trò" : "Thêm vai trò"}
        open={roleModal}
        footer={null}
        maskClosable={false}
        onCancel={() => { setRoleModal(false); setEditingRole(null) }}
      >
        <Form form={roleForm} layout="vertical" onFinish={saveRole}>
          <Form.Item name="name" label="Tên vai trò" rules={[{ required: true, message: "Nhập tên vai trò" }]}>
            <Input placeholder="VD: Lễ tân, Bác sĩ điều trị..." />
          </Form.Item>
          <Form.Item name="key" label="Key (mã định danh)" rules={[{ required: true, message: "Nhập key" }]}>
            <Input placeholder="VD: RECEPTIONIST" disabled={Boolean(editingRole)} />
          </Form.Item>
          <Form.Item name="roleMain" label="Loại vai trò" rules={[{ required: true }]}>
            <Select options={systemRoleSelectOptions} />
          </Form.Item>
          <Form.Item name="isActive" valuePropName="checked" initialValue>
            <Checkbox>Cho phép sử dụng</Checkbox>
          </Form.Item>
          <Button className="primary-glow" htmlType="submit" type="primary">
            {editingRole ? "Cập nhật" : "Lưu vai trò"}
          </Button>
        </Form>
      </Modal>

      {/* Assignment Modal */}
      <Modal
        title={editingAssign ? "Cập nhật phân quyền" : "Thêm phân quyền chi nhánh"}
        open={assignModal}
        footer={null}
        maskClosable={false}
        onCancel={() => { setAssignModal(false); setEditingAssign(null) }}
      >
        <Form form={assignForm} layout="vertical" onFinish={saveAssign}>
          <Form.Item name="userId" label="Người dùng" rules={[{ required: true, message: "Chọn người dùng" }]}>
            <Select
              options={userOptions}
              showSearch
              optionFilterProp="label"
              placeholder="Tìm theo tên hoặc email..."
            />
          </Form.Item>
          <Form.Item name="branchId" label="Chi nhánh" rules={[{ required: true, message: "Chọn chi nhánh" }]}>
            <Select options={branchOptions} showSearch optionFilterProp="label" placeholder="Chọn chi nhánh..." />
          </Form.Item>
          <Form.Item name="roleKeys" label="Vai trò" rules={[{ required: true, message: "Chọn ít nhất 1 vai trò" }]}>
            <Select
              mode="multiple"
              placeholder="Chọn vai trò..."
              options={roles
                .filter((r) => r.isActive)
                .map((r) => ({
                  value: r.key,
                  label: `${r.name} (${ROLE_MAIN_LABEL[r.roleMain] || r.roleMain})`,
                }))}
            />
          </Form.Item>
          <Form.Item name="isActive" valuePropName="checked" initialValue>
            <Checkbox>Đang hoạt động</Checkbox>
          </Form.Item>
          <Button className="primary-glow" htmlType="submit" type="primary">
            {editingAssign ? "Cập nhật" : "Lưu phân quyền"}
          </Button>
        </Form>
      </Modal>
    </>
  )
}
