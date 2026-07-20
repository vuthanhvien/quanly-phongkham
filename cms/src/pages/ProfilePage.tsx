import {
  ApartmentOutlined,
  BankOutlined,
  IdcardOutlined,
  MailOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons"
import { useGetIdentity } from "@refinedev/core"
import { Avatar, Card, Col, Empty, Row, Space, Tabs, Tag, Typography } from "antd"
import type { TabsProps } from "antd"
import type { ReactNode } from "react"
import { useEffect, useMemo, useState } from "react"
import { api } from "../api"

type Identity = {
  id?: string | number
  email?: string
  username?: string
  fullName?: string
  role?: string
  activeRole?: string
  branchId?: string
  staffId?: string
  branchPermissions?: Array<{
    branchId: string
    roleName?: string
    roleNames?: string[]
    roleKeys?: string[]
  }>
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
  joinedAt?: string
  dateOfBirth?: string
  gender?: string
  address?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  emergencyContactRelation?: string
  bankAccountNumber?: string
  bankAccountName?: string
  bankName?: string
  bankBranch?: string
  taxCode?: string
  dependants?: number
  note?: string
}

type BranchProfile = {
  id: string
  name?: string
  slug?: string
}

type DepartmentProfile = {
  id: string
  name?: string
  code?: string
}

const SYSTEM_ROLE_LABELS: Record<string, string> = {
  ADMIN: "Quản trị viên",
  STAFF: "Nhân viên",
  DOCTOR: "Bác sĩ",
}

const STAFF_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "green",
  INACTIVE: "default",
  OFFBOARDING: "orange",
}

function formatDate(value?: string) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("vi-VN")
}

function DetailItem({
  label,
  value,
  description,
}: {
  label: string
  value: ReactNode
  description?: string
}) {
  return (
    <div className="detail-item">
      <div className="detail-item-label">
        <Space direction="vertical" size={0}>
          <span>{label}</span>
          {description ? <Typography.Text type="secondary">{description}</Typography.Text> : null}
        </Space>
      </div>
      <div className="detail-item-content">{value}</div>
    </div>
  )
}

function ProfileInfoItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
}) {
  return (
    <div className="profile-link-item">
      {icon}
      <div>
        <Typography.Text type="secondary">{label}</Typography.Text>
        <div className="profile-link-value">{value}</div>
      </div>
    </div>
  )
}

export function ProfilePage() {
  const { data: identity } = useGetIdentity<Identity>()
  const [staff, setStaff] = useState<StaffProfile | null>(null)
  const [branch, setBranch] = useState<BranchProfile | null>(null)
  const [department, setDepartment] = useState<DepartmentProfile | null>(null)
  const [branchMap, setBranchMap] = useState<Record<string, string>>({})

  useEffect(() => {
    let active = true

    async function loadRelatedProfile() {
      if (!identity?.staffId && !identity?.branchId) {
        if (!active) return
        setStaff(null)
        setBranch(null)
        setDepartment(null)
        setBranchMap({})
        return
      }

      try {
        const [staffResponse, branchResponse, branchesResponse] = await Promise.all([
          identity?.staffId ? api.get(`/records/staff/${identity.staffId}`) : Promise.resolve(null),
          identity?.branchId ? api.get(`/records/branches/${identity.branchId}`) : Promise.resolve(null),
          api.get("/records/branches", { params: { pageSize: 200 } }),
        ])

        if (!active) return

        const nextStaff = (staffResponse?.data?.data ?? null) as StaffProfile | null
        const nextBranch = (branchResponse?.data?.data ?? null) as BranchProfile | null
        const nextBranchMap = Object.fromEntries(
          ((branchesResponse?.data?.data ?? []) as Array<Record<string, unknown>>).map((item) => [
            String(item.id),
            String(item.name || item.slug || item.id),
          ]),
        )

        const [departmentResponse] = await Promise.all([
          nextStaff?.departmentId ? api.get(`/records/departments/${nextStaff.departmentId}`) : Promise.resolve(null),
        ])

        if (!active) return

        setStaff(nextStaff)
        setBranch(nextBranch)
        setDepartment((departmentResponse?.data?.data ?? null) as DepartmentProfile | null)
        setBranchMap(nextBranchMap)
      } catch {
        if (!active) return
        setStaff(null)
        setBranch(null)
        setDepartment(null)
        setBranchMap({})
      }
    }

    void loadRelatedProfile()

    return () => {
      active = false
    }
  }, [identity?.branchId, identity?.staffId])

  const branchPermissions = identity?.branchPermissions || []
  const accountRoleLabel = SYSTEM_ROLE_LABELS[identity?.role || ""] || identity?.role || "—"
  const activeRoleLabel = SYSTEM_ROLE_LABELS[identity?.activeRole || ""] || identity?.activeRole || identity?.role || "—"
  const staffStatusColor = STAFF_STATUS_COLORS[staff?.status || ""] || "default"

  const loginMethods = [
    identity?.email ? `Email: ${identity.email}` : null,
    identity?.username ? `Tên đăng nhập: ${identity.username}` : null,
    staff?.code ? `Mã nhân viên: ${staff.code}` : null,
    staff?.phone ? `SĐT: ${staff.phone}` : null,
  ].filter(Boolean) as string[]

  const summaryItems = [
    { key: "username", icon: <UserOutlined />, label: "Tên đăng nhập", value: identity?.username || "—" },
    { key: "email", icon: <MailOutlined />, label: "Email đăng nhập", value: identity?.email || "—" },
    { key: "fullName", icon: <UserOutlined />, label: "Tên nội bộ", value: identity?.fullName || "—" },
    { key: "staffCode", icon: <IdcardOutlined />, label: "Mã nhân viên liên kết", value: staff?.code || "—" },
    { key: "department", icon: <ApartmentOutlined />, label: "Phòng ban", value: department?.name || "—" },
    { key: "branch", icon: <BankOutlined />, label: "Chi nhánh mặc định", value: branch?.name || branch?.slug || identity?.branchId || "—" },
    { key: "phone", icon: <PhoneOutlined />, label: "SĐT", value: staff?.phone || "—" },
    { key: "status", icon: <SafetyCertificateOutlined />, label: "Trạng thái", value: staff?.status || "Chưa có" },
    { key: "accountId", icon: <IdcardOutlined />, label: "ID tài khoản", value: identity?.id || "—" },
    {
      key: "loginMethods",
      icon: <SafetyCertificateOutlined />,
      label: "Có thể đăng nhập bằng",
      value:
        loginMethods.length > 0 ? (
          <Space size={[6, 6]} wrap>
            {loginMethods.map((item) => (
              <Tag key={item}>{item}</Tag>
            ))}
          </Space>
        ) : "—",
    },
  ]

  const profileTabs = useMemo<TabsProps["items"]>(() => {
    const staffOverviewChildren = staff ? (
      <div className="detail-grid-stacked">
        <DetailItem label="Họ tên nhân viên" value={staff.fullName || "—"} />
        <DetailItem label="Mã nhân viên" value={staff.code || "—"} />
        <DetailItem label="Chức vụ" value={staff.position || "—"} />
        <DetailItem label="Trạng thái" value={<Tag color={staffStatusColor}>{staff.status || "—"}</Tag>} />
        <DetailItem label="Phòng ban" value={department ? `${department.name || "—"}${department.code ? ` (${department.code})` : ""}` : (staff.departmentId || "—")} />
        <DetailItem label="Ngày vào làm" value={formatDate(staff.joinedAt)} />
        <DetailItem label="Ngày sinh" value={formatDate(staff.dateOfBirth)} />
        <DetailItem label="Giới tính" value={staff.gender || "—"} />
        <DetailItem label="Địa chỉ" value={staff.address || "—"} />
        <DetailItem label="Ghi chú" value={staff.note || "—"} />
      </div>
    ) : (
      <Empty description="Tài khoản này chưa liên kết với hồ sơ nhân viên." image={Empty.PRESENTED_IMAGE_SIMPLE} />
    )

    const contactChildren = staff ? (
      <div className="detail-grid-stacked">
        <DetailItem label="Email công việc" value={staff.email || "—"} />
        <DetailItem label="Số điện thoại" value={staff.phone || "—"} />
        <DetailItem label="Liên hệ khẩn cấp" value={staff.emergencyContactName || "—"} />
        <DetailItem label="Quan hệ" value={staff.emergencyContactRelation || "—"} />
        <DetailItem label="SĐT khẩn cấp" value={staff.emergencyContactPhone || "—"} />
      </div>
    ) : (
      <Empty description="Chưa có thông tin liên hệ nhân viên." image={Empty.PRESENTED_IMAGE_SIMPLE} />
    )

    const financeChildren = staff ? (
      <div className="detail-grid-stacked">
        <DetailItem label="Ngân hàng" value={[staff.bankName, staff.bankBranch].filter(Boolean).join(" · ") || "—"} />
        <DetailItem label="Số tài khoản" value={staff.bankAccountNumber || "—"} />
        <DetailItem label="Chủ tài khoản" value={staff.bankAccountName || "—"} />
        <DetailItem label="Mã số thuế" value={staff.taxCode || "—"} />
        <DetailItem label="Số người phụ thuộc" value={staff.dependants ?? "—"} />
      </div>
    ) : (
      <Empty description="Chưa có thông tin tài chính nhân viên." image={Empty.PRESENTED_IMAGE_SIMPLE} />
    )

    const permissionsChildren = (
      <div className="detail-grid-stacked">
        <DetailItem label="Chi nhánh mặc định tài khoản" value={branch?.name || branch?.slug || identity?.branchId || "—"} />
        <DetailItem label="Vai trò hệ thống" value={accountRoleLabel} />
        <DetailItem label="Vai trò hiện tại" value={activeRoleLabel} />
        <DetailItem label="Số vai trò theo chi nhánh" value={branchPermissions.length || 0} />
        {branchPermissions.length > 0 ? (
          <div className="profile-branch-roles">
            {branchPermissions.map((permission) => (
              <div key={`${permission.branchId}-${permission.roleName || permission.roleKeys?.join(",") || "role"}`} className="profile-branch-role-card">
                <Typography.Text strong>{branchMap[permission.branchId] || permission.branchId}</Typography.Text>
                <Space size={[6, 6]} wrap>
                  {(permission.roleNames || permission.roleKeys || [permission.roleName]).filter(Boolean).map((role) => (
                    <Tag key={String(role)} color="blue">
                      {role}
                    </Tag>
                  ))}
                </Space>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    )

    return [
      { key: "staff", label: "Nhân sự", children: staffOverviewChildren },
      { key: "contact", label: "Liên hệ", children: contactChildren },
      { key: "finance", label: "Ngân hàng & thuế", children: financeChildren },
      { key: "permissions", label: "Chi nhánh & quyền", children: permissionsChildren },
    ]
  }, [
    accountRoleLabel,
    activeRoleLabel,
    branch?.name,
    branch?.slug,
    branchMap,
    branchPermissions,
    department,
    identity?.branchId,
    staff,
    staffStatusColor,
  ])

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <div className="page-header">
        <div>
          <Typography.Title level={3} style={{ marginBottom: 4 }}>
            Hồ sơ cá nhân
          </Typography.Title>
          <Typography.Paragraph style={{ margin: 0 }}>
            Bên trái là thông tin tài khoản, bên phải là các tab hồ sơ liên kết theo nhân viên và phân quyền.
          </Typography.Paragraph>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={7}>
          <div className="detail-right-stack profile-left-stack">
            <Card className="glass-card detail-card profile-account-card">
              <div className="profile-account-header">
                <Avatar
                  icon={<UserOutlined />}
                  size={72}
                  style={{ background: "var(--app-primary)", color: "#180c12", flexShrink: 0 }}
                />
                <div className="profile-account-copy">
                  <Typography.Text className="eyebrow">Thông tin tài khoản</Typography.Text>
                  <Typography.Title level={4} style={{ margin: "4px 0 2px" }}>
                    {identity?.username || identity?.email || "—"}
                  </Typography.Title>
                  <Typography.Text type="secondary">{identity?.email || "—"}</Typography.Text>
                </div>
              </div>

              <Space size={[8, 8]} wrap style={{ marginBottom: 16 }}>
                <Tag color="blue">{accountRoleLabel}</Tag>
                <Tag color="purple">{activeRoleLabel}</Tag>
                {staff ? <Tag color={staffStatusColor}>{staff.status || "Đã liên kết"}</Tag> : <Tag>Chưa liên kết nhân viên</Tag>}
              </Space>

              <div className="profile-link-list">
                {summaryItems.map((item) => (
                  <ProfileInfoItem key={item.key} icon={item.icon} label={item.label} value={item.value} />
                ))}
              </div>
            </Card>
          </div>
        </Col>

        <Col xs={24} xl={17}>
          <Card className="glass-card detail-card detail-tabs-card profile-tabs-card">
            <Tabs items={profileTabs} />
          </Card>
        </Col>
      </Row>
    </Space>
  )
}
