import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  UserAddOutlined,
} from "@ant-design/icons"
import {
  Button,
  Card,
  Checkbox,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd"
import { useEffect, useMemo, useState } from "react"
import { api } from "../api"
import { BranchRoleAssignment, DynamicRole, systemRoleSelectOptions } from "../models"
import { getFirstOptionValue } from "../utils/branchDefaults"

interface RoleFormValues {
  key: string
  name: string
  roleMain: string
  isActive: boolean
}

interface AssignmentFormValues {
  userIds: string[]
  branchId: string
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
  const [userOptions, setUserOptions] = useState<Array<{ value: string; label: string; email?: string; role?: string }>>([])
  const [branchOptions, setBranchOptions] = useState<Array<{ value: string; label: string }>>([])
  const [loading, setLoading] = useState(false)
  const [selectedRoleKey, setSelectedRoleKey] = useState<string | null>(null)

  const [roleModal, setRoleModal] = useState(false)
  const [editingRole, setEditingRole] = useState<DynamicRole | null>(null)
  const [roleForm] = Form.useForm<RoleFormValues>()

  const [assignModal, setAssignModal] = useState(false)
  const [editingAssign, setEditingAssign] = useState<BranchRoleAssignment | null>(null)
  const [assignForm] = Form.useForm<AssignmentFormValues>()

  useEffect(() => { void load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [rolesRes, assignRes, usersRes, branchesRes] = await Promise.all([
        api.get("/settings/dynamic-roles"),
        api.get("/settings/branch-role-assignments"),
        api.get("/records/user-accounts", { params: { pageSize: 200 } }),
        api.get("/records/branches", { params: { pageSize: 200 } }),
      ])
      const nextRoles: DynamicRole[] = rolesRes.data.data
      setRoles(nextRoles)
      setAssignments(assignRes.data.data)
      setUserOptions(
        usersRes.data.data.map((r: Record<string, unknown>) => ({
          value: String(r.id),
          label: String(r.email || r.fullName || ""),
          email: String(r.email || ""),
          role: String(r.role || ""),
        })),
      )
      setBranchOptions(
        branchesRes.data.data.map((r: Record<string, unknown>) => ({
          value: String(r.id),
          label: String(r.name || r.slug),
        })),
      )
      setSelectedRoleKey((prev) =>
        prev && nextRoles.some((r) => r.key === prev) ? prev : (nextRoles[0]?.key ?? null),
      )
    } finally {
      setLoading(false)
    }
  }

  // ── Roles ────────────────────────────────────────────────

  function openCreateRole() {
    setEditingRole(null)
    roleForm.resetFields()
    roleForm.setFieldsValue({ key: "", name: "", roleMain: "STAFF", isActive: true })
    setRoleModal(true)
  }

  function openEditRole(role: DynamicRole, e: React.MouseEvent) {
    e.stopPropagation()
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

  async function deleteRole(role: DynamicRole, e?: React.MouseEvent) {
    e?.stopPropagation()
    await api.delete(`/settings/dynamic-roles/${role.id}`)
    void message.success("Đã xóa vai trò")
    await load()
  }

  // ── Assignments ──────────────────────────────────────────

  function openCreateAssign() {
    setEditingAssign(null)
    assignForm.resetFields()
    assignForm.setFieldsValue({ userIds: [], branchId: getFirstOptionValue(branchOptions), isActive: true })
    setAssignModal(true)
  }

  function openEditAssign(a: BranchRoleAssignment, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingAssign(a)
    assignForm.setFieldsValue({ userIds: [a.userId], branchId: a.branchId, isActive: a.isActive })
    setAssignModal(true)
  }

  async function saveAssign(values: AssignmentFormValues) {
    if (!selectedRoleKey) return

    if (editingAssign) {
      // Edit mode: single record, keep original roleKeys + ensure selectedRoleKey included
      const roleKeys = Array.from(new Set([...editingAssign.roleKeys, selectedRoleKey]))
      await api.patch(`/settings/branch-role-assignments/${editingAssign.id}`, {
        userId: values.userIds[0],
        branchId: values.branchId,
        roleKeys,
        isActive: values.isActive,
      })
      void message.success("Đã cập nhật")
    } else {
      // Create mode: upsert for each selected user
      await Promise.all(
        values.userIds.map(async (userId) => {
          const existing = assignments.find(
            (a) => a.userId === userId && a.branchId === values.branchId,
          )
          if (existing) {
            const newKeys = Array.from(new Set([...existing.roleKeys, selectedRoleKey]))
            await api.patch(`/settings/branch-role-assignments/${existing.id}`, { roleKeys: newKeys, isActive: values.isActive })
          } else {
            await api.post("/settings/branch-role-assignments", {
              userId,
              branchId: values.branchId,
              roleKeys: [selectedRoleKey],
              isActive: values.isActive,
            })
          }
        }),
      )
      void message.success(`Đã thêm ${values.userIds.length} người vào vai trò`)
    }
    setAssignModal(false)
    setEditingAssign(null)
    assignForm.resetFields()
    await load()
  }

  async function removeRoleFromAssign(assign: BranchRoleAssignment, e: React.MouseEvent) {
    e.stopPropagation()
    if (!selectedRoleKey) return
    const newKeys = assign.roleKeys.filter((k) => k !== selectedRoleKey)
    if (newKeys.length === 0) {
      await api.delete(`/settings/branch-role-assignments/${assign.id}`)
    } else {
      await api.patch(`/settings/branch-role-assignments/${assign.id}`, { roleKeys: newKeys })
    }
    void message.success("Đã xóa")
    await load()
  }

  // ── Derived ──────────────────────────────────────────────

  const userMap = useMemo(
    () => Object.fromEntries(userOptions.map((o) => [o.value, o])),
    [userOptions],
  )
  const branchMap = useMemo(
    () => Object.fromEntries(branchOptions.map((o) => [o.value, o.label])),
    [branchOptions],
  )

  const selectedRole = roles.find((r) => r.key === selectedRoleKey) ?? null

  // Only users whose account.role matches the selected role's roleMain (ADMIN users can have any role)
  const compatibleUserOptions = useMemo(() => {
    if (!selectedRole) return userOptions
    return userOptions.filter((u) => u.role === "ADMIN" || u.role === selectedRole.roleMain)
  }, [userOptions, selectedRole])

  // Assignments that include this role, grouped by branch
  const roleAssignments = useMemo(
    () => assignments.filter((a) => (a.roleKeys || []).includes(selectedRoleKey ?? "")),
    [assignments, selectedRoleKey],
  )

  const byBranch = useMemo(() => {
    const map = new Map<string, BranchRoleAssignment[]>()
    roleAssignments.forEach((a) => {
      const list = map.get(a.branchId) ?? []
      list.push(a)
      map.set(a.branchId, list)
    })
    return map
  }, [roleAssignments])

  return (
    <>
      <div className="page-header">
        <Typography.Title level={3} style={{ margin: 0 }}>Vai trò & Phân quyền</Typography.Title>
      </div>

      <div style={{ display: "flex", gap: 16, height: "calc(100vh - 120px)", minHeight: 0 }}>

        {/* ── Left: role list ───────────────────────── */}
        <Card
          className="glass-card"
          style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column" }}
          bodyStyle={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0, height: "100%" }}
        >
          <Flex justify="space-between" align="center">
            <Typography.Text strong>Vai trò</Typography.Text>
            <Button size="small" icon={<PlusOutlined />} onClick={openCreateRole}>Thêm</Button>
          </Flex>

          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {roles.map((role) => {
              const count = assignments.filter((a) => (a.roleKeys || []).includes(role.key)).length
              const active = role.key === selectedRoleKey
              return (
                <div
                  key={role.key}
                  onClick={() => setSelectedRoleKey(role.key)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "calc(var(--app-radius) - 4px)",
                    cursor: "pointer",
                    border: `1px solid ${active ? "var(--app-primary)" : "var(--app-line)"}`,
                    background: active
                      ? "color-mix(in srgb, var(--app-primary) 12%, var(--app-surface))"
                      : "color-mix(in srgb, var(--app-surface) 96%, var(--app-primary))",
                    transition: "all .15s",
                  }}
                >
                  <Flex justify="space-between" align="flex-start">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Flex align="center" gap={6} style={{ marginBottom: 4 }}>
                        <Tag
                          color={ROLE_MAIN_COLOR[role.roleMain] || "default"}
                          style={{ margin: 0, fontSize: 10, padding: "0 5px" }}
                        >
                          {ROLE_MAIN_LABEL[role.roleMain] || role.roleMain}
                        </Tag>
                        {!role.isActive && <Tag style={{ margin: 0, fontSize: 10 }}>Tắt</Tag>}
                      </Flex>
                      <Typography.Text strong style={{ fontSize: 13, display: "block" }}>
                        {role.name}
                      </Typography.Text>
                      <Flex align="center" gap={6} style={{ marginTop: 2 }}>
                        <code style={{ fontSize: 10, opacity: 0.5 }}>{role.key}</code>
                        {count > 0 && (
                          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                            · {count} phân quyền
                          </Typography.Text>
                        )}
                      </Flex>
                    </div>
                    <Space size={0} onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0 }}>
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined style={{ fontSize: 12 }} />}
                        onClick={(e) => openEditRole(role, e)}
                      />
                      <Popconfirm
                        title={`Xóa "${role.name}"?`}
                        okType="danger"
                        okText="Xóa"
                        cancelText="Hủy"
                        onConfirm={() => void deleteRole(role)}
                        onPopupClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined style={{ fontSize: 12 }} />}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Popconfirm>
                    </Space>
                  </Flex>
                </div>
              )
            })}
          </div>
        </Card>

        {/* ── Right: assignments for selected role ─── */}
        <Card
          className="glass-card"
          style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}
          bodyStyle={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0, height: "100%" }}
        >
          {!selectedRole ? (
            <div style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid var(--app-line)",
              borderRadius: "var(--app-radius)",
            }}>
              <Empty description="Chọn một vai trò bên trái" />
            </div>
          ) : (
            <>
              {/* Role info header */}
              <div style={{
                padding: "14px 18px",
                borderRadius: "var(--app-radius)",
                border: "1px solid var(--app-line)",
                background: "color-mix(in srgb, var(--app-surface) 96%, var(--app-primary))",
              }}>
                <Flex align="center" justify="space-between">
                  <Flex align="center" gap={10}>
                    <Tag color={ROLE_MAIN_COLOR[selectedRole.roleMain] || "default"} style={{ fontSize: 12 }}>
                      {ROLE_MAIN_LABEL[selectedRole.roleMain] || selectedRole.roleMain}
                    </Tag>
                    <Typography.Title level={4} style={{ margin: 0 }}>{selectedRole.name}</Typography.Title>
                    <code style={{ fontSize: 12, opacity: 0.5 }}>{selectedRole.key}</code>
                    <Tag color={selectedRole.isActive ? "success" : "default"}>
                      {selectedRole.isActive ? "Bật" : "Tắt"}
                    </Tag>
                  </Flex>
                  <Button
                    type="primary"
                    className="primary-glow"
                    icon={<UserAddOutlined />}
                    onClick={openCreateAssign}
                    loading={loading}
                  >
                    Thêm phân quyền
                  </Button>
                </Flex>
              </div>

              {/* Assignments grouped by branch */}
              <div style={{ flex: 1, overflowY: "auto" }}>
                {byBranch.size === 0 ? (
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: 200,
                    border: "1px dashed var(--app-line)",
                    borderRadius: "var(--app-radius)",
                    gap: 12,
                  }}>
                    <Empty description={`Chưa có ai được gán vai trò "${selectedRole.name}"`} />
                    <Button icon={<UserAddOutlined />} onClick={openCreateAssign}>Thêm phân quyền</Button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {Array.from(byBranch.entries()).map(([branchId, assignList]) => (
                      <div
                        key={branchId}
                        style={{
                          border: "1px solid var(--app-line)",
                          borderRadius: "var(--app-radius)",
                          overflow: "hidden",
                          background: "var(--app-surface)",
                          boxShadow: "var(--app-shadow-soft)",
                        }}
                      >
                        {/* Branch header */}
                        <div style={{
                          padding: "8px 14px",
                          background: "color-mix(in srgb, var(--app-surface) 92%, var(--app-primary))",
                          borderBottom: "1px solid var(--app-line)",
                        }}>
                          <Flex align="center" gap={8}>
                            <Typography.Text strong style={{ fontSize: 13 }}>
                              {branchMap[branchId] || branchId}
                            </Typography.Text>
                            <Tag style={{ fontSize: 11 }}>{assignList.length} người</Tag>
                          </Flex>
                        </div>

                        {/* Users in this branch */}
                        {assignList.map((assign) => {
                          const user = userMap[assign.userId]
                          const otherRoles = (assign.roleKeys || []).filter((k) => k !== selectedRoleKey)
                          return (
                            <div
                              key={assign.id}
                              style={{
                                padding: "10px 14px",
                                borderBottom: "1px solid color-mix(in srgb, var(--app-line) 70%, transparent)",
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                              }}
                            >
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: "50%",
                                  background: "color-mix(in srgb, var(--app-primary) 20%, var(--app-surface))",
                                  border: "1px solid color-mix(in srgb, var(--app-primary) 30%, var(--app-surface))",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 13,
                                  fontWeight: 700,
                                  flexShrink: 0,
                                }}
                              >
                                {(user?.label?.[0] || "?").toUpperCase()}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <Typography.Text strong style={{ display: "block", fontSize: 13 }}>
                                  {user?.label || assign.userId}
                                </Typography.Text>
                                {otherRoles.length > 0 && (
                                  <Flex gap={4} style={{ marginTop: 3 }}>
                                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                                      Cũng có:
                                    </Typography.Text>
                                    {otherRoles.map((k) => {
                                      const r = roles.find((ro) => ro.key === k)
                                      return (
                                        <Tag key={k} style={{ fontSize: 10, padding: "0 4px", margin: 0 }}
                                          color={r ? ROLE_MAIN_COLOR[r.roleMain] : "default"}>
                                          {r?.name || k}
                                        </Tag>
                                      )
                                    })}
                                  </Flex>
                                )}
                              </div>
                              <Tag color={assign.isActive ? "success" : "default"} style={{ flexShrink: 0 }}>
                                {assign.isActive ? "Bật" : "Tắt"}
                              </Tag>
                              <Space size={0}>
                                <Button
                                  type="text"
                                  size="small"
                                  icon={<EditOutlined style={{ fontSize: 12 }} />}
                                  onClick={(e) => openEditAssign(assign, e)}
                                />
                                <Popconfirm
                                  title="Xóa phân quyền này?"
                                  okType="danger"
                                  okText="Xóa"
                                  cancelText="Hủy"
                                  onConfirm={() => void removeRoleFromAssign(assign, { stopPropagation: () => {} } as React.MouseEvent)}
                                >
                                  <Button
                                    type="text"
                                    size="small"
                                    danger
                                    icon={<DeleteOutlined style={{ fontSize: 12 }} />}
                                  />
                                </Popconfirm>
                              </Space>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Role Modal */}
      <Modal
        title={editingRole ? "Cập nhật vai trò" : "Thêm vai trò"}
        open={roleModal}
        footer={null}
        maskClosable={false}
        onCancel={() => { setRoleModal(false); setEditingRole(null) }}
      >
        <Form form={roleForm} layout="vertical" onFinish={saveRole}>
          <Form.Item name="name" label="Tên vai trò" rules={[{ required: true, message: "Nhập tên" }]}>
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
        title={
          editingAssign
            ? "Cập nhật phân quyền"
            : `Thêm người vào vai trò "${selectedRole?.name}"`
        }
        open={assignModal}
        footer={null}
        maskClosable={false}
        onCancel={() => { setAssignModal(false); setEditingAssign(null) }}
      >
        <Form form={assignForm} layout="vertical" onFinish={saveAssign}>
          <Form.Item name="userIds" label="Người dùng" rules={[{ required: true, type: "array", min: 1, message: "Chọn ít nhất 1 người" }]}>
            <Select
              mode="multiple"
              options={compatibleUserOptions}
              showSearch
              optionFilterProp="label"
              placeholder="Tìm và chọn nhiều tài khoản..."
              maxTagCount="responsive"
              disabled={Boolean(editingAssign)}
            />
          </Form.Item>
          <Form.Item name="branchId" label="Chi nhánh" rules={[{ required: true, message: "Chọn chi nhánh" }]}>
            <Select options={branchOptions} showSearch optionFilterProp="label" placeholder="Chọn chi nhánh..." />
          </Form.Item>
          <Form.Item name="isActive" valuePropName="checked" initialValue>
            <Checkbox>Đang hoạt động</Checkbox>
          </Form.Item>
          <Button className="primary-glow" htmlType="submit" type="primary">
            {editingAssign ? "Cập nhật" : "Thêm"}
          </Button>
        </Form>
      </Modal>
    </>
  )
}
