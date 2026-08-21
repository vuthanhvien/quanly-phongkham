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
  Table,
  Tag,
  Tabs,
  Typography,
  message,
} from "antd"
import { useEffect, useMemo, useRef, useState } from "react"
import { api } from "../api"
import { appModuleGroups, appModuleLabels, resolveEnabledModules } from "../company-types"
import { useAppUi } from "../app-ui"
import { ModalTitleBar } from "../components/ModalTitleBar"
import { BranchRoleAssignment, DynamicRole, getResourceActionOptions, systemRoleSelectOptions } from "../models"
import type { ViewSettingRecord } from "../view-settings"
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

const ROLE_PERMISSION_ACTIONS = [
  { key: "update", label: "Sửa" },
  { key: "clone", label: "Clone" },
  { key: "duplicate", label: "Duplicate" },
  { key: "print", label: "In" },
]

const DATA_SCOPE_PERMISSIONS = [
  { key: "viewAll", label: "Xem tất cả", action: "view" },
  { key: "createAll", label: "Tạo tất cả", action: "create" },
  { key: "deleteAll", label: "Xoá tất cả", action: "delete" },
  // Keep the three personal scopes together at the end of the matrix.
  { key: "viewPersonal", label: "Xem cá nhân", action: "view" },
  { key: "createPersonal", label: "Tạo cá nhân", action: "create" },
  { key: "deletePersonal", label: "Xoá cá nhân", action: "delete" },
] as const

type DataScopePermission = Record<(typeof DATA_SCOPE_PERMISSIONS)[number]["key"], boolean>

const DEFAULT_DATA_SCOPE_PERMISSION: DataScopePermission = {
  viewAll: true,
  viewPersonal: false,
  createAll: true,
  createPersonal: false,
  deleteAll: true,
  deletePersonal: false,
}

export function RolesPage() {
  const { settings } = useAppUi()
  const [roles, setRoles] = useState<DynamicRole[]>([])
  const [views, setViews] = useState<ViewSettingRecord[]>([])
  const [assignments, setAssignments] = useState<BranchRoleAssignment[]>([])
  const [userOptions, setUserOptions] = useState<Array<{ value: string; label: string; email?: string; role?: string }>>([])
  const [branchOptions, setBranchOptions] = useState<Array<{ value: string; label: string }>>([])
  const [loading, setLoading] = useState(false)
  const [selectedRoleKey, setSelectedRoleKey] = useState<string | null>(null)
  const [selectedModules, setSelectedModules] = useState<string[]>([])
  const [dataScopeDraft, setDataScopeDraft] = useState<Record<string, DataScopePermission>>({})
  const [savingDataScope, setSavingDataScope] = useState(false)
  const [roleContentTab, setRoleContentTab] = useState<"permissions" | "users">("permissions")
  const moduleSaveQueue = useRef(Promise.resolve())
  const actionSaveQueue = useRef(Promise.resolve())

  const [roleModal, setRoleModal] = useState(false)
  const [editingRole, setEditingRole] = useState<DynamicRole | null>(null)
  const [fullscreenPopup, setFullscreenPopup] = useState<string | null>(null)
  const [roleForm] = Form.useForm<RoleFormValues>()

  const [assignModal, setAssignModal] = useState(false)
  const [editingAssign, setEditingAssign] = useState<BranchRoleAssignment | null>(null)
  const [assignForm] = Form.useForm<AssignmentFormValues>()

  useEffect(() => { void load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [rolesRes, assignRes, usersRes, branchesRes, viewsRes] = await Promise.all([
        api.get("/settings/dynamic-roles"),
        api.get("/settings/branch-role-assignments"),
        api.get("/records/user-accounts", { params: { pageSize: 200 } }),
        api.get("/records/branches", { params: { pageSize: 200 } }),
        api.get("/settings/views"),
      ])
      const nextRoles: DynamicRole[] = rolesRes.data.data
      setRoles(nextRoles)
      setAssignments(assignRes.data.data)
      setViews(viewsRes.data.data)
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
    setFullscreenPopup((current) => current === "role" ? null : current)
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
    setFullscreenPopup((current) => current === "assign" ? null : current)
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
  const globallyEnabledModules = useMemo(
    () => resolveEnabledModules(settings.enabledModules, settings.companyType, settings.hasCustomModuleSelection),
    [settings.companyType, settings.enabledModules, settings.hasCustomModuleSelection],
  )

  useEffect(() => {
    const roleModules = Array.isArray(selectedRole?.allowedModules) ? selectedRole.allowedModules : globallyEnabledModules
    setSelectedModules(roleModules.filter((module) => globallyEnabledModules.includes(module)))
  }, [globallyEnabledModules, selectedRole])

  useEffect(() => {
    setDataScopeDraft({})
  }, [selectedRoleKey])

  function updateRoleModules(nextModules: string[]) {
    if (!selectedRole) return
    const roleId = selectedRole.id
    setSelectedModules(nextModules)
    moduleSaveQueue.current = moduleSaveQueue.current
      .catch(() => undefined)
      .then(async () => {
        await api.patch(`/settings/dynamic-roles/${roleId}`, { allowedModules: nextModules })
        setRoles((current) => current.map((role) => role.id === roleId ? { ...role, allowedModules: nextModules } : role))
      })
      .catch(() => {
        message.error("Không thể lưu quyền module")
      })
  }

  function getAllowedActions(module: string) {
    const setting = views.find((view) => view.entityType === module && view.viewType === "ACTION" && view.role === selectedRoleKey)
    const actions = setting?.config?.allowedActions
    return Array.isArray(actions) ? actions.map(String) : getResourceActionOptions(module).map((action) => action.key)
  }

  function getDataScopePermission(module: string): DataScopePermission {
    if (dataScopeDraft[module]) return dataScopeDraft[module]
    const setting = views.find((view) => view.entityType === module && view.viewType === "ACTION" && view.role === selectedRoleKey)
    const dataScope = setting?.config?.dataScope
    if (!dataScope || typeof dataScope !== "object") return DEFAULT_DATA_SCOPE_PERMISSION
    return {
      ...DEFAULT_DATA_SCOPE_PERMISSION,
      ...Object.fromEntries(Object.entries(dataScope as Record<string, unknown>).map(([key, value]) => [key, Boolean(value)])),
    }
  }

  function updateModuleActions(module: string, nextActions: string[]) {
    if (!selectedRoleKey) return
    const role = selectedRoleKey
    setViews((current) => {
      const remaining = current.filter((view) => !(view.entityType === module && view.viewType === "ACTION" && view.role === role))
      const existing = current.find((view) => view.entityType === module && view.viewType === "ACTION" && view.role === role)
      return [...remaining, { entityType: module, viewType: "ACTION", role, config: { ...existing?.config, allowedActions: nextActions } }]
    })
    actionSaveQueue.current = actionSaveQueue.current
      .catch(() => undefined)
      .then(async () => {
        const existing = views.find((view) => view.entityType === module && view.viewType === "ACTION" && view.role === role)
        await api.put(`/settings/views/${module}/ACTION`, { role, config: { ...existing?.config, allowedActions: nextActions } })
      })
      .catch(() => {
        message.error("Không thể lưu quyền thao tác")
        void load()
      })
  }

  function updateGroupAction(modules: string[], action: string, allowed: boolean) {
    const nextByModule = modules.map((module) => ({
      module,
      actions: action === "view" && !allowed
        ? []
        : action === "create" && !allowed
          ? getAllowedActions(module).filter((key) => key !== "create" && key !== "duplicate")
        : allowed
        ? Array.from(new Set([...getAllowedActions(module), action]))
        : getAllowedActions(module).filter((key) => key !== action),
    }))
    if (!selectedRoleKey) return
    const role = selectedRoleKey
    setViews((current) => [
      ...current.filter((view) => !nextByModule.some(({ module }) => view.entityType === module && view.viewType === "ACTION" && view.role === role)),
      ...nextByModule.map(({ module, actions }) => {
        const existing = views.find((view) => view.entityType === module && view.viewType === "ACTION" && view.role === role)
        return { entityType: module, viewType: "ACTION", role, config: { ...existing?.config, allowedActions: actions } }
      }),
    ])
    actionSaveQueue.current = actionSaveQueue.current
      .catch(() => undefined)
      .then(async () => {
        await Promise.all(nextByModule.map(({ module, actions }) => {
          const existing = views.find((view) => view.entityType === module && view.viewType === "ACTION" && view.role === role)
          return api.put(`/settings/views/${module}/ACTION`, { role, config: { ...existing?.config, allowedActions: actions } })
        }))
      })
      .catch(() => {
        message.error("Không thể lưu quyền thao tác")
        void load()
      })
  }

  function updateDataScope(modules: string[], key: keyof DataScopePermission, checked: boolean) {
    setDataScopeDraft((current) => ({ ...current, ...Object.fromEntries(modules.map((module) => {
      const next = { ...(current[module] || getDataScopePermission(module)), [key]: checked }
      // These choices describe mutually exclusive scopes. Without this, a
      // checked “cá nhân” alongside “tất cả” would still grant all-record access.
      if (checked && key === "viewAll") next.viewPersonal = false
      if (checked && key === "viewPersonal") next.viewAll = false
      if (checked && key === "createAll") next.createPersonal = false
      if (checked && key === "createPersonal") next.createAll = false
      if (checked && key === "deleteAll") next.deletePersonal = false
      if (checked && key === "deletePersonal") next.deleteAll = false
      return [module, next]
    })) }))
  }

  function getScopeAllowedActions(module: string, dataScope: DataScopePermission) {
    const scopeActions = [
      ...(dataScope.viewAll || dataScope.viewPersonal ? ["view"] : []),
      ...(dataScope.createAll || dataScope.createPersonal ? ["create"] : []),
      ...(dataScope.deleteAll || dataScope.deletePersonal ? ["delete"] : []),
    ]
    const retained = getAllowedActions(module).filter((action) => !["view", "create", "delete"].includes(action))
    if (!scopeActions.includes("create")) return [...retained.filter((action) => action !== "duplicate"), ...scopeActions]
    return Array.from(new Set([...retained, ...scopeActions]))
  }

  async function saveDataScope() {
    if (!selectedRoleKey || Object.keys(dataScopeDraft).length === 0) return
    const role = selectedRoleKey
    setSavingDataScope(true)
    try {
      await api.put("/settings/views/bulk", { views: Object.entries(dataScopeDraft).map(([module, dataScope]) => {
        const existing = views.find((view) => view.entityType === module && view.viewType === "ACTION" && view.role === role)
        return { entityType: module, viewType: "ACTION", role, config: { ...existing?.config, dataScope, allowedActions: getScopeAllowedActions(module, dataScope) } }
      }) })
      setViews((current) => {
        const next = current.map((view) => {
          const dataScope = dataScopeDraft[view.entityType]
          return view.viewType === "ACTION" && view.role === role && dataScope
            ? { ...view, config: { ...view.config, dataScope, allowedActions: getScopeAllowedActions(view.entityType, dataScope) } }
            : view
        })
        Object.entries(dataScopeDraft).forEach(([module, dataScope]) => {
          if (!next.some((view) => view.entityType === module && view.viewType === "ACTION" && view.role === role)) {
            next.push({ entityType: module, viewType: "ACTION", role, config: { dataScope, allowedActions: getScopeAllowedActions(module, dataScope) } })
          }
        })
        return next
      })
      setDataScopeDraft({})
      message.success("Đã lưu phạm vi dữ liệu")
    } catch {
      message.error("Không thể lưu phạm vi dữ liệu")
    } finally {
      setSavingDataScope(false)
    }
  }

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

  const permissionGroups = useMemo(
    () => appModuleGroups.map((group) => ({
      ...group,
      modules: group.modules.filter((module) => Boolean(appModuleLabels[module]) && globallyEnabledModules.includes(module)),
    })).filter((group) => group.modules.length > 0),
    [globallyEnabledModules],
  )
  const permissionRows = useMemo(
    () => [
      { key: "all-permissions", kind: "all" as const, label: "Chọn tất cả", modules: permissionGroups.flatMap((group) => group.modules) },
      ...permissionGroups.flatMap((group) => [
      { key: `group-${group.key}`, kind: "group" as const, label: group.label, modules: group.modules },
      ...group.modules.map((module) => ({ key: module, kind: "module" as const, label: appModuleLabels[module] || module, module, modules: [module] })),
      ]),
    ],
    [permissionGroups],
  )
  return (
    <>
      <div className="page-header">
        <Typography.Title level={3} style={{ margin: 0 }}>Vai trò & Phân quyền</Typography.Title>
      </div>

      <div className="roles-workspace">

        {/* ── Left: role list ───────────────────────── */}
        <Card
          className="glass-card roles-list-panel"
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
                        title={`Lưu trữ "${role.name}"?`}
                        okType="danger"
                        okText="Lưu trữ"
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
        <div className="roles-content-panel">
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
              <div className="roles-tabs-toolbar">
                <Tabs
                  activeKey={roleContentTab}
                  className="record-status-tabs"
                  items={[
                    { key: "permissions", label: "Phân quyền" },
                    { key: "users", label: `Danh sách user${roleAssignments.length ? ` (${roleAssignments.length})` : ""}` },
                  ]}
                  onChange={(key) => setRoleContentTab(key as "permissions" | "users")}
                />
                {roleContentTab === "permissions" ? (
                  <Button
                    type="primary"
                    className="primary-glow"
                    disabled={Object.keys(dataScopeDraft).length === 0}
                    loading={savingDataScope}
                    onClick={() => void saveDataScope()}
                  >
                    Lưu phạm vi dữ liệu
                  </Button>
                ) : (
                  <Button type="primary" className="primary-glow" icon={<UserAddOutlined />} loading={loading} onClick={openCreateAssign}>
                    Thêm phân quyền
                  </Button>
                )}
              </div>
              {roleContentTab === "permissions" ? <div className="roles-tab-content roles-tab-content--permissions">
                <div className="role-permission-table">
                  <Table
                    size="small"
                    pagination={false}
                    rowKey="key"
                    rowClassName={(row) => row.kind === "all" ? "role-permission-all-row" : row.kind === "group" ? "role-permission-parent-row" : "role-permission-child-row"}
                    scroll={{ x: 1340, y: "calc(100vh - 205px)" }}
                    dataSource={permissionRows}
                    columns={[
                      {
                        title: "Module",
                        dataIndex: "label",
                        fixed: "left",
                        width: 280,
                        render: (label, row) => row.kind === "all" || row.kind === "group"
                          ? <Typography.Text strong>{label}</Typography.Text>
                          : <span className="role-permission-child-title">{label}</span>,
                      },
                      {
                        title: "Bật module",
                        width: 112,
                        align: "center",
                        render: (_: unknown, row: { kind: "all" | "group" | "module"; module?: string; modules: string[] }) => {
                          const enabledCount = row.modules.filter((module) => selectedModules.includes(module)).length
                          const checked = enabledCount === row.modules.length
                          return <Checkbox checked={checked} indeterminate={enabledCount > 0 && !checked} onChange={(event) => {
                            if (row.kind === "all" || row.kind === "group") {
                              updateRoleModules(event.target.checked ? Array.from(new Set([...selectedModules, ...row.modules])) : selectedModules.filter((module) => !row.modules.includes(module)))
                            } else if (row.module) {
                              updateRoleModules(event.target.checked ? Array.from(new Set([...selectedModules, row.module])) : selectedModules.filter((module) => module !== row.module))
                            }
                          }} />
                        },
                      },
                      ...ROLE_PERMISSION_ACTIONS.map((action) => ({
                        title: action.label,
                        key: action.key,
                        width: 96,
                        align: "center" as const,
                        render: (_: unknown, row: { kind: "all" | "group" | "module"; module?: string; modules: string[] }) => {
                          const checkedCount = row.modules.filter((module) => getAllowedActions(module).includes(action.key)).length
                          const checked = checkedCount === row.modules.length
                          const modulesEnabled = row.modules.every((module) => selectedModules.includes(module))
                          const viewsAllowed = row.modules.every((module) => getAllowedActions(module).includes("view"))
                          const createsAllowed = row.modules.every((module) => getAllowedActions(module).includes("create"))
                          const disabled = !modulesEnabled
                            || (action.key !== "view" && !viewsAllowed)
                            || (action.key === "duplicate" && !createsAllowed)
                          return <Checkbox
                            checked={checked}
                            indeterminate={checkedCount > 0 && !checked}
                            disabled={disabled}
                            onChange={(event) => {
                              if (row.kind === "all" || row.kind === "group") updateGroupAction(row.modules, action.key, event.target.checked)
                              else if (row.module) updateModuleActions(row.module, event.target.checked
                                ? Array.from(new Set([...getAllowedActions(row.module), action.key]))
                                : action.key === "view"
                                  ? []
                                  : action.key === "create"
                                    ? getAllowedActions(row.module).filter((key) => key !== "create" && key !== "duplicate")
                                  : getAllowedActions(row.module).filter((key) => key !== action.key))
                            }}
                          />
                        },
                      })),
                      ...DATA_SCOPE_PERMISSIONS.map((scope) => ({
                        title: scope.label,
                        key: scope.key,
                        width: 112,
                        align: "center" as const,
                        render: (_: unknown, row: { kind: "all" | "group" | "module"; module?: string; modules: string[] }) => {
                          const checkedCount = row.modules.filter((module) => getDataScopePermission(module)[scope.key]).length
                          const checked = checkedCount === row.modules.length
                          const modulesEnabled = row.modules.every((module) => selectedModules.includes(module))
                          return <Checkbox
                            checked={checked}
                            indeterminate={checkedCount > 0 && !checked}
                            disabled={!modulesEnabled}
                            onChange={(event) => updateDataScope(row.modules, scope.key, event.target.checked)}
                          />
                        },
                      })),
                    ]}
                  />
                </div>
              </div> : null}

              {roleContentTab === "users" ? <div className="roles-tab-content roles-tab-content--users">
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
                                  title="Lưu trữ phân quyền này?"
                                  okType="danger"
                                  okText="Lưu trữ"
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
              </div> : null}
            </>
          )}
        </div>
      </div>

      {/* Role Modal */}
      <Modal
        className={`quick-drawer${fullscreenPopup === "role" ? " quick-drawer-fullscreen" : ""}`}
        title={
          <ModalTitleBar
            fullscreen={fullscreenPopup === "role"}
            title={editingRole ? "Cập nhật vai trò" : "Thêm vai trò"}
            onToggleFullscreen={() => setFullscreenPopup((current) => current === "role" ? null : "role")}
          />
        }
        open={roleModal}
        footer={null}
        maskClosable={false}
        width={fullscreenPopup === "role" ? "calc(100vw - 24px)" : 560}
        onCancel={() => {
          setRoleModal(false)
          setEditingRole(null)
          setFullscreenPopup((current) => current === "role" ? null : current)
        }}
      >
        <Form form={roleForm} layout="vertical" onFinish={saveRole}>
          <Form.Item name="name" label="Tên vai trò" rules={[{ required: true, message: "Nhập tên" }]}>
            <Input placeholder="VD: Lễ tân, Bác sĩ điều trị..." />
          </Form.Item>
          <Form.Item name="key" label="Key (mã định danh)" rules={[{ required: true, message: "Nhập key" }]}>
            <Input placeholder="VD: RECEPTIONIST" />
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
        className={`quick-drawer${fullscreenPopup === "assign" ? " quick-drawer-fullscreen" : ""}`}
        title={
          <ModalTitleBar
            fullscreen={fullscreenPopup === "assign"}
            title={editingAssign ? "Cập nhật phân quyền" : `Thêm người vào vai trò "${selectedRole?.name}"`}
            onToggleFullscreen={() => setFullscreenPopup((current) => current === "assign" ? null : "assign")}
          />
        }
        open={assignModal}
        footer={null}
        maskClosable={false}
        width={fullscreenPopup === "assign" ? "calc(100vw - 24px)" : 620}
        onCancel={() => {
          setAssignModal(false)
          setEditingAssign(null)
          setFullscreenPopup((current) => current === "assign" ? null : current)
        }}
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
