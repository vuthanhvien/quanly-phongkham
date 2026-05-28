import { Card, Col, Row, Space, Statistic, Tag, Typography } from 'antd';

export function DashboardPage() {
  return (
    <>
      <div className="hero-panel">
        <div>
          <Typography.Text className="eyebrow">Clinic command center</Typography.Text>
          <Typography.Title level={1}>Tổng quan vận hành</Typography.Title>
          <Typography.Paragraph>
            Theo dõi hành trình khách hàng, lịch hẹn, điều trị và dữ liệu vận hành trong một CMS có thể cấu hình theo nghiệp vụ.
          </Typography.Paragraph>
        </div>
        <Space wrap>
          <Tag className="soft-tag">Custom fields</Tag>
          <Tag className="soft-tag">Dynamic forms</Tag>
          <Tag className="soft-tag">Print templates</Tag>
        </Space>
      </div>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}><Card className="metric-card"><Statistic title="Khách đang chờ" value={0} /></Card></Col>
        <Col xs={24} md={6}><Card className="metric-card"><Statistic title="Đang tư vấn" value={0} /></Card></Col>
        <Col xs={24} md={6}><Card className="metric-card"><Statistic title="Đang điều trị" value={0} /></Card></Col>
        <Col xs={24} md={6}><Card className="metric-card"><Statistic title="Hậu phẫu" value={0} /></Card></Col>
      </Row>
      <Card className="glass-card spacious-card">
        <Typography.Title level={4}>Mạch dữ liệu tiếp theo</Typography.Title>
        Dữ liệu dashboard sẽ tổng hợp từ lịch hẹn, liệu trình, phiếu thu và kho theo từng chi nhánh.
      </Card>
    </>
  );
}
