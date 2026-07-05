import { UserOutlined } from "@ant-design/icons"
import { useGetIdentity } from "@refinedev/core"
import { Avatar, Card, Descriptions, Space, Typography } from "antd"
import { useEffect, useState } from "react"
import { api } from "../api"

type Identity = {
  id?: string | number
  email?: string
  fullName?: string
  role?: string
  activeRole?: string
  branchId?: string
  staffId?: string
}

type StaffProfile = {
  id: string
  code?: string
  fullName?: string
  email?: string
  phone?: string
  position?: string
  departmentId?: string
  status?: string
}

type BranchProfile = {
  id: string
  name?: string
  slug?: string
}

export function ProfilePage() {
  const { data: identity } = useGetIdentity<Identity>()
  const [staff, setStaff] = useState<StaffProfile | null>(null)
  const [branch, setBranch] = useState<BranchProfile | null>(null)

  useEffect(() => {
    let active = true

    async function loadRelatedProfile() {
      if (!identity?.staffId && !identity?.branchId) {
        if (!active) return
        setStaff(null)
        setBranch(null)
        return
      }

      try {
        const [staffResponse, branchResponse] = await Promise.all([
          identity?.staffId ? api.get(`/records/staff/${identity.staffId}`) : Promise.resolve(null),
          identity?.branchId ? api.get(`/records/branches/${identity.branchId}`) : Promise.resolve(null),
        ])

        if (!active) return

        setStaff((staffResponse?.data?.data ?? null) as StaffProfile | null)
        setBranch((branchResponse?.data?.data ?? null) as BranchProfile | null)
      } catch {
        if (!active) return
        setStaff(null)
        setBranch(null)
      }
    }

    void loadRelatedProfile()

    return () => {
      active = false
    }
  }, [identity?.branchId, identity?.staffId])

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 16px" }}>
      <Typography.Title level={3} style={{ marginBottom: 24 }}>
        Hồ sơ cá nhân
      </Typography.Title>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <Avatar
              icon={<UserOutlined />}
              size={64}
              style={{ background: "var(--app-primary)", color: "#180c12", flexShrink: 0 }}
            />
            <div>
              <Typography.Text type="secondary">Tài khoản đăng nhập</Typography.Text>
              <Typography.Title level={4} style={{ margin: 0 }}>
                {identity?.email || "—"}
              </Typography.Title>
            </div>
          </div>
          <Descriptions column={1} bordered size="small">
            {identity?.id && (
              <Descriptions.Item label="ID">{identity.id}</Descriptions.Item>
            )}
            <Descriptions.Item label="Email">{identity?.email || "—"}</Descriptions.Item>
            <Descriptions.Item label="Vai trò hệ thống">{identity?.role || "—"}</Descriptions.Item>
            <Descriptions.Item label="Vai trò hiện tại">{identity?.activeRole || identity?.role || "—"}</Descriptions.Item>
            <Descriptions.Item label="Chi nhánh mặc định">
              {branch?.name || branch?.slug || identity?.branchId || "—"}
            </Descriptions.Item>
          </Descriptions>
        </Card>
        <Card title="Nhân viên liên kết">
          {staff ? (
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Nhân viên">
                {staff.fullName || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Mã nhân viên">
                {staff.code || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Chức vụ">
                {staff.position || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Email công việc">
                {staff.email || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">
                {staff.phone || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                {staff.status || "—"}
              </Descriptions.Item>
            </Descriptions>
          ) : (
            <Typography.Text type="secondary">
              Tài khoản này chưa liên kết với hồ sơ nhân viên.
            </Typography.Text>
          )}
        </Card>
      </Space>
    </div>
  )
}
