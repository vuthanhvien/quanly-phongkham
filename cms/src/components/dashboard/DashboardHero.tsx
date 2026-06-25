import { DollarOutlined } from "@ant-design/icons"
import { Typography } from "antd"
import { formatCompactCurrency } from "./utils"

export function DashboardHero({ revenueToday }: { revenueToday: number }) {
  return (
    <div className="hero-panel">
      <div>
        <Typography.Title level={2}>Tổng quan vận hành</Typography.Title>
        <Typography.Paragraph>
          Dashboard này đang ưu tiên số liệu vận hành trong ngày và các chỉ số cần theo dõi nhanh để tránh nhìn nhầm số tích lũy thành số hôm nay.
        </Typography.Paragraph>
      </div>
      <div className="hero-summary">
        <div className="hero-revenue">
          <DollarOutlined />
          <div>
            <Typography.Text>Thu hôm nay</Typography.Text>
            <Typography.Title level={3}>{formatCompactCurrency(revenueToday)}</Typography.Title>
          </div>
        </div>
      </div>
    </div>
  )
}
