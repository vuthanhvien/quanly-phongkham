import {
  AppstoreOutlined,
  ApartmentOutlined,
  AuditOutlined,
  BankOutlined,
  CalendarOutlined,
  DeploymentUnitOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DollarOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  FileDoneOutlined,
  FolderOpenOutlined,
  FundOutlined,
  GiftOutlined,
  GoldOutlined,
  GlobalOutlined,
  InteractionOutlined,
  LineChartOutlined,
  LogoutOutlined,
  MessageOutlined,
  MedicineBoxOutlined,
  MobileOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PictureOutlined,
  PlayCircleOutlined,
  ProductOutlined,
  ReadOutlined,
  RobotOutlined,
  SettingOutlined,
  ShopOutlined,
  SolutionOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons"
import { useGetIdentity, useLogout } from "@refinedev/core"
import { Avatar, Button, Checkbox, Dropdown, Grid, Layout, Menu, Modal, Select, Typography } from "antd"
import type { MenuProps } from "antd"
import { useEffect, useMemo, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { hasResourceAccess, hasScreenAccess, isCurrentUserAdmin } from "../access"
import { api, getGlobalBranchFilterIds, onGlobalBranchFilterChange, setGlobalBranchFilterIds } from "../api"
import { useAppUi } from "../app-ui"
import {
  appModuleGroups,
  appModuleLabels,
  appStandaloneModules,
  isModuleEnabled,
  resolveMenuGroupLabel,
  type AppModuleGroup,
} from "../company-types"
import { entityLabels } from "../models"

const { Content, Sider } = Layout
const SIDER_COLLAPSE_KEY = "clinic-sider-collapsed"

export const menuIcons: Record<string, React.ReactNode> = {
  "custom-fields": <AppstoreOutlined />,
  branches: <BankOutlined />,
  roles: <SettingOutlined />,
  "branch-role-assignments": <DeploymentUnitOutlined />,
  "landing-pages": <GlobalOutlined />,
  "landing-forms": <FileDoneOutlined />,
  "landing-domains": <GlobalOutlined />,
  "landing-config": <SettingOutlined />,
  "customer-app": <MobileOutlined />,
  posts: <FileTextOutlined />,
  news: <ReadOutlined />,
  services: <ProductOutlined />,
  doctors: <TeamOutlined />,
  videos: <PlayCircleOutlined />,
  departments: <SolutionOutlined />,
  rooms: <BankOutlined />,
  equipments: <ExperimentOutlined />,
  staff: <TeamOutlined />,
  "branch-permissions": <AuditOutlined />,
  "user-accounts": <SettingOutlined />,
  customers: <TeamOutlined />,
  leads: <LineChartOutlined />,
  "lead-activities": <InteractionOutlined />,
  "zalo-inbox": <MessageOutlined />,
  "accounting-reports": <FundOutlined />,
  "medical-episodes": <MedicineBoxOutlined />,
  appointments: <CalendarOutlined />,
  calendar: <CalendarOutlined />,
  dashboard: <DashboardOutlined />,
  "work-schedules": <CalendarOutlined />,
  consultations: <MedicineBoxOutlined />,
  "service-orders": <FileDoneOutlined />,
  "customer-images": <PictureOutlined />,
  suppliers: <ShopOutlined />,
  products: <ProductOutlined />,
  "product-categories": <ApartmentOutlined />,
  units: <DeploymentUnitOutlined />,
  "stock-batches": <DatabaseOutlined />,
  treatments: <ExperimentOutlined />,
  invoices: <FileDoneOutlined />,
  expenses: <DollarOutlined />,
  commissions: <GiftOutlined />,
  'file-folders': <FolderOpenOutlined />,
  files: <FileDoneOutlined />,
  attendances: <CalendarOutlined />,
  'leave-requests': <FileDoneOutlined />,
  'leave-types': <CalendarOutlined />,
  'leave-allocations': <FileDoneOutlined />,
  projects: <ApartmentOutlined />,
  landing: <GlobalOutlined />,
  tasks: <FileDoneOutlined />,
  'attendance-adjustment-requests': <CalendarOutlined />,
  'business-trip-requests': <SolutionOutlined />,
  'payment-requests': <DollarOutlined />,
  'workflow-definitions': <DeploymentUnitOutlined />,
  'workflow-steps': <InteractionOutlined />,
  'workflow-instances': <AuditOutlined />,
  'workflow-tasks': <FileDoneOutlined />,
  'workflow-actions': <AuditOutlined />,
  payrolls: <DollarOutlined />,
  'work-contracts': <SolutionOutlined />,
  'staff-insurances': <AuditOutlined />,
  'staff-rewards': <GiftOutlined />,
  'staff-trainings': <ExperimentOutlined />,
  'performance-reviews': <LineChartOutlined />,
  'position-histories': <DeploymentUnitOutlined />,
}

const menuGroupIcons: Record<AppModuleGroup["key"], React.ReactNode> = {
  "front-office": <TeamOutlined />,
  clinical: <MedicineBoxOutlined />,
  inventory: <DatabaseOutlined />,
  documents: <FolderOpenOutlined />,
  hr: <TeamOutlined />,
  finance: <DollarOutlined />,
  workflow: <AuditOutlined />,
  projects: <ApartmentOutlined />,
  landing: <GlobalOutlined />,
  admin: <SettingOutlined />,
}

const moduleNavigation: Record<string, { path: string; label: string; screen?: string }> = {
  dashboard: { path: "/", label: "Feed" },
  calendar: { path: "/calendar", label: "Lịch tổng" },
  "landing-pages": { path: "/pages", label: "Trang đích", screen: "settings" },
  "landing-forms": { path: "/forms", label: "Biểu mẫu", screen: "settings" },
  "landing-domains": { path: "/configs", label: "Tên miền", screen: "settings" },
  "landing-config": { path: "/configs", label: "Cài đặt site", screen: "settings" },
  "customer-app": { path: "/customer-app", label: "App khách hàng", screen: "settings" },
  services: { path: "/services", label: "Dịch vụ" },
  doctors: { path: "/doctors", label: "Bác sĩ" },
  videos: { path: "/videos", label: "Video ngắn" },
  "zalo-inbox": { path: "/zalo-inbox", label: "Hộp thư Zalo", screen: "zalo-inbox" },
  "accounting-reports": { path: "/accounting-reports", label: "Báo cáo kế toán", screen: "accounting-reports" },
}

const resourceToGroup = Object.fromEntries(
  appModuleGroups.flatMap((group) =>
    group.modules.map((resource) => [resource, group.key]),
  ),
)

export function Shell({ children }: { children: React.ReactNode }) {
  const screens = Grid.useBreakpoint()
  const location = useLocation()
  const navigate = useNavigate()
  const { mutate: logout } = useLogout()
  const { data: identity } = useGetIdentity<{
    email?: string
    username?: string
    fullName?: string
    staffId?: string
  }>()
  const { settings } = useAppUi()
  const [staffDisplayName, setStaffDisplayName] = useState<string>()
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDER_COLLAPSE_KEY) === "1"
    } catch {
      return false
    }
  })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [branchOptions, setBranchOptions] = useState<Array<{ value: string; label: string }>>([])
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>(() => getGlobalBranchFilterIds())
  const [branchPickerOpen, setBranchPickerOpen] = useState(false)
  const [pendingBranchIds, setPendingBranchIds] = useState<string[]>([])

  useEffect(() => {
    let active = true

    async function loadStaffDisplayName() {
      if (!identity?.staffId) {
        setStaffDisplayName(undefined)
        return
      }

      try {
        const response = await api.get(`/records/staff/${identity.staffId}`)
        if (!active) return
        const row = response.data?.data as { fullName?: string; code?: string } | undefined
        setStaffDisplayName(row?.fullName || row?.code || undefined)
      } catch {
        if (!active) return
        setStaffDisplayName(undefined)
      }
    }

    void loadStaffDisplayName()

    return () => {
      active = false
    }
  }, [identity?.staffId])

  useEffect(() => {
    let active = true

    async function loadBranchOptions() {
      try {
        const response = await api.get("/records/branches", { params: { pageSize: 200 } })
        if (!active) return
        const nextOptions = (response.data?.data || []).map((row: Record<string, unknown>) => ({
          value: String(row.id),
          label: String(row.name || row.slug || row.code || row.id),
        }))
        setBranchOptions(nextOptions)
        setSelectedBranchIds((current) => {
          const allowedIds = new Set(nextOptions.map((item: { value: string }) => item.value))
          const normalized = current.filter((item) => allowedIds.has(item))
          const nextSelected = normalized.length > 0 ? normalized : (nextOptions[0] ? [nextOptions[0].value] : [])
          if (nextSelected.join(",") !== current.join(",")) {
            setGlobalBranchFilterIds(nextSelected)
          }
          return nextSelected
        })
      } catch {
        if (!active) return
        setBranchOptions([])
      }
    }

    void loadBranchOptions()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => onGlobalBranchFilterChange(setSelectedBranchIds), [])

  const profileDisplayName = useMemo(
    () => staffDisplayName || identity?.fullName || identity?.username || identity?.email || "",
    [identity?.email, identity?.fullName, identity?.username, staffDisplayName],
  )
  const selectedBranchLabel = useMemo(() => {
    const names = branchOptions.filter((option) => selectedBranchIds.includes(option.value)).map((option) => option.label)
    if (names.length === 0) return "Chọn chi nhánh"
    return names.length === 1 ? names[0] : `${names.length} chi nhánh`
  }, [branchOptions, selectedBranchIds])
  const selectedBranchNames = useMemo(
    () => branchOptions.filter((option) => selectedBranchIds.includes(option.value)).map((option) => option.label),
    [branchOptions, selectedBranchIds],
  )
  const openBranchPicker = () => {
    setPendingBranchIds(selectedBranchIds)
    setBranchPickerOpen(true)
  }
  const applyBranchFilter = () => {
    const nextValues = pendingBranchIds.length > 0 ? pendingBranchIds : (branchOptions[0] ? [branchOptions[0].value] : [])
    setSelectedBranchIds(nextValues)
    setGlobalBranchFilterIds(nextValues)
    setBranchPickerOpen(false)
  }
  const toggleBranchFilter = (branchId: string, checked: boolean) => {
    const nextValues = checked
      ? Array.from(new Set([...selectedBranchIds, branchId]))
      : selectedBranchIds.filter((id) => id !== branchId)
    if (nextValues.length === 0) return
    setSelectedBranchIds(nextValues)
    setGlobalBranchFilterIds(nextValues)
  }
  const profileMenu: MenuProps["items"] = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Hồ sơ cá nhân",
      onClick: () => navigate("/profile"),
    },
    { type: "divider" },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Đăng xuất",
      danger: true,
      onClick: () => logout(),
    },
  ]
  const profileDropdown = (
    <div className="profile-dropdown-panel">
      <div className="profile-branch-picker">
        <div className="profile-branch-picker-title"><BankOutlined /> Chi nhánh hiển thị</div>
        <div className="profile-branch-options">
          {branchOptions.map((branch) => (
            <Checkbox key={branch.value} checked={selectedBranchIds.includes(branch.value)} onChange={(event) => toggleBranchFilter(branch.value, event.target.checked)}>
              {branch.label}
            </Checkbox>
          ))}
        </div>
      </div>
      <Menu items={profileMenu} selectable={false} />
    </div>
  )

  const currentResource = location.pathname.split("/")[1]
  const activeCompanyType = settings.companyType || "clinic"
  const isAdmin = isCurrentUserAdmin()
  const canAccessScreen = (screen: string) => isAdmin || hasScreenAccess(screen)
  const isGloballyEnabled = (moduleKey: string) =>
    isModuleEnabled(moduleKey, settings.enabledModules, activeCompanyType, settings.hasCustomModuleSelection)
  const moduleOrderMap = new Map((settings.enabledModules || []).map((resource, index) => [resource, index]))
  const getModuleOrder = (resource: string, fallbackIndex = Number.MAX_SAFE_INTEGER) =>
    moduleOrderMap.has(resource) ? moduleOrderMap.get(resource) as number : fallbackIndex
  const sortModulesBySettingsOrder = (modules: string[]) =>
    modules
      .map((resource, index) => ({ resource, index }))
      .sort((left, right) => {
        const leftOrder = getModuleOrder(left.resource)
        const rightOrder = getModuleOrder(right.resource)
        return leftOrder === rightOrder ? left.index - right.index : leftOrder - rightOrder
      })
      .map((item) => item.resource)
  const canShowMenuModule = (resource: string) => {
    if (!entityLabels[resource] && !moduleNavigation[resource]) return false
    if (!isGloballyEnabled(resource)) return false
    if (moduleNavigation[resource]?.screen && !canAccessScreen(moduleNavigation[resource].screen!)) return false
    return hasResourceAccess(resource)
  }
  const visibleGroups = appModuleGroups
    .map((group, groupIndex) => ({
      ...group,
      groupIndex,
      label: resolveMenuGroupLabel(group.key, group.label, activeCompanyType),
      resources: sortModulesBySettingsOrder(group.modules.filter(canShowMenuModule)),
    }))
    .map((group) => ({
      ...group,
      resources: group.key === "landing" ? group.resources.filter((resource) => resource !== "landing-domains") : group.resources,
    }))
    .filter((group) => group.resources.length > 0)
  const getGroupOrder = (resources: string[]) =>
    resources.reduce((best, resource) => Math.min(best, getModuleOrder(resource)), Number.MAX_SAFE_INTEGER)
  const menuSections = [
    ...appStandaloneModules
      .filter(canShowMenuModule)
      .map((key, index) => ({
        key: `single:${key}`,
        order: getModuleOrder(key, index),
        index,
        item: {
          key: moduleNavigation[key]?.path || `/${key}`,
          icon: menuIcons[key] || <SolutionOutlined />,
          label: <Link to={moduleNavigation[key]?.path || `/${key}`}>{moduleNavigation[key]?.label || appModuleLabels[key] || key}</Link>,
        },
      })),
    ...visibleGroups.map((group) => ({
      key: group.key,
      order: getGroupOrder(group.resources),
      index: appStandaloneModules.length + group.groupIndex,
      item: {
        key: group.key,
        icon: menuGroupIcons[group.key] || <SolutionOutlined />,
        label: group.label,
        children: [
          ...group.resources.map((key) => ({
            key: moduleNavigation[key]?.path || `/${key}`,
            icon: menuIcons[key] || <SolutionOutlined />,
            label: <Link to={moduleNavigation[key]?.path || `/${key}`}>{moduleNavigation[key]?.label || entityLabels[key] || appModuleLabels[key] || key}</Link>,
          })),
          ...(group.key === "admin" && canAccessScreen("settings")
            ? [
                {
                  key: "/role-module-settings",
                  icon: <SettingOutlined />,
                  label: <Link to="/role-module-settings">Hiển thị theo role/module</Link>,
                },
                {
                  key: "/roles",
                  icon: menuIcons.roles,
                  label: <Link to="/roles">Vai trò & Phân quyền</Link>,
                },
              ]
            : []),
        ],
      },
    })),
  ].sort((left, right) => left.order === right.order ? left.index - right.index : left.order - right.order)
  const items: MenuProps["items"] = [
    ...menuSections.map((section) => section.item),
    {
      key: "system-tools",
      icon: <GoldOutlined />,
      label: "Công cụ hệ thống",
      children: [
        canAccessScreen("settings")
          ? {
              key: "/print-templates",
              icon: <FileTextOutlined />,
              label: <Link to="/print-templates">Mẫu in</Link>,
            }
          : null,
        canAccessScreen("settings")
          ? {
              key: "/ui-settings",
              icon: <SettingOutlined />,
              label: <Link to="/ui-settings">Giao diện CMS</Link>,
            }
          : null,
        canAccessScreen("settings")
          ? {
              key: "/chatbot-settings",
              icon: <RobotOutlined />,
              label: <Link to="/chatbot-settings">Trợ lý chat</Link>,
            }
          : null,
        canAccessScreen("settings")
          ? {
              key: "/custom-fields",
              icon: menuIcons["custom-fields"],
              label: <Link to="/custom-fields">Trường tuỳ biến</Link>,
            }
          : null,
        canAccessScreen("settings")
          ? {
              key: "/custom-tables",
              icon: <AppstoreOutlined />,
              label: <Link to="/custom-tables">Bảng dữ liệu động</Link>,
            }
          : null,
        canAccessScreen("settings")
          ? {
              key: "/master-data",
              icon: <AppstoreOutlined />,
              label: <Link to="/master-data">Master Data</Link>,
            }
          : null,
        canAccessScreen("audit-logs")
          ? {
              key: "/audit-logs",
              icon: <AuditOutlined />,
              label: <Link to="/audit-logs">Nhật ký hệ thống</Link>,
            }
          : null,
      ].filter(Boolean),
    },
  ]
    .filter((item) => item && (item.key !== "system-tools" || ((("children" in item ? item.children : []) as []) || []).length > 0))
  const selected =
    location.pathname === "/"
      ? "/"
      : location.pathname.startsWith("/calendar")
        ? "/calendar"
      : location.pathname.startsWith("/accounting-reports")
        ? "/accounting-reports"
      : location.pathname.startsWith("/zalo-inbox")
        ? "/zalo-inbox"
        : `/${currentResource}`
  const defaultOpenKeys = [
    resourceToGroup[currentResource] ||
    (location.pathname.startsWith("/accounting-reports")
      ? "finance"
      : undefined) ||
    (location.pathname.startsWith("/zalo-inbox")
      ? "front-office"
      : undefined) ||
    (["/pages", "/forms", "/posts", "/news", "/services", "/doctors", "/videos", "/domains", "/configs", "/customer-app"].some((path) => location.pathname.startsWith(path))
      ? "landing"
      : undefined) ||
    (location.pathname === "/roles" || location.pathname === "/role-module-settings"
      ? "admin"
      : undefined),
    location.pathname.startsWith("/settings") ||
    location.pathname.startsWith("/ui-settings") ||
    location.pathname.startsWith("/landing-pages") ||
    location.pathname.startsWith("/landing-theme") ||
    location.pathname.startsWith("/chatbot-settings") ||
    location.pathname.startsWith("/chatbot-history") ||
    location.pathname.startsWith("/custom-fields") ||
    location.pathname.startsWith("/custom-tables") ||
    location.pathname.startsWith("/print-templates") ||
    location.pathname.startsWith("/master-data") ||
    location.pathname.startsWith("/locations") ||
    location.pathname.startsWith("/audit-logs")
      ? "system-tools"
      : undefined,
  ].filter(Boolean) as string[]

  function toggleCollapsed() {
    if (!screens.lg) {
      setMobileMenuOpen(true)
      return
    }
    setCollapsed((current) => {
      const next = !current
      try {
        localStorage.setItem(SIDER_COLLAPSE_KEY, next ? "1" : "0")
      } catch {
        // ignore storage errors
      }
      return next
    })
  }

  const menuNode = (
    <Menu
      className="side-menu"
      defaultOpenKeys={defaultOpenKeys}
      items={items}
      selectedKeys={[selected]}
      mode="inline"
      theme="light"
      onClick={() => {
        if (!screens.lg) setMobileMenuOpen(false)
      }}
    />
  )

  return (
    <Layout className="app-shell">
      <Sider
        breakpoint="lg"
        className="app-sider"
        collapsed={collapsed}
        collapsedWidth={60}
        theme="light"
        trigger={null}
        width={282}
        onBreakpoint={(broken) => {
          if (broken) setCollapsed(true)
        }}
      >
        <div className="sidebar-brand-row">
          <div className="brand-card">
            <div className={`brand-mark${settings.appIconUrl ? " has-image" : ""}`}>
              {settings.appIconUrl ? <img alt={settings.appName} src={settings.appIconUrl} /> : (settings.appName || 'CMS').slice(0, 2).toUpperCase()}
            </div>
            <div className="brand-copy">
              <Typography.Title level={4}>{settings.appName || 'CMS'}</Typography.Title>
            </div>
          </div>
          <Button aria-label={collapsed ? "Mở menu" : "Thu gọn menu"} className="sider-toggle sidebar-top-toggle" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={toggleCollapsed} />
        </div>
        <div className="side-menu-scroll">
          {menuNode}
        </div>
        <div className="sider-footer">
          <Dropdown dropdownRender={() => profileDropdown} placement="topRight" trigger={["click"]}>
            <button className="profile-trigger sidebar-profile-card" title={profileDisplayName || "Tài khoản"}>
              <Avatar icon={<UserOutlined />} size={32} style={{ background: "var(--app-primary)", color: "#180c12", cursor: "pointer", flexShrink: 0 }} />
              {!collapsed && <span className="sidebar-profile-copy"><Typography.Text className="profile-name">{profileDisplayName || "Tài khoản"}</Typography.Text><span className="sidebar-branch-names">{selectedBranchNames.length > 0 ? selectedBranchNames.slice(0, 2).join(" · ") : "Chưa chọn chi nhánh"}</span></span>}
            </button>
          </Dropdown>
        </div>
      </Sider>
      <Layout>
        <Content className="app-content">{children}</Content>
      </Layout>
      <Button className="mobile-navigation-trigger" aria-label="Mở menu" icon={<MenuUnfoldOutlined />} onClick={() => setMobileMenuOpen(true)} />
      <Modal
        open={branchPickerOpen}
        title="Chọn chi nhánh hiển thị"
        okText="Áp dụng"
        cancelText="Hủy"
        onCancel={() => setBranchPickerOpen(false)}
        onOk={applyBranchFilter}
      >
        <Typography.Paragraph type="secondary">Dữ liệu trên CMS sẽ được lọc theo các chi nhánh đã chọn.</Typography.Paragraph>
        <Select
          mode="multiple"
          maxTagCount="responsive"
          options={branchOptions}
          placeholder="Tìm và chọn chi nhánh"
          showSearch
          optionFilterProp="label"
          style={{ width: "100%" }}
          value={pendingBranchIds}
          onChange={setPendingBranchIds}
        />
      </Modal>
      <Modal
        className="mobile-menu-drawer"
        open={mobileMenuOpen}
        title={settings.appName || 'CMS'}
        width={320}
        footer={null}
        onCancel={() => setMobileMenuOpen(false)}
      >
        <div className="brand-card mobile-menu-brand">
            <div className={`brand-mark${settings.appIconUrl ? " has-image" : ""}`}>
            {settings.appIconUrl ? <img alt={settings.appName} src={settings.appIconUrl} /> : (settings.appName || 'CMS').slice(0, 2).toUpperCase()}
          </div>
          <div className="brand-copy">
            <Typography.Title level={4}>{settings.appName || 'CMS'}</Typography.Title>
          </div>
        </div>
        <div className="mobile-menu-scroll">{menuNode}</div>
        <div className="mobile-menu-footer">
          <Button block icon={<BankOutlined />} onClick={openBranchPicker}>{selectedBranchLabel}</Button>
          <Dropdown dropdownRender={() => profileDropdown} placement="topRight" trigger={["click"]}>
            <button className="profile-trigger sidebar-profile-trigger">
              <Avatar icon={<UserOutlined />} size={32} style={{ background: "var(--app-primary)", color: "#180c12", flexShrink: 0 }} />
              {profileDisplayName && <Typography.Text className="profile-name">{profileDisplayName}</Typography.Text>}
            </button>
          </Dropdown>
        </div>
      </Modal>
    </Layout>
  )
}

export function resolveBrowserPageTitle(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  const root = segments[0] || ''
  if (!root) return 'Feed'

  if (root === 'settings' && segments[1] === 'print-templates') return 'Chỉnh sửa mẫu in'
  if (root === 'projects' && segments[2] === 'board') return 'Bảng công việc dự án'
  if (root === 'pages' && segments[1]) return 'Chỉnh sửa trang đích'

  const staticTitles: Record<string, string> = {
    login: 'Đăng nhập',
    calendar: 'Lịch tổng',
    profile: 'Hồ sơ cá nhân',
    'accounting-reports': 'Báo cáo kế toán',
    'zalo-inbox': 'Hộp thư Zalo',
    'custom-fields': 'Trường tuỳ biến',
    'custom-tables': 'Bảng dữ liệu động',
    locations: 'Master Data',
    'master-data': 'Master Data',
    'role-module-settings': 'Hiển thị theo role/module',
    'print-templates': 'Mẫu in',
    settings: 'Cấu hình động',
    pages: 'Trang đích',
    forms: 'Biểu mẫu',
    domains: 'Tên miền',
    configs: 'Cài đặt site',
    'customer-app': 'App khách hàng',
    'chatbot-settings': 'Chatbot',
    'chatbot-history': 'Lịch sử GIS AI',
    'landing-theme': 'Giao diện landing',
    roles: 'Vai trò & Phân quyền',
    'ui-settings': 'Giao diện CMS',
    'audit-logs': 'Nhật ký hệ thống',
  }

  return staticTitles[root] || entityLabels[root] || root
}
