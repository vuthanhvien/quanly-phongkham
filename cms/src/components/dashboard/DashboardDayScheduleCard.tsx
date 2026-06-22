import { CalendarOutlined, RiseOutlined } from "@ant-design/icons"
import { Card, Col, List, Row } from "antd"
import type { DashboardEvent } from "./types"
import { formatEventTime } from "./utils"

export function DashboardDayScheduleCard({
  selectedDateLabel,
  selectedEvents,
}: {
  selectedDateLabel: string
  selectedEvents: DashboardEvent[]
}) {
  return (
    <Row gutter={[16, 16]} className="dashboard-grid">
      <Col xs={24}>
        <Card
          className="glass-card spacious-card"
          title={`Lịch ngày ${selectedDateLabel}`}
        >
          <List
            locale={{ emptyText: "Chưa có lịch trong ngày" }}
            dataSource={selectedEvents}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  avatar={item.type === "appointment" ? <CalendarOutlined /> : <RiseOutlined />}
                  title={item.title}
                  description={`${formatEventTime(item.start, item.end)}${item.meta ? ` | ${item.meta}` : ""}`}
                />
              </List.Item>
            )}
          />
        </Card>
      </Col>
    </Row>
  )
}
