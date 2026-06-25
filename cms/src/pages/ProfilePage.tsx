import { UserOutlined } from "@ant-design/icons"
import { useGetIdentity } from "@refinedev/core"
import { Avatar, Card, Descriptions, Typography } from "antd"

export function ProfilePage() {
  const { data: identity } = useGetIdentity<{
    id?: string | number
    name?: string
    email?: string
    role?: string
    branch?: string
  }>()

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 16px" }}>
      <Typography.Title level={3} style={{ marginBottom: 24 }}>
        Hồ sơ cá nhân
      </Typography.Title>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <Avatar
            icon={<UserOutlined />}
            size={64}
            style={{ background: "var(--app-primary)", color: "#180c12", flexShrink: 0 }}
          />
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {identity?.name || "—"}
            </Typography.Title>
            <Typography.Text type="secondary">{identity?.email || ""}</Typography.Text>
          </div>
        </div>
        <Descriptions column={1} bordered size="small">
          {identity?.id && (
            <Descriptions.Item label="ID">{identity.id}</Descriptions.Item>
          )}
          <Descriptions.Item label="Tên">{identity?.name || "—"}</Descriptions.Item>
          <Descriptions.Item label="Email">{identity?.email || "—"}</Descriptions.Item>
          {identity?.role && (
            <Descriptions.Item label="Vai trò">{identity.role}</Descriptions.Item>
          )}
          {identity?.branch && (
            <Descriptions.Item label="Chi nhánh">{identity.branch}</Descriptions.Item>
          )}
        </Descriptions>
      </Card>
    </div>
  )
}
