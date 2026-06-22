import { Card, Col, Row, Statistic, Tag } from "antd"
import type { DashboardMetric } from "./types"

export function DashboardMetricGrid({ metrics }: { metrics: DashboardMetric[] }) {
  return (
    <Row gutter={[16, 16]}>
      {metrics.map((metric) => (
        <Col key={metric.title} xs={24} md={12} xl={6}>
          <Card className={`metric-card metric-${metric.tone}`}>
            <div className="metric-topline">
              <div className="metric-icon">{metric.icon}</div>
              <Tag className="soft-tag">{metric.trend}</Tag>
            </div>
            <Statistic
              title={metric.title}
              value={metric.value}
              suffix={metric.suffix}
            />
          </Card>
        </Col>
      ))}
    </Row>
  )
}
