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
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PictureOutlined,
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
import { Avatar, Button, Dropdown, Grid, Layout, Menu, Modal, Select, Space, Typography } from "antd"
import type { MenuProps } from "antd"
import { useEffect, useMemo, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { hasResourceAccess, hasScreenAccess, isCurrentUserAdmin } from "../access"
import { api, getGlobalBranchFilterIds, onGlobalBranchFilterChange, setGlobalBranchFilterIds } from "../api"
import { useAppUi } from "../app-ui"
import {
  appModuleGroups,
  appModuleLabels,
  isModuleEnabled,
  resolveMenuGroupLabel,
  type AppModuleGroup,
} from "../company-types"
import { entityLabels } from "../models"

const { Header, Content, Sider } = Layout
const SIDER_COLLAPSE_KEY = "clinic-sider-collapsed"

const menuIcons: Record<string, React.ReactNode> = {
  "custom-fields": <AppstoreOutlined />,
  branches: <BankOutlined />,
  roles: <SettingOutlined />,
  "branch-role-assignments": <DeploymentUnitOutlined />,
  "landing-pages": <GlobalOutlined />,
  "landing-forms": <FileDoneOutlined />,
  "landing-domains": <GlobalOutlined />,
  "landing-config": <SettingOutlined />,
  posts: <FileTextOutlined />,
  news: <ReadOutlined />,
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
  "landing-pages": { path: "/pages", label: "Trang đích", screen: "settings" },
  "landing-forms": { path: "/forms", label: "Biểu mẫu", screen: "settings" },
  "landing-domains": { path: "/domains", label: "Tên miền", screen: "settings" },
  "landing-config": { path: "/configs", label: "Cấu hình", screen: "settings" },
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
  const browserPageTitle = useMemo(() => resolveBrowserPageTitle(location.pathname), [location.pathname])
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

  useEffect(() => {
    const appName = String(settings.appName || 'CMS').trim() || 'CMS'
    document.title = browserPageTitle ? `${browserPageTitle} | ${appName}` : appName
  }, [browserPageTitle, settings.appName])

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

  const currentResource = location.pathname.split("/")[1]
  const activeCompanyType = settings.companyType || "clinic"
  const isAdmin = isCurrentUserAdmin()
  const visibleGroups = appModuleGroups
    .map((group) => ({
      ...group,
      label: resolveMenuGroupLabel(group.key, group.label, activeCompanyType),
      resources: group.modules.filter((resource) => {
        if (!entityLabels[resource] && !moduleNavigation[resource]) return false
        if (moduleNavigation[resource]?.screen && !hasScreenAccess(moduleNavigation[resource].screen!)) return false
        if (!isModuleEnabled(resource, settings.enabledModules, activeCompanyType, settings.hasCustomModuleSelection)) return false
        return hasResourceAccess(resource)
      }),
    }))
    .filter((group) => group.resources.length > 0)
  const items: MenuProps["items"] = [
    {
      key: "/",
      icon: <DashboardOutlined />,
      label: <Link to="/">Tổng quan</Link>,
    },
    {
      key: "/calendar",
      icon: menuIcons.calendar,
      label: <Link to="/calendar">Lịch tổng</Link>,
    },
    ...visibleGroups.map((group) => ({
      key: group.key,
      icon: menuGroupIcons[group.key] || <SolutionOutlined />,
      label: group.label,
      children: [
        ...group.resources.map((key) => ({
          key: moduleNavigation[key]?.path || `/${key}`,
          icon: menuIcons[key] || <SolutionOutlined />,
          label: <Link to={moduleNavigation[key]?.path || `/${key}`}>{moduleNavigation[key]?.label || entityLabels[key] || appModuleLabels[key] || key}</Link>,
        })),
        ...(group.key === "admin" && hasScreenAccess("settings")
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
    })),
    {
      key: "system-tools",
      icon: <GoldOutlined />,
      label: "Công cụ hệ thống",
      children: [
        hasScreenAccess("settings")
          ? {
              key: "/print-templates",
              icon: <FileTextOutlined />,
              label: <Link to="/print-templates">Mẫu in</Link>,
            }
          : null,
        hasScreenAccess("settings")
          ? {
              key: "/ui-settings",
              icon: <SettingOutlined />,
              label: <Link to="/ui-settings">Giao diện CMS</Link>,
            }
          : null,
        hasScreenAccess("settings")
          ? {
              key: "/chatbot-settings",
              icon: <RobotOutlined />,
              label: <Link to="/chatbot-settings">Trợ lý chat</Link>,
            }
          : null,
        hasScreenAccess("settings")
          ? {
              key: "/custom-fields",
              icon: menuIcons["custom-fields"],
              label: <Link to="/custom-fields">Trường tuỳ biến</Link>,
            }
          : null,
        hasScreenAccess("settings")
          ? {
              key: "/custom-tables",
              icon: <AppstoreOutlined />,
              label: <Link to="/custom-tables">Bảng dữ liệu động</Link>,
            }
          : null,
        hasScreenAccess("settings")
          ? {
              key: "/locations",
              icon: <AppstoreOutlined />,
              label: <Link to="/locations">Master Data Địa chỉ</Link>,
            }
          : null,
        hasScreenAccess("audit-logs")
          ? {
              key: "/audit-logs",
              icon: <AuditOutlined />,
              label: <Link to="/audit-logs">Nhật ký hệ thống</Link>,
            }
          : null,
      ].filter(Boolean),
    },
  ]
    .filter((item) => item.key !== "/calendar" || isModuleEnabled("calendar", settings.enabledModules, activeCompanyType, settings.hasCustomModuleSelection))
    .filter((item) => item && (item.key !== "system-tools" || ((item.children as []) || []).length > 0))
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
    (["/pages", "/forms", "/posts", "/news", "/domains", "/configs"].some((path) => location.pathname.startsWith(path))
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
    location.pathname.startsWith("/custom-fields") ||
    location.pathname.startsWith("/custom-tables") ||
    location.pathname.startsWith("/print-templates") ||
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
        <div className="brand-card">
          <div className="brand-mark">
            {settings.appIconUrl ? <img alt={settings.appName} src={settings.appIconUrl} /> : (settings.appName || 'CMS').slice(0, 2).toUpperCase()}
          </div>
          <div className="brand-copy">
            <Typography.Title level={4}>{settings.appName || 'CMS'}</Typography.Title>
          </div>
        </div>
        <div className="side-menu-scroll">
          {menuNode}
        </div>
      </Sider>
      <Layout>
        <Header className="app-header">
          <Space size={12}>
            <Button
              aria-label={collapsed ? "Mở menu" : "Thu gọn menu"}
              className="sider-toggle"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={toggleCollapsed}
            />
            <Select
              className="global-branch-filter"
              mode="multiple"
              maxTagCount="responsive"
              options={branchOptions}
              placeholder="Chọn chi nhánh"
              showSearch
              loading={branchOptions.length === 0}
              value={branchOptions.length > 0 ? selectedBranchIds : undefined}
              onChange={(values) => {
                const nextValues = values.length > 0 ? values : (branchOptions[0] ? [branchOptions[0].value] : [])
                setSelectedBranchIds(nextValues)
                setGlobalBranchFilterIds(nextValues)
              }}
            />
          </Space>
          <Dropdown
            menu={{
              items: [
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
              ],
            }}
            placement="bottomRight"
            trigger={["click"]}
          >
            <button className="profile-trigger">
              <Avatar
                icon={<UserOutlined />}
                size={32}
                style={{ background: "var(--app-primary)", color: "#180c12", cursor: "pointer", flexShrink: 0 }}
              />
              {profileDisplayName && (
                <Typography.Text className="profile-name">{profileDisplayName}</Typography.Text>
              )}
            </button>
          </Dropdown>
        </Header>
        <Content className="app-content">{children}</Content>
      </Layout>
      <Modal
        className="mobile-menu-drawer"
        open={mobileMenuOpen}
        title={settings.appName || 'CMS'}
        width={320}
        footer={null}
        onCancel={() => setMobileMenuOpen(false)}
      >
        <div className="brand-card mobile-menu-brand">
          <div className="brand-mark">
            {settings.appIconUrl ? <img alt={settings.appName} src={settings.appIconUrl} /> : (settings.appName || 'CMS').slice(0, 2).toUpperCase()}
          </div>
          <div className="brand-copy">
            <Typography.Title level={4}>{settings.appName || 'CMS'}</Typography.Title>
          </div>
        </div>
        <div className="mobile-menu-scroll">{menuNode}</div>
      </Modal>
    </Layout>
  )
}

function resolveBrowserPageTitle(pathname: string) {
  const root = pathname.split('/').filter(Boolean)[0] || ''
  if (!root) return 'Tổng quan'

  const staticTitles: Record<string, string> = {
    calendar: 'Lịch tổng',
    profile: 'Hồ sơ cá nhân',
    'accounting-reports': 'Báo cáo kế toán',
    'zalo-inbox': 'Hộp thư Zalo',
    'custom-fields': 'Trường tuỳ biến',
    'custom-tables': 'Bảng dữ liệu động',
    locations: 'Địa chỉ',
    settings: 'Cấu hình động',
    pages: 'Landing pages',
    forms: 'Landing forms',
    domains: 'Landing domains',
    configs: 'Landing configs',
    'chatbot-settings': 'Chatbot',
    'landing-theme': 'Giao diện landing',
    roles: 'Vai trò & Phân quyền',
    'ui-settings': 'Giao diện CMS',
    'audit-logs': 'Nhật ký hệ thống',
  }

  return staticTitles[root] || entityLabels[root] || root
}
