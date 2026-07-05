import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  LogoutOutlined,
  SolutionOutlined,
} from "@ant-design/icons"
import { Button, Card, Col, Row, Space, Tag, Typography } from "antd"

type StaffSectionData = {
  staffName: string
  position?: string
  departmentName?: string
  branchName?: string
  todayShift?: {
    label?: string
    time?: string
    status?: string
  }
  todayAttendance?: {
    checkIn?: string
    checkOut?: string
    statusLabel?: string
  }
  latestLeave?: {
    dateLabel?: string
    typeLabel?: string
    statusLabel?: string
  }
  pendingLeaveCount: number
  monthAttendanceCount: number
}

export function DashboardStaffSection({
  data,
  actionLoading,
  canCreateAttendance,
  canUpdateAttendance,
  canCreateLeaveRequest,
  onCheckIn,
  onCheckOut,
  onOpenLeaveRequest,
}: {
  data: StaffSectionData
  actionLoading?: "checkin" | "checkout" | undefined
  canCreateAttendance: boolean
  canUpdateAttendance: boolean
  canCreateLeaveRequest: boolean
  onCheckIn: () => void
  onCheckOut: () => void
  onOpenLeaveRequest: () => void
}) {
  const hasCheckedIn = Boolean(data.todayAttendance?.checkIn)
  const hasCheckedOut = Boolean(data.todayAttendance?.checkOut)

  return (
    <Row gutter={[16, 16]} className="dashboard-grid">
      <Col xs={24} lg={16}>
        <Card className="glass-card spacious-card staff-home-hero-card">
          <div className="staff-home-hero">
            <div className="staff-home-main">
              <div className="staff-home-mainhead">
                <Typography.Text className="eyebrow">Dành cho nhân viên</Typography.Text>
                <Typography.Title level={3} style={{ margin: "6px 0 6px" }}>
                  {data.staffName}
                </Typography.Title>
                <Typography.Text type="secondary">
                  {[data.position, data.departmentName].filter(Boolean).join(" · ") || "Tài khoản nhân viên"}
                </Typography.Text>
              </div>

              <div className="staff-home-statusline">
                <div className="staff-home-primary-status">
                  <Typography.Text type="secondary">Chấm công hôm nay</Typography.Text>
                  <Typography.Title level={4} style={{ margin: "6px 0 4px" }}>
                    {data.todayAttendance?.checkIn || "Chưa check-in"}
                  </Typography.Title>
                  <Typography.Text type="secondary">
                    {data.todayAttendance?.checkOut ? `Đã check-out lúc ${data.todayAttendance.checkOut}` : "Bạn có thể bắt đầu thao tác từ đây"}
                  </Typography.Text>
                </div>
                <Space size={[8, 8]} wrap>
                  {data.todayShift?.label ? <Tag color="blue">{data.todayShift.label}</Tag> : <Tag>Chưa có ca hôm nay</Tag>}
                  {data.todayAttendance?.statusLabel ? <Tag color="green">{data.todayAttendance.statusLabel}</Tag> : null}
                  {data.pendingLeaveCount > 0 ? <Tag color="orange">{data.pendingLeaveCount} đơn nghỉ chờ duyệt</Tag> : null}
                </Space>
              </div>

              <div className="staff-home-actions">
                <Button
                  className="primary-glow"
                  disabled={!canCreateAttendance || hasCheckedIn}
                  icon={<CheckCircleOutlined />}
                  loading={actionLoading === "checkin"}
                  type="primary"
                  onClick={onCheckIn}
                >
                  {hasCheckedIn ? "Đã check-in" : "Check-in"}
                </Button>
                <Button
                  disabled={!canUpdateAttendance || !hasCheckedIn || hasCheckedOut}
                  icon={<LogoutOutlined />}
                  loading={actionLoading === "checkout"}
                  onClick={onCheckOut}
                >
                  {hasCheckedOut ? "Đã check-out" : "Check-out"}
                </Button>
                <Button
                  disabled={!canCreateLeaveRequest}
                  icon={<CalendarOutlined />}
                  onClick={onOpenLeaveRequest}
                >
                  Xin nghỉ
                </Button>
              </div>
            </div>

            <div className="staff-home-side">
              <div className="staff-home-sidecard">
                <Typography.Text type="secondary">Ca làm hôm nay</Typography.Text>
                <Typography.Title level={4}>{data.todayShift?.label || "Chưa có"}</Typography.Title>
                <Typography.Text type="secondary">{data.todayShift?.time || "Chưa có lịch làm việc hôm nay"}</Typography.Text>
              </div>
              <div className="staff-home-sidecard">
                <Typography.Text type="secondary">Đơn nghỉ gần nhất</Typography.Text>
                <Typography.Title level={4}>{data.latestLeave?.typeLabel || "Chưa có"}</Typography.Title>
                <Typography.Text type="secondary">
                  {[data.latestLeave?.dateLabel, data.latestLeave?.statusLabel].filter(Boolean).join(" · ") || "Chưa phát sinh đơn nghỉ"}
                </Typography.Text>
              </div>
            </div>
          </div>
        </Card>
      </Col>
      <Col xs={24} lg={8}>
        <div className="staff-home-summary">
          <div className="dashboard-mini-card staff-home-summary-card">
            <Space align="start" size={10}>
              <ClockCircleOutlined className="staff-home-summary-icon" />
              <div>
                <Typography.Text type="secondary">Ngày công tháng này</Typography.Text>
                <Typography.Title level={4}>{data.monthAttendanceCount}</Typography.Title>
                <Typography.Text type="secondary">Bản ghi chấm công đã ghi nhận</Typography.Text>
              </div>
            </Space>
          </div>
          <div className="dashboard-mini-card staff-home-summary-card">
            <Space align="start" size={10}>
              <EnvironmentOutlined className="staff-home-summary-icon" />
              <div>
                <Typography.Text type="secondary">Chi nhánh làm việc</Typography.Text>
                <Typography.Title level={4}>{data.branchName || "Chưa cập nhật"}</Typography.Title>
                <Typography.Text type="secondary">Thông tin đang gắn với tài khoản</Typography.Text>
              </div>
            </Space>
          </div>
          <div className="dashboard-mini-card staff-home-summary-card">
            <Space align="start" size={10}>
              <SolutionOutlined className="staff-home-summary-icon" />
              <div>
                <Typography.Text type="secondary">Bộ phận hiện tại</Typography.Text>
                <Typography.Title level={4}>{data.departmentName || "Chưa cập nhật"}</Typography.Title>
                <Typography.Text type="secondary">Theo hồ sơ nhân sự liên kết</Typography.Text>
              </div>
            </Space>
          </div>
        </div>
      </Col>
    </Row>
  )
}
