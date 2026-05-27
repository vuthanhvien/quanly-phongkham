import { Card, Col, Row, Statistic, Typography } from 'antd';

export function DashboardPage() {
  return (
    <>
      <Typography.Title level={2}>Tổng quan vận hành</Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}><Card><Statistic title="Khách đang chờ" value={0} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Đang tư vấn" value={0} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Đang điều trị" value={0} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Hậu phẫu" value={0} /></Card></Col>
      </Row>
      <Card style={{ marginTop: 20 }}>
        Dữ liệu dashboard sẽ tổng hợp từ lịch hẹn, liệu trình, phiếu thu và kho theo từng chi nhánh.
      </Card>
    </>
  );
}

