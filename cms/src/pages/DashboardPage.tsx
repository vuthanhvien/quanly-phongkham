import {
  CalendarOutlined,
  DollarOutlined,
  ExperimentOutlined,
  MedicineBoxOutlined,
  RiseOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Card, Col, Progress, Row, Space, Statistic, Tag, Timeline, Typography } from 'antd';

const metrics = [
  { title: 'Khách đang chờ', value: 18, suffix: 'khách', icon: <TeamOutlined />, tone: 'rose', trend: '+12% tuần này' },
  { title: 'Đang tư vấn', value: 9, suffix: 'ca', icon: <MedicineBoxOutlined />, tone: 'gold', trend: '4 bác sĩ active' },
  { title: 'Đang điều trị', value: 27, suffix: 'liệu trình', icon: <ExperimentOutlined />, tone: 'violet', trend: '82% đúng lịch' },
  { title: 'Hậu phẫu', value: 14, suffix: 'case', icon: <SafetyCertificateOutlined />, tone: 'cyan', trend: '3 cần follow-up' },
];

const pipeline = [
  { label: 'Tư vấn', value: 74, color: '#e889ae' },
  { label: 'Phẫu thuật', value: 48, color: '#d7a45b' },
  { label: 'Liệu trình', value: 86, color: '#9b7cff' },
  { label: 'Hậu phẫu', value: 62, color: '#62d8d2' },
];

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
        <div className="hero-summary">
          <div className="hero-revenue">
            <DollarOutlined />
            <div>
              <Typography.Text>Doanh thu hôm nay</Typography.Text>
              <Typography.Title level={3}>128.5M</Typography.Title>
            </div>
          </div>
          <Space wrap>
            <Tag className="soft-tag">Custom fields</Tag>
            <Tag className="soft-tag">Dynamic forms</Tag>
            <Tag className="soft-tag">Print templates</Tag>
          </Space>
        </div>
      </div>
      <Row gutter={[16, 16]}>
        {metrics.map((metric) => (
          <Col key={metric.title} xs={24} md={12} xl={6}>
            <Card className={`metric-card metric-${metric.tone}`}>
              <div className="metric-topline">
                <div className="metric-icon">{metric.icon}</div>
                <Tag className="soft-tag">{metric.trend}</Tag>
              </div>
              <Statistic title={metric.title} value={metric.value} suffix={metric.suffix} />
            </Card>
          </Col>
        ))}
      </Row>
      <Row gutter={[16, 16]} className="dashboard-grid">
        <Col xs={24} lg={14}>
          <Card className="glass-card spacious-card" title="Luồng vận hành hôm nay">
            <div className="pipeline-list">
              {pipeline.map((item) => (
                <div className="pipeline-row" key={item.label}>
                  <div>
                    <Typography.Text strong>{item.label}</Typography.Text>
                    <Typography.Text type="secondary">{item.value}% kế hoạch</Typography.Text>
                  </div>
                  <Progress percent={item.value} strokeColor={item.color} trailColor="rgba(255,255,255,0.08)" />
                </div>
              ))}
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card className="glass-card spacious-card" title="Lịch ưu tiên">
            <Timeline
              items={[
                { dot: <CalendarOutlined />, color: 'pink', children: '09:00 - Tư vấn nâng mũi, phòng 2' },
                { dot: <MedicineBoxOutlined />, color: 'gold', children: '11:30 - Chuẩn bị hồ sơ phẫu thuật' },
                { dot: <RiseOutlined />, color: 'cyan', children: '15:00 - Follow-up khách VIP Diamond' },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}
