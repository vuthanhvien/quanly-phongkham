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
import { Avatar, Button, Dropdown, Layout, Menu, Space, Typography } from "antd"
import type { MenuProps } from "antd"
import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { hasResourceAccess, hasScreenAccess } from "../access"
import { useAppUi } from "../app-ui"
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
  staff: <TeamOutlined />,
  "branch-permissions": <AuditOutlined />,
  "user-accounts": <SettingOutlined />,
  customers: <TeamOutlined />,
  leads: <LineChartOutlined />,
  "lead-activities": <InteractionOutlined />,
  "zalo-inbox": <MessageOutlined />,
  "medical-episodes": <MedicineBoxOutlined />,
  appointments: <CalendarOutlined />,
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
}

const menuGroups = [
  {
    key: "front-office",
    label: "Lễ tân & CRM",
    icon: <TeamOutlined />,
    resources: ["leads", "lead-activities", "customers", "appointments"],
  },
  {
    key: "clinical",
    label: "Chuyên môn điều trị",
    icon: <MedicineBoxOutlined />,
    resources: ["medical-episodes", "consultations", "service-orders", "customer-images", "treatments"],
  },
  {
    key: "inventory",
    label: "Kho & mua hàng",
    icon: <DatabaseOutlined />,
    resources: ["suppliers", "products", "product-categories", "stock-batches"],
  },
  {
    key: "documents",
    label: "Tài liệu & file",
    icon: <FolderOpenOutlined />,
    resources: ["file-folders", "files"],
  },
  {
    key: "finance",
    label: "Tài chính & lương",
    icon: <DollarOutlined />,
    resources: ["invoices", "expenses", "commissions", "payrolls", "attendances", "leave-requests", "work-schedules", "work-contracts", "staff-insurances"],
  },
  {
    key: "admin",
    label: "Quản trị",
    icon: <SettingOutlined />,
    resources: [
      "branches",
      "departments",
      "staff",
      "user-accounts",
    ],
  },
]

const resourceToGroup = Object.fromEntries(
  menuGroups.flatMap((group) =>
    group.resources.map((resource) => [resource, group.key]),
  ),
)

export function Shell({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { mutate: logout } = useLogout()
  const { data: identity } = useGetIdentity<{ name?: string; email?: string }>()
  const { settings } = useAppUi()
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDER_COLLAPSE_KEY) === "1"
    } catch {
      return false
    }
  })
  const currentResource = location.pathname.split("/")[1]
  const visibleGroups = menuGroups
    .map((group) => ({
      ...group,
      resources: group.resources.filter((resource) => hasResourceAccess(resource)),
    }))
    .filter((group) => group.resources.length > 0)
  const items: MenuProps["items"] = [
    {
      key: "/",
      icon: <DashboardOutlined />,
      label: <Link to="/">Tổng quan</Link>,
    },
    ...visibleGroups.map((group) => ({
      key: group.key,
      icon: group.icon,
      label: group.label,
      children: [
        ...group.resources.map((key) => ({
          key: `/${key}`,
          icon: menuIcons[key] || <SolutionOutlined />,
          label: <Link to={`/${key}`}>{entityLabels[key]}</Link>,
        })),
        ...(group.key === "front-office" && hasScreenAccess("zalo-inbox")
          ? [
              {
                key: "/zalo-inbox",
                icon: menuIcons["zalo-inbox"],
                label: <Link to="/zalo-inbox">Zalo Inbox</Link>,
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
              label: <Link to="/ui-settings">UI settings</Link>,
            }
          : null,
        hasScreenAccess("settings")
          ? {
              key: "/landing-pages",
              icon: menuIcons["landing-pages"],
              label: <Link to="/landing-pages">Landing pages</Link>,
            }
          : null,
        hasScreenAccess("settings")
          ? {
              key: "/chatbot-settings",
              icon: <RobotOutlined />,
              label: <Link to="/chatbot-settings">Chatbot</Link>,
            }
          : null,
        hasScreenAccess("settings")
          ? {
              key: "/custom-fields",
              icon: menuIcons["custom-fields"],
              label: <Link to="/custom-fields">Custom fields</Link>,
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
              label: <Link to="/audit-logs">Audit log</Link>,
            }
          : null,
      ].filter(Boolean),
    },
  ].filter((item) => item && (item.key !== "system-tools" || ((item.children as []) || []).length > 0))
  const selected =
    location.pathname === "/"
      ? "/"
      : location.pathname.startsWith("/zalo-inbox")
        ? "/zalo-inbox"
        : `/${currentResource}`
  const defaultOpenKeys = [
    resourceToGroup[currentResource] ||
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

  return (
    <Layout className="app-shell">
      <Sider
        breakpoint="lg"
        className="app-sider"
        collapsed={collapsed}
        collapsedWidth={88}
        theme="dark"
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
            <Typography.Text className="brand-kicker">
              {settings.appDescription || "Aesthetic Clinic"}
            </Typography.Text>
            <Typography.Title level={4}>{settings.appName}</Typography.Title>
          </div>
        </div>
        <div className="side-menu-scroll">
          <Menu
            className="side-menu"
            defaultOpenKeys={defaultOpenKeys}
            items={items}
            selectedKeys={[selected]}
            mode="inline"
            theme="dark"
          />
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
              {identity?.name && (
                <Typography.Text className="profile-name">{identity.name}</Typography.Text>
              )}
            </button>
          </Dropdown>
        </Header>
        <Content className="app-content">{children}</Content>
      </Layout>
    </Layout>
  )
}
