import { Card, Col, Progress, Row, Typography } from "antd"
import type { DashboardPipeline, QuickStat } from "./types"

export function DashboardOperationsSection({
  pipeline,
  quickStats,
}: {
  pipeline: DashboardPipeline[]
  quickStats: QuickStat[]
}) {
  return (
    <Row gutter={[16, 16]} className="dashboard-grid">
      <Col xs={24} lg={14}>
        <Card
          className="glass-card spacious-card"
          title="Nhịp vận hành trong ngày"
        >
          <div className="pipeline-list">
            {pipeline.map((item) => (
              <div className="pipeline-row" key={item.label}>
                <div>
                  <Typography.Text strong>{item.label}</Typography.Text>
                  <Typography.Text type="secondary">
                    {item.count.toLocaleString("vi-VN")} phát sinh
                  </Typography.Text>
                </div>
                <Progress
                  percent={item.value}
                  strokeColor={item.color}
                  trailColor="rgba(255,255,255,0.08)"
                />
              </div>
            ))}
          </div>
        </Card>
      </Col>
      <Col xs={24} lg={10}>
        <Card className="glass-card spacious-card" title="Chỉ số cần chú ý">
          <div className="dashboard-mini-grid">
            {quickStats.map((item) => (
              <div className="dashboard-mini-card" key={item.label}>
                <Typography.Text type="secondary">{item.label}</Typography.Text>
                <Typography.Title level={4}>{item.value}</Typography.Title>
                <Typography.Text type="secondary">{item.hint}</Typography.Text>
              </div>
            ))}
          </div>
        </Card>
      </Col>
    </Row>
  )
}
