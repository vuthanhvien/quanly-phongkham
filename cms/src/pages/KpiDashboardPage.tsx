import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Col, DatePicker, Form, Input, InputNumber, Modal, Progress, Row, Select, Space, Statistic, Table, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { formatNumberInput, parseNumberInput } from '../utils/numberInput';

type Cycle = { id: string; name: string; status: string; startDate: string; endDate: string };
type Metric = { id: string; code: string; name: string; unit: string; direction: string; sourceType: string };
type Staff = { id: string; code: string; fullName: string };
type Assignment = { id: string; assigneeId: string; assigneeName: string; targetValue: number; actualValue: number; completionPercent: number; status: string; metric?: Metric };
type Dashboard = { cycle: Cycle | null; cycles: Cycle[]; summary: { total: number; achieved: number; atRisk: number; averageCompletion: number }; assignments: Assignment[] };

const status = (value: string) => ({ achieved: <Tag color="success">Đạt</Tag>, at_risk: <Tag color="error">Rủi ro</Tag>, closed: <Tag>Đã chốt</Tag> }[value] || <Tag color="processing">Đang theo dõi</Tag>);
const formatNumber = (value?: number | string) => value === undefined || value === null || value === '' ? '' : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(Number(value));

export function KpiDashboardPage() {
  const [data, setData] = useState<Dashboard>();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [createKind, setCreateKind] = useState<'cycle' | 'metric' | 'assignment' | null>(null);
  const [checkin, setCheckin] = useState<Assignment | null>(null);
  const [form] = Form.useForm();
  const selectedMetricId = Form.useWatch('metricId', form);
  const selectedMetric = metrics.find((metric) => metric.id === selectedMetricId);
  const isCurrencyMetric = selectedMetric?.unit === 'currency';

  const load = async (cycleId?: string) => {
    setLoading(true);
    try {
      const [dashboard, metricList, staffList] = await Promise.all([api.get('/kpi/dashboard', { params: cycleId ? { cycleId } : undefined }), api.get('/kpi/metrics'), api.get('/records/staff', { params: { pageSize: 500 } })]);
      setData(dashboard.data.data); setMetrics(metricList.data.data); setStaff(staffList.data.data || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const open = (kind: typeof createKind) => { form.resetFields(); setCreateKind(kind); };
  const formatDateForApi = (value: unknown) => value && typeof (value as { format?: unknown }).format === 'function' ? (value as { format: (pattern: string) => string }).format('YYYY-MM-DD') : undefined;
  const submit = async (values: Record<string, unknown>) => {
    const endpoints = { cycle: '/kpi/cycles', metric: '/kpi/metrics', assignment: '/kpi/assignments' };
    if (!createKind) return;
    await api.post(endpoints[createKind], { ...values, startDate: formatDateForApi(values.startDate), endDate: formatDateForApi(values.endDate) }); setCreateKind(null); await load(data?.cycle?.id);
  };
  const submitCheckin = async (values: Record<string, unknown>) => { if (!checkin) return; await api.post(`/kpi/assignments/${checkin.id}/checkins`, { ...values, checkinDate: formatDateForApi(values.checkinDate) }); setCheckin(null); await load(data?.cycle?.id); };
  const unit = (metric?: Metric) => metric?.unit === 'percent' ? '%' : metric?.unit === 'currency' ? 'đ' : '';

  return <>
    <div className="page-header"><div><Typography.Title level={3} style={{ margin: 0 }}>KPI & Hiệu suất</Typography.Title></div><Space><Button onClick={() => open('metric')}>Thêm chỉ số</Button><Button onClick={() => open('cycle')}>Tạo chu kỳ</Button><Button type="primary" icon={<PlusOutlined />} disabled={!data?.cycle || metrics.length === 0} onClick={() => open('assignment')}>Giao KPI</Button></Space></div>
    <Space style={{ marginBottom: 16 }}><Typography.Text strong>Chu kỳ:</Typography.Text><Select value={data?.cycle?.id} loading={loading} style={{ minWidth: 240 }} onChange={(id) => void load(id)} options={(data?.cycles || []).map((c) => ({ value: c.id, label: `${c.name}${c.status === 'closed' ? ' · đã chốt' : ''}` }))} /></Space>
    {!data?.cycle ? <Card><Typography.Text type="secondary">Chưa có chu kỳ KPI. Hãy tạo chu kỳ đầu tiên để bắt đầu giao chỉ tiêu.</Typography.Text></Card> : <>
      <Row gutter={16} style={{ marginBottom: 16 }}><Col xs={12} md={6}><Card><Statistic title="KPI được giao" value={data.summary.total} /></Card></Col><Col xs={12} md={6}><Card><Statistic title="Đạt target" value={data.summary.achieved} valueStyle={{ color: '#389e0d' }} /></Card></Col><Col xs={12} md={6}><Card><Statistic title="Cần chú ý" value={data.summary.atRisk} valueStyle={{ color: '#cf1322' }} /></Card></Col><Col xs={12} md={6}><Card><Statistic title="Hoàn thành TB" value={data.summary.averageCompletion} suffix="%" /></Card></Col></Row>
      <Card title={data.cycle.name} extra={<Typography.Text type="secondary">{data.cycle.startDate} — {data.cycle.endDate}</Typography.Text>}><Table loading={loading} rowKey="id" pagination={{ pageSize: 20 }} dataSource={data.assignments} locale={{ emptyText: 'Chưa giao KPI nào trong chu kỳ này' }} columns={[{ title: 'Người nhận', dataIndex: 'assigneeName' }, { title: 'Chỉ số', render: (_, row: Assignment) => <><Typography.Text strong>{row.metric?.name}</Typography.Text><br /><Typography.Text type="secondary">{row.metric?.code} · {row.metric?.sourceType === 'manual' ? 'Nhập tay' : row.metric?.sourceType}</Typography.Text></> }, { title: 'Kết quả', render: (_, row: Assignment) => `${formatNumber(row.actualValue)}/${formatNumber(row.targetValue)} ${unit(row.metric)}` }, { title: 'Tiến độ', width: 230, render: (_, row: Assignment) => <Progress percent={Math.min(100, Math.round(row.completionPercent))} status={row.status === 'at_risk' ? 'exception' : undefined} format={() => `${row.completionPercent}%`} /> }, { title: 'Trạng thái', render: (_, row: Assignment) => status(row.status) }, { title: '', width: 110, render: (_, row: Assignment) => <Button size="small" disabled={data.cycle?.status === 'closed'} onClick={() => { form.resetFields(); form.setFieldsValue({ actualValue: row.actualValue }); setCheckin(row); }}>Cập nhật</Button> }]} /></Card>
    </>}
    <Modal title={createKind === 'cycle' ? 'Tạo chu kỳ KPI' : createKind === 'metric' ? 'Thêm chỉ số KPI' : 'Giao KPI'} open={Boolean(createKind)} onCancel={() => setCreateKind(null)} onOk={() => form.submit()} destroyOnHidden><Form form={form} layout="vertical" onFinish={submit}>
      {createKind === 'cycle' && <><Form.Item name="name" label="Tên chu kỳ" rules={[{ required: true }]}><Input placeholder="KPI tháng 08/2026" /></Form.Item><Row gutter={12}><Col span={12}><Form.Item name="startDate" label="Bắt đầu" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item></Col><Col span={12}><Form.Item name="endDate" label="Kết thúc" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item></Col></Row><Form.Item name="frequency" initialValue="monthly" label="Tần suất"><Select options={[{ value: 'weekly', label: 'Tuần' }, { value: 'monthly', label: 'Tháng' }, { value: 'quarterly', label: 'Quý' }, { value: 'yearly', label: 'Năm' }, { value: 'custom', label: 'Tùy chỉnh' }]} /></Form.Item></>}
      {createKind === 'metric' && <><Row gutter={12}><Col span={10}><Form.Item name="code" label="Mã KPI" rules={[{ required: true }]}><Input placeholder="SALES_REVENUE" /></Form.Item></Col><Col span={14}><Form.Item name="name" label="Tên chỉ số" rules={[{ required: true }]}><Input placeholder="Doanh thu thuần" /></Form.Item></Col></Row><Row gutter={12}><Col span={12}><Form.Item name="unit" initialValue="number" label="Đơn vị"><Select options={[{ value: 'number', label: 'Số lượng' }, { value: 'percent', label: 'Phần trăm' }, { value: 'currency', label: 'Tiền tệ' }, { value: 'duration', label: 'Thời gian' }]} /></Form.Item></Col><Col span={12}><Form.Item name="direction" initialValue="higher_is_better" label="Hướng tốt"><Select options={[{ value: 'higher_is_better', label: 'Càng cao càng tốt' }, { value: 'lower_is_better', label: 'Càng thấp càng tốt' }]} /></Form.Item></Col></Row><Form.Item name="sourceType" initialValue="manual" label="Nguồn kết quả"><Select options={[{ value: 'manual', label: 'Nhập tay' }, { value: 'import', label: 'Import file' }, { value: 'connector', label: 'Connector (tùy chọn)' }]} /></Form.Item></>}
      {createKind === 'assignment' && <><Form.Item name="cycleId" initialValue={data?.cycle?.id} hidden><Input /></Form.Item><Form.Item name="metricId" label="Chỉ số" rules={[{ required: true }]}><Select options={metrics.map((m) => ({ value: m.id, label: `${m.code} — ${m.name}` }))} /></Form.Item><Form.Item name="staffIds" label="Nhân viên" rules={[{ required: true, message: 'Chọn ít nhất một nhân viên nhận KPI' }]}><Select mode="multiple" showSearch optionFilterProp="label" placeholder="Chọn một hoặc nhiều nhân viên" options={staff.map((item) => ({ value: item.id, label: `${item.code} — ${item.fullName}` }))} /></Form.Item><Form.Item name="targetValue" label="Chỉ tiêu" rules={[{ required: true }]}><InputNumber min={0} addonAfter={isCurrencyMetric ? '₫' : undefined} formatter={isCurrencyMetric ? formatNumberInput : undefined} parser={isCurrencyMetric ? parseNumberInput : undefined} style={{ width: '100%' }} /></Form.Item><Form.Item name="weight" label="Trọng số" initialValue={1}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></>}
    </Form></Modal>
    <Modal title={checkin ? `Cập nhật — ${checkin.metric?.name}` : ''} open={Boolean(checkin)} onCancel={() => setCheckin(null)} onOk={() => form.submit()} destroyOnHidden><Form form={form} layout="vertical" onFinish={submitCheckin}><Form.Item name="actualValue" label="Kết quả thực tế" rules={[{ required: true }]}><InputNumber addonAfter={checkin?.metric?.unit === 'currency' ? '₫' : undefined} formatter={checkin?.metric?.unit === 'currency' ? formatNumberInput : undefined} parser={checkin?.metric?.unit === 'currency' ? parseNumberInput : undefined} style={{ width: '100%' }} /></Form.Item><Form.Item name="checkinDate" label="Ngày cập nhật"><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item><Form.Item name="comment" label="Ghi chú"><Input.TextArea rows={3} /></Form.Item></Form></Modal>
  </>;
}
