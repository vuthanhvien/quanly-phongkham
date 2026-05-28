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
  GiftOutlined,
  GoldOutlined,
  MedicineBoxOutlined,
  ProductOutlined,
  SettingOutlined,
  ShopOutlined,
  SolutionOutlined,
  TeamOutlined,
} from "@ant-design/icons"
import { useLogout } from "@refinedev/core"
import { Button, Layout, Menu, Space, Tag, Typography } from "antd"
import type { MenuProps } from "antd"
import { Link, useLocation } from "react-router-dom"
import { hasResourceAccess, hasScreenAccess } from "../access"
import { entityLabels } from "../models"

const { Header, Content, Sider } = Layout

const menuIcons: Record<string, React.ReactNode> = {
  "custom-fields": <AppstoreOutlined />,
  branches: <BankOutlined />,
  roles: <SettingOutlined />,
  "branch-role-assignments": <DeploymentUnitOutlined />,
  departments: <SolutionOutlined />,
  staff: <TeamOutlined />,
  "branch-permissions": <AuditOutlined />,
  "user-accounts": <SettingOutlined />,
  customers: <TeamOutlined />,
  "medical-episodes": <MedicineBoxOutlined />,
  appointments: <CalendarOutlined />,
  suppliers: <ShopOutlined />,
  products: <ProductOutlined />,
  "stock-batches": <DatabaseOutlined />,
  treatments: <ExperimentOutlined />,
  invoices: <FileDoneOutlined />,
  expenses: <DollarOutlined />,
  commissions: <GiftOutlined />,
}

const menuGroups = [
  {
    key: "front-office",
    label: "Lễ tân & CRM",
    icon: <TeamOutlined />,
    resources: ["customers", "appointments"],
  },
  {
    key: "clinical",
    label: "Chuyên môn điều trị",
    icon: <MedicineBoxOutlined />,
    resources: ["medical-episodes", "treatments"],
  },
  {
    key: "inventory",
    label: "Kho & mua hàng",
    icon: <DatabaseOutlined />,
    resources: ["suppliers", "products", "stock-batches"],
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
    location.pathname.startsWith("/custom-fields") ||
    location.pathname.startsWith("/audit-logs")
      ? "system-tools"
      : undefined,
  ].filter(Boolean) as string[]
  return (
    <Layout className="app-shell">
      <Sider className="app-sider" width={282} theme="dark">
        <div className="brand-card">
          <div className="brand-mark">TC</div>
          <div>
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
          <div>
            <Typography.Text className="eyebrow">
              CMS vận hành viện thẩm mỹ
            </Typography.Text>
            <Typography.Title level={3}>Không gian quản trị</Typography.Title>
          </div>
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
