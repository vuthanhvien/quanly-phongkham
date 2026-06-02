import {
  AppstoreOutlined,
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
  MedicineBoxOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PictureOutlined,
  ProductOutlined,
  SettingOutlined,
  ShopOutlined,
  SolutionOutlined,
  TeamOutlined,
} from "@ant-design/icons"
import { useLogout } from "@refinedev/core"
import { Button, Layout, Menu, Space, Tag, Typography } from "antd"
import type { MenuProps } from "antd"
import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { hasResourceAccess, hasScreenAccess } from "../access"
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
  "medical-episodes": <MedicineBoxOutlined />,
  appointments: <CalendarOutlined />,
  "work-schedules": <CalendarOutlined />,
  consultations: <MedicineBoxOutlined />,
  "service-orders": <FileDoneOutlined />,
  "customer-images": <PictureOutlined />,
  suppliers: <ShopOutlined />,
  products: <ProductOutlined />,
  "stock-batches": <DatabaseOutlined />,
  treatments: <ExperimentOutlined />,
  invoices: <FileDoneOutlined />,
  expenses: <DollarOutlined />,
  commissions: <GiftOutlined />,
  'file-folders': <FolderOpenOutlined />,
  files: <FileDoneOutlined />,
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
    resources: ["medical-episodes", "consultations", "service-orders", "customer-images", "work-schedules", "treatments"],
  },
  {
    key: "inventory",
    label: "Kho & mua hàng",
    icon: <DatabaseOutlined />,
    resources: ["suppliers", "products", "stock-batches"],
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
    resources: ["invoices", "expenses", "commissions"],
  },
  {
    key: "admin",
    label: "Quản trị hệ thống",
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
  const { mutate: logout } = useLogout()
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
        ...(group.key === "admin" && hasScreenAccess("settings")
          ? [
              {
                key: "/roles",
                icon: menuIcons.roles,
                label: <Link to="/roles">Vai trò</Link>,
              },
              {
                key: "/branch-role-assignments",
                icon: menuIcons["branch-role-assignments"],
                label: <Link to="/branch-role-assignments">Role theo chi nhánh</Link>,
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
              key: "/landing-pages",
              icon: menuIcons["landing-pages"],
              label: <Link to="/landing-pages">Landing pages</Link>,
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
  const selected = location.pathname === "/" ? "/" : `/${currentResource}`
  const defaultOpenKeys = [
    resourceToGroup[currentResource] ||
    (location.pathname === "/roles" || location.pathname === "/branch-role-assignments"
      ? "admin"
      : undefined),
    location.pathname.startsWith("/settings") ||
    location.pathname.startsWith("/landing-pages") ||
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
          <div className="brand-mark">TC</div>
          <div className="brand-copy">
            <Typography.Text className="brand-kicker">
              Aesthetic Clinic
            </Typography.Text>
            <Typography.Title level={4}>Thiện Chánh</Typography.Title>
          </div>
        </div>
        <Menu
          className="side-menu"
          defaultOpenKeys={defaultOpenKeys}
          items={items}
          selectedKeys={[selected]}
          mode="inline"
          theme="dark"
        />
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
            <div>
              <Typography.Text className="eyebrow">
                CMS vận hành viện thẩm mỹ
              </Typography.Text>
            </div>
          </Space>
          <Space>
            <Tag className="soft-tag">Live</Tag>
            <Button onClick={() => logout()}>Đăng xuất</Button>
          </Space>
        </Header>
        <Content className="app-content">{children}</Content>
      </Layout>
    </Layout>
  )
}
