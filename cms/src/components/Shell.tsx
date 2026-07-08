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
  RobotOutlined,
  SettingOutlined,
  ShopOutlined,
  SolutionOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons"
import { useGetIdentity, useLogout } from "@refinedev/core"
import { Avatar, Button, Drawer, Dropdown, Grid, Layout, Menu, Space, Typography } from "antd"
import type { MenuProps } from "antd"
import { useEffect, useMemo, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { hasResourceAccess, hasScreenAccess } from "../access"
import { api } from "../api"
import { useAppUi } from "../app-ui"
import {
  appModuleGroups,
  companyTypeLabels,
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
  "stock-batches": <DatabaseOutlined />,
  treatments: <ExperimentOutlined />,
  invoices: <FileDoneOutlined />,
  expenses: <DollarOutlined />,
  commissions: <GiftOutlined />,
  'file-folders': <FolderOpenOutlined />,
  files: <FileDoneOutlined />,
  attendances: <CalendarOutlined />,
  'leave-requests': <FileDoneOutlined />,
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
  admin: <SettingOutlined />,
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

  const profileDisplayName = useMemo(
    () => staffDisplayName || identity?.fullName || identity?.username || identity?.email || "",
    [identity?.email, identity?.fullName, identity?.username, staffDisplayName],
  )

  const currentResource = location.pathname.split("/")[1]
  const activeCompanyType = settings.companyType || "clinic"
  const visibleGroups = appModuleGroups
    .map((group) => ({
      ...group,
      label: resolveMenuGroupLabel(group.key, group.label, activeCompanyType),
      resources: group.modules.filter((resource) => {
        if (!entityLabels[resource]) return false
        if (!isModuleEnabled(resource, settings.enabledModules, activeCompanyType)) return false
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
    ...(hasScreenAccess("accounting-reports") && isModuleEnabled("accounting-reports", settings.enabledModules, activeCompanyType)
      ? [
          {
            key: "/accounting-reports",
            icon: menuIcons["accounting-reports"],
            label: <Link to="/accounting-reports">Báo cáo kế toán</Link>,
          },
        ]
      : []),
    ...visibleGroups.map((group) => ({
      key: group.key,
      icon: menuGroupIcons[group.key] || <SolutionOutlined />,
      label: group.label,
      children: [
        ...group.resources.map((key) => ({
          key: `/${key}`,
          icon: menuIcons[key] || <SolutionOutlined />,
          label: <Link to={`/${key}`}>{entityLabels[key]}</Link>,
        })),
        ...(group.key === "front-office" && hasScreenAccess("zalo-inbox") && isModuleEnabled("zalo-inbox", settings.enabledModules, activeCompanyType)
          ? [
              {
                key: "/zalo-inbox",
                icon: menuIcons["zalo-inbox"],
                label: <Link to="/zalo-inbox">Hộp thư Zalo</Link>,
              },
            ]
          : []),
        ...(group.key === "admin" && hasScreenAccess("settings")
          ? [
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
              key: "/ui-settings",
              icon: <SettingOutlined />,
              label: <Link to="/ui-settings">Giao diện CMS</Link>,
            }
          : null,
        hasScreenAccess("settings")
          ? {
              key: "/landing-pages",
              icon: menuIcons["landing-pages"],
              label: <Link to="/landing-pages">Trang landing</Link>,
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
              key: "/settings",
              icon: <SettingOutlined />,
              label: <Link to="/settings">Cấu hình động</Link>,
            }
          : null,
        hasScreenAccess("audit-logs")
          ? {
              key: "/audit-logs",
              icon: <AuditOutlined />,
              label: <Link to="/audit-logs">Nhật ký hệ thống</Link>,
            }
          : null,
        hasScreenAccess("accounting-reports") && isModuleEnabled("accounting-reports", settings.enabledModules, activeCompanyType)
          ? {
              key: "/accounting-reports-system",
              icon: menuIcons["accounting-reports"],
              label: <Link to="/accounting-reports">Báo cáo kế toán</Link>,
            }
          : null,
      ].filter(Boolean),
    },
  ]
    .filter((item) => item.key !== "/calendar" || isModuleEnabled("calendar", settings.enabledModules, activeCompanyType))
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
    (location.pathname === "/roles"
      ? "admin"
      : undefined),
    location.pathname.startsWith("/settings") ||
    location.pathname.startsWith("/ui-settings") ||
    location.pathname.startsWith("/landing-pages") ||
    location.pathname.startsWith("/landing-theme") ||
    location.pathname.startsWith("/chatbot-settings") ||
    location.pathname.startsWith("/custom-fields") ||
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
        collapsedWidth={88}
        theme="light"
        trigger={null}
        width={282}
        onBreakpoint={(broken) => {
          if (broken) setCollapsed(true)
        }}
      >
        <div className="brand-card">
          <div className="brand-mark">
            {settings.appIconUrl ? <img alt={settings.appName} src={settings.appIconUrl} /> : settings.appName.slice(0, 2).toUpperCase()}
          </div>
          <div className="brand-copy">
            <Typography.Title level={4}>{settings.appName}</Typography.Title>
            <Typography.Text className="brand-kicker" style={{ fontSize: 11, fontWeight: 700 }}>
              {companyTypeLabels[activeCompanyType] || activeCompanyType}
            </Typography.Text>
            {settings.appDescription ? (
              <Typography.Text className="brand-kicker" style={{fontSize: 12}}>
                {settings.appDescription}
              </Typography.Text>
            ) : null}
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
      <Drawer
        className="mobile-menu-drawer"
        open={mobileMenuOpen}
        placement="left"
        title={settings.appName}
        width={320}
        onClose={() => setMobileMenuOpen(false)}
      >
        <div className="brand-card mobile-menu-brand">
          <div className="brand-mark">
            {settings.appIconUrl ? <img alt={settings.appName} src={settings.appIconUrl} /> : settings.appName.slice(0, 2).toUpperCase()}
          </div>
          <div className="brand-copy">
            <Typography.Title level={4}>{settings.appName}</Typography.Title>
            <Typography.Text className="brand-kicker" style={{ fontSize: 11, fontWeight: 700 }}>
              {companyTypeLabels[activeCompanyType] || activeCompanyType}
            </Typography.Text>
            {settings.appDescription ? (
              <Typography.Text className="brand-kicker" style={{fontSize: 12}}>
                {settings.appDescription}
              </Typography.Text>
            ) : null}
          </div>
        </div>
        <div className="mobile-menu-scroll">{menuNode}</div>
      </Drawer>
    </Layout>
  )
}
