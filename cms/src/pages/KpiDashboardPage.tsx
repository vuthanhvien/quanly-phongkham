import { CalendarOutlined, CopyOutlined, DeleteOutlined, EditOutlined, ExportOutlined, ImportOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Col, DatePicker, Form, Grid, Input, InputNumber, message, Modal, Progress, Radio, Row, Select, Space, Statistic, Table, Tag, Typography, Upload } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { api } from '../api';
import { baseFields } from '../models';
import { formatNumberInput, parseNumberInput } from '../utils/numberInput';
import { currentLocalDate, parseClinicDateTime } from '../utils/datetime';
import { getCachedMasterData } from '../utils/masterDataCache';

type Cycle = { id: string; name: string; status: string; startDate: string; endDate: string; frequency?: string };
type Metric = { id: string; code: string; name: string; unit: string; direction: string; sourceType: string };
type Staff = { id: string; code: string; fullName: string };
type Department = { id: string; code: string; name: string };
type SourceSnapshot = { source?: string; filterStatus?: string; filters?: { field: string; operator: string; value: string }[]; dateFrom?: string; dateTo?: string; recordCount?: number };
type Assignment = { id: string; assigneeId: string; assigneeName: string; targetValue: number; actualValue: number; weight: number; completionPercent: number; status: string; metric?: Metric; sourceSnapshot?: SourceSnapshot };
type CheckinRecord = { id: string; source: string; referenceCode?: string; recordDate?: string; description?: string; actualValue: number };
type Checkin = { id: string; checkinDate: string; actualValue: number; comment?: string; createdAt: string; sourceSnapshot?: SourceSnapshot; records?: CheckinRecord[] };
type PreviewRecord = { id: string; referenceCode?: string; recordDate?: string; description?: string; actualValue: number };
type EmployeeKpi = { staffId: string; staffName: string; totalWeight: number; completionPercent: number; status: string; assignments: Assignment[] };
type DepartmentKpi = { departmentId: string; departmentName: string; totalWeight: number; completionPercent: number; status: string; assignments: Assignment[] };
type Dashboard = { cycle: Cycle | null; cycles: Cycle[]; summary: { total: number; achieved: number; atRisk: number; averageCompletion: number }; assignments: Assignment[]; employees: EmployeeKpi[]; departments: DepartmentKpi[] };
type KpiGroup = { groupId: string; groupName: string; totalWeight: number; completionPercent: number; status: string; assignments: Assignment[] };
type KpiGroupRow = Assignment & { group: KpiGroup; groupIndex: number; groupSize: number };

const kpiSourceOptions = [
  { label: 'Chăm sóc & vận hành', description: '', options: [{ value: 'tasks', label: 'Công việc / Tasks', description: 'Đếm số bản ghi công việc' }, { value: 'appointments', label: 'Lịch hẹn / Booking', description: 'Đếm lịch hẹn theo bác sĩ hoặc người phụ trách' }, { value: 'consultations', label: 'Khám tư vấn', description: 'Đếm lượt tư vấn theo bác sĩ/tư vấn viên' }, { value: 'treatments', label: 'Điều trị', description: 'Tổng số phiên đã hoàn thành (toàn cơ sở)' }, { value: 'service-orders', label: 'Đơn hàng dịch vụ', description: 'Tổng giá trị đơn hàng' }] },
  { label: 'Nhân sự & kinh doanh', description: '', options: [{ value: 'attendances', label: 'Chấm công', description: 'Tổng giờ làm đã chấm công' }, { value: 'leave-requests', label: 'Nghỉ phép', description: 'Tổng số ngày nghỉ đã duyệt' }, { value: 'leads', label: 'Khách hàng tiềm năng', description: 'Đếm lead theo người phụ trách' }, { value: 'commissions', label: 'Hoa hồng', description: 'Tổng hoa hồng theo nhân viên' }] },
  { label: 'Tài chính', description: '', options: [{ value: 'invoices', label: 'Hóa đơn', description: 'Tổng tiền đã thu' }, { value: 'expenses', label: 'Chi phí', description: 'Tổng chi phí theo nhân viên tạo/ghi nhận' }] },
];
const sourceFilterFields: Record<string, { value: string; label: string }[]> = {
  tasks: [{ value: 'status', label: 'Trạng thái' }, { value: 'title', label: 'Tiêu đề công việc' }],
  appointments: [{ value: 'status', label: 'Trạng thái' }, { value: 'type', label: 'Loại lịch hẹn' }],
  consultations: [{ value: 'status', label: 'Trạng thái' }],
  treatments: [{ value: 'status', label: 'Trạng thái' }, { value: 'name', label: 'Tên điều trị' }],
  'service-orders': [{ value: 'status', label: 'Trạng thái' }, { value: 'code', label: 'Mã đơn hàng' }, { value: 'serviceName', label: 'Tên dịch vụ' }],
  invoices: [{ value: 'status', label: 'Trạng thái' }, { value: 'code', label: 'Mã hóa đơn' }],
  attendances: [{ value: 'status', label: 'Trạng thái' }],
  'leave-requests': [{ value: 'status', label: 'Trạng thái' }, { value: 'leaveType', label: 'Loại nghỉ' }],
  leads: [{ value: 'status', label: 'Trạng thái' }, { value: 'source', label: 'Nguồn lead' }],
  commissions: [{ value: 'status', label: 'Trạng thái' }, { value: 'roleType', label: 'Vai trò' }],
  expenses: [{ value: 'category', label: 'Danh mục chi phí' }, { value: 'paymentMethod', label: 'Phương thức thanh toán' }],
};
const sourceFilterOperators = [{ value: 'eq', label: 'Bằng' }, { value: 'ne', label: 'Khác' }, { value: 'contains', label: 'Chứa' }, { value: 'in', label: 'Trong' }, { value: 'not_in', label: 'Không trong' }];

function SourceFilters({ source }: { source?: string }) {
  const fields = sourceFilterFields[source || ''] || [];
  const selectedFilters = Form.useWatch('filters') as { field?: string; operator?: string }[] | undefined;
  const selectedFilterSignature = JSON.stringify(selectedFilters || []);
  const [masterOptions, setMasterOptions] = useState<Record<string, { value: string; label: string }[]>>({});
  useEffect(() => {
    const selectFields = [...new Set((selectedFilters || []).map((filter) => filter?.field).filter((field): field is string => Boolean(field && baseFields[source || '']?.find((item) => item.key === field)?.type === 'select')))];
    if (!source || !selectFields.length) return;
    void Promise.all(selectFields.map(async (field) => {
      const configured = baseFields[source]?.find((item) => item.key === field)?.options || [];
      const rows = await getCachedMasterData(`master-data:${source}.${field}`, () => api.get('/master-data', { params: { group: `${source}.${field}` } }).then((response) => response.data.data || []));
      return [field, rows.length ? rows.map((row: { value: string; name: string }) => ({ value: row.value, label: row.name })) : configured.map((option) => typeof option === 'string' ? { value: option, label: option } : option)] as const;
    })).then((entries) => setMasterOptions((current) => ({ ...current, ...Object.fromEntries(entries) })));
  }, [source, selectedFilterSignature]);
  return <Form.Item label="Bộ lọc dữ liệu">
    <Form.List name="filters">
      {(filterRows, { add, remove }) => <div className="table-tab-filter-list">
        {filterRows.map((filter) => {
          const selectedField = selectedFilters?.[filter.name]?.field || '';
          const selectedOperator = selectedFilters?.[filter.name]?.operator || 'eq';
          const valueOptions = masterOptions[selectedField];
          return <div className="table-tab-filter-row" key={filter.key}>
          <Form.Item name={[filter.name, 'field']} rules={[{ required: true, message: 'Chọn trường' }]}>
            <Select disabled={!source} options={fields} placeholder="Trường" />
          </Form.Item>
          <Form.Item name={[filter.name, 'operator']} rules={[{ required: true, message: 'Chọn điều kiện' }]}>
            <Select options={sourceFilterOperators} placeholder="Điều kiện" />
          </Form.Item>
          <Form.Item name={[filter.name, 'value']} rules={[{ required: true, message: 'Nhập giá trị' }]}>
            {valueOptions ? <Select mode={['in', 'not_in'].includes(selectedOperator) ? 'multiple' : undefined} options={valueOptions} placeholder="Chọn giá trị" showSearch optionFilterProp="label" /> : <Input placeholder="Giá trị (dùng dấu phẩy cho nhiều giá trị)" />}
          </Form.Item>
          <Button aria-label="Xóa điều kiện lọc" danger icon={<MinusCircleOutlined />} type="text" onClick={() => remove(filter.name)} />
        </div>})}
        <Button disabled={!source} icon={<PlusOutlined />} type="dashed" onClick={() => add({ operator: 'eq' })}>Thêm điều kiện lọc</Button>
      </div>}
    </Form.List>
  </Form.Item>;
}

const status = (value: string) => ({ achieved: <Tag color="success">Đạt</Tag>, at_risk: <Tag color="error">Rủi ro</Tag>, closed: <Tag>Đã chốt</Tag> }[value] || <Tag color="processing">Đang theo dõi</Tag>);
const formatNumber = (value?: number | string) => value === undefined || value === null || value === '' ? '' : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(Number(value));
const flattenCheckins = (checkins: Checkin[]): Checkin[] => checkins.flatMap((checkin) => checkin.records?.length
  ? checkin.records.map((record) => ({ ...checkin, id: `${checkin.id}:${record.id}`, actualValue: record.actualValue, comment: [record.referenceCode, record.description].filter(Boolean).join(' · '), records: undefined, sourceSnapshot: undefined }))
  : [checkin]);

export function KpiDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<Dashboard>();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [createKind, setCreateKind] = useState<'cycle' | 'metric' | 'assignment' | null>(null);
  const [checkin, setCheckin] = useState<Assignment | null>(null);
  const [historyAssignment, setHistoryAssignment] = useState<Assignment | null>(null);
  const [editingCheckin, setEditingCheckin] = useState<Checkin | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [checkinsLoading, setCheckinsLoading] = useState(false);
  const [previewRecords, setPreviewRecords] = useState<PreviewRecord[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedPreviewRecordIds, setSelectedPreviewRecordIds] = useState<string[]>([]);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [metricsModalOpen, setMetricsModalOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<Cycle | null>(null);
  const [editingMetric, setEditingMetric] = useState<Metric | null>(null);
  const [form] = Form.useForm();
  const [cloneForm] = Form.useForm();
  const screens = Grid.useBreakpoint();
  const selectedMetricId = Form.useWatch('metricId', form);
  const recipientType = Form.useWatch('scopeType', form) || 'individual';
  const updateMode = 'system';
  const selectedSource = Form.useWatch('source', form);
  const selectedMetric = metrics.find((metric) => metric.id === selectedMetricId);
  const isCurrencyMetric = selectedMetric?.unit === 'currency';

  const load = async (cycleId?: string) => {
    setLoading(true);
    try {
      const [dashboard, metricList, staffList, departmentList] = await Promise.all([api.get('/kpi/dashboard', { params: cycleId ? { cycleId } : undefined }), api.get('/kpi/metrics'), api.get('/records/staff', { params: { pageSize: 500 } }), api.get('/records/departments', { params: { pageSize: 500 } })]);
      setData(dashboard.data.data); setMetrics(metricList.data.data); setStaff(staffList.data.data || []); setDepartments(departmentList.data.data || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const open = (kind: typeof createKind) => { form.resetFields(); if (kind === 'assignment') form.setFieldsValue({ scopeType: 'individual' }); setCreateKind(kind); };
  const openEditCycle = () => { if (!data?.cycle || data.cycle.status === 'closed') return; form.resetFields(); form.setFieldsValue({ name: data.cycle.name, startDate: parseClinicDateTime(data.cycle.startDate), endDate: parseClinicDateTime(data.cycle.endDate), frequency: data.cycle.frequency }); setEditingCycle(data.cycle); };
  const openEditMetric = (metric: Metric) => { form.resetFields(); form.setFieldsValue(metric); setEditingMetric(metric); };
  const formatDateForApi = (value: unknown) => value && typeof (value as { format?: unknown }).format === 'function' ? (value as { format: (pattern: string) => string }).format('YYYY-MM-DD') : undefined;
  const submit = async (values: Record<string, unknown>) => {
    const endpoints = { cycle: '/kpi/cycles', metric: '/kpi/metrics', assignment: '/kpi/assignments' };
    if (!createKind) return;
    await api.post(endpoints[createKind], { ...values, startDate: formatDateForApi(values.startDate), endDate: formatDateForApi(values.endDate) }); setCreateKind(null); await load(data?.cycle?.id);
  };
  const submitCycleEdit = async (values: Record<string, unknown>) => { if (!editingCycle) return; await api.patch(`/kpi/cycles/${editingCycle.id}`, { ...values, startDate: formatDateForApi(values.startDate), endDate: formatDateForApi(values.endDate) }); setEditingCycle(null); await load(editingCycle.id); };
  const submitMetricEdit = async (values: Record<string, unknown>) => { if (!editingMetric) return; await api.patch(`/kpi/metrics/${editingMetric.id}`, values); setEditingMetric(null); await load(data?.cycle?.id); };
  const submitCheckin = async (values: Record<string, unknown>) => { if (!checkin) return; await api.post(`/kpi/assignments/${checkin.id}/checkins`, { ...values, checkinDate: formatDateForApi(values.checkinDate) }); setCheckin(null); await load(data?.cycle?.id); };
  const openCheckin = async (assignment: Assignment) => {
    const source = assignment.sourceSnapshot;
    form.resetFields(); setPreviewRecords([]); setSelectedPreviewRecordIds([]); form.setFieldsValue({ checkinDate: parseClinicDateTime(currentLocalDate()), updateMode: 'system', source: source?.source, filters: source?.filters || (source?.filterStatus ? [{ field: 'status', operator: 'eq', value: source.filterStatus }] : undefined), dateFrom: source?.dateFrom ? parseClinicDateTime(source.dateFrom) : undefined, dateTo: source?.dateTo ? parseClinicDateTime(source.dateTo) : undefined }); setCheckin(assignment); setCheckinsLoading(true);
    try { const response = await api.get(`/kpi/assignments/${assignment.id}/checkins`); setCheckins(flattenCheckins(response.data.data || [])); }
    finally { setCheckinsLoading(false); }
  };
  const openHistory = async (assignment: Assignment) => {
    setHistoryAssignment(assignment); setCheckinsLoading(true);
    try { const response = await api.get(`/kpi/assignments/${assignment.id}/checkins`); setCheckins(response.data.data || []); }
    finally { setCheckinsLoading(false); }
  };
  const openEditCheckin = (record: Checkin) => { form.resetFields(); form.setFieldsValue({ actualValue: record.actualValue, checkinDate: parseClinicDateTime(record.checkinDate), comment: record.comment }); setEditingCheckin(record); };
  const submitCheckinEdit = async (values: Record<string, unknown>) => {
    if (!editingCheckin || !historyAssignment) return;
    await api.patch(`/kpi/checkins/${editingCheckin.id}`, { ...values, checkinDate: formatDateForApi(values.checkinDate) });
    setEditingCheckin(null); await openHistory(historyAssignment); await load(data?.cycle?.id);
  };
  const deleteCheckin = (record: Checkin) => Modal.confirm({ title: 'Xóa lần cập nhật KPI?', content: 'Dữ liệu nguồn của lần cập nhật này cũng sẽ được lưu trữ và tổng KPI được tính lại.', okText: 'Xóa', okButtonProps: { danger: true }, cancelText: 'Hủy', onOk: async () => { if (!historyAssignment) return; await api.delete(`/kpi/checkins/${record.id}`); await openHistory(historyAssignment); await load(data?.cycle?.id); } });
  const syncSource = async (values: Record<string, unknown>) => {
    if (!checkin) return;
    if (!previewRecords.length) { await previewSource(); return; }
    if (!selectedPreviewRecordIds.length) { message.warning('Chọn ít nhất một record để tạo KPI check-in'); return; }
    const response = await api.post(`/kpi/assignments/${checkin.id}/sync-source`, {
      source: values.source,
      filters: values.filters,
      dateFrom: formatDateForApi(values.dateFrom),
      dateTo: formatDateForApi(values.dateTo),
      selectedRecordIds: selectedPreviewRecordIds,
      recordValueOverrides: Object.fromEntries(previewRecords.map((record) => [record.id, record.actualValue])),
    });
    setCheckin(response.data.data); await load(data?.cycle?.id);
    const history = await api.get(`/kpi/assignments/${checkin.id}/checkins`); setCheckins(flattenCheckins(history.data.data || [])); setPreviewOpen(false); setPreviewRecords([]); setSelectedPreviewRecordIds([]);
  };
  const previewSource = async () => {
    if (!checkin) return;
    const values = await form.validateFields(['source', 'dateFrom', 'dateTo', 'filters']);
    setPreviewLoading(true);
    try {
      const response = await api.post(`/kpi/assignments/${checkin.id}/sync-source`, { source: values.source, filters: values.filters, dateFrom: formatDateForApi(values.dateFrom), dateTo: formatDateForApi(values.dateTo), preview: true });
      const records = response.data.data?.records || [];
      setPreviewRecords(records); setSelectedPreviewRecordIds(records.map((record: PreviewRecord) => record.id)); setPreviewOpen(true);
    } finally { setPreviewLoading(false); }
  };
  const openEditAssignment = (assignment: Assignment) => {
    form.resetFields(); form.setFieldsValue({ targetValue: assignment.targetValue, weight: assignment.weight }); setEditingAssignment(assignment);
  };
  const submitAssignmentEdit = async (values: Record<string, unknown>) => {
    if (!editingAssignment) return;
    await api.patch(`/kpi/assignments/${editingAssignment.id}`, values);
    setEditingAssignment(null); await load(data?.cycle?.id);
  };
  const deleteAssignment = async (assignment: Assignment) => {
    await api.delete(`/kpi/assignments/${assignment.id}`);
    await load(data?.cycle?.id);
  };
  const assignmentActions = (assignment: Assignment, includeDelete = false, direction?: 'vertical') => <Space direction={direction} size={direction ? 2 : 4}>
    <Button aria-label="Sửa KPI" icon={<EditOutlined />} size="small" disabled={data?.cycle?.status === 'closed'} onClick={() => openEditAssignment(assignment)} />
    <Button size="small" onClick={() => void openHistory(assignment)}>Chi tiết</Button>
    {includeDelete && <Button aria-label="Xóa KPI" danger icon={<DeleteOutlined />} size="small" disabled={data?.cycle?.status === 'closed'} onClick={() => void deleteAssignment(assignment)} />}
  </Space>;
  const openClone = () => { cloneForm.resetFields(); setCloneOpen(true); };
  const submitClone = async (values: { targetCycleId: string }) => {
    if (!data?.cycle) return;
    await api.post(`/kpi/cycles/${data.cycle.id}/clone-assignments`, values);
    setCloneOpen(false);
  };
  const exportCycle = async () => {
    if (!data?.cycle) return;
    const response = await api.get(`/kpi/cycles/${data.cycle.id}/export`);
    const rows = response.data.data?.assignments || [];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'KPI');
    XLSX.writeFile(workbook, `kpi-${data.cycle.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.xlsx`);
  };
  const importCycle = async (file: File) => {
    if (!data?.cycle) return false;
    const workbook = XLSX.read(await file.arrayBuffer());
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const assignments = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    const response = await api.post(`/kpi/cycles/${data.cycle.id}/import`, { assignments });
    message.success(`Đã import ${response.data.data?.imported || 0} KPI`); await load(data.cycle.id);
    return false;
  };
  const unit = (metric?: Metric) => metric?.unit === 'percent' ? '%' : metric?.unit === 'currency' ? 'đ' : metric?.unit === 'number' ? '' : metric?.unit || '';
  const metricColumns = [
    { title: 'Chỉ số KPI', render: (_: unknown, row: Assignment) => <><Typography.Text strong>{row.metric?.name}</Typography.Text><br /><Typography.Text type="secondary">{row.metric?.code} · Trọng số {row.weight || 0}</Typography.Text></> },
    { title: 'Kết quả', width: 230, render: (_: unknown, row: Assignment) => `${formatNumber(row.actualValue)}/${formatNumber(row.targetValue)} ${unit(row.metric)}` },
    { title: 'Tiến độ', width: 230, render: (_: unknown, row: Assignment) => <Progress percent={Math.min(100, Math.round(row.completionPercent))} status={row.status === 'at_risk' ? 'exception' : undefined} format={() => `${row.completionPercent}%`} /> },
    { title: 'Trạng thái', width: 120, render: (_: unknown, row: Assignment) => status(row.status) },
    { title: '', width: 150, render: (_: unknown, row: Assignment) => assignmentActions(row) },
  ];
  const flattenGroups = (groups: KpiGroup[]): KpiGroupRow[] => groups.flatMap((group) => group.assignments.map((assignment, groupIndex) => ({ ...assignment, group, groupIndex, groupSize: group.assignments.length })));
  const groupRows = flattenGroups((data?.employees || []).map((employee) => ({ groupId: employee.staffId, groupName: employee.staffName, totalWeight: employee.totalWeight, completionPercent: employee.completionPercent, status: employee.status, assignments: employee.assignments })));
  const departmentRows = flattenGroups((data?.departments || []).map((department) => ({ groupId: department.departmentId, groupName: department.departmentName, totalWeight: department.totalWeight, completionPercent: department.completionPercent, status: department.status, assignments: department.assignments })));
  const groupNameWithCode = (group: KpiGroup, groupLabel: string) => {
    const code = groupLabel === 'Nhân viên' ? staff.find((item) => item.id === group.groupId)?.code : departments.find((item) => item.id === group.groupId)?.code;
    return <><Typography.Text strong>{group.groupName}</Typography.Text>{code ? <><br /><Typography.Text type="secondary">{code}</Typography.Text></> : null}</>;
  };
  const groupedKpiColumns = (groupLabel: string) => !screens.md ? [
    { title: groupLabel, render: (_: unknown, row: KpiGroupRow) => <>{groupNameWithCode(row.group, groupLabel)}<br /><Typography.Text strong>{row.metric?.name}</Typography.Text><br /><Typography.Text type="secondary">{formatNumber(row.actualValue)}/{formatNumber(row.targetValue)} {unit(row.metric)} · KPI chung {row.group.completionPercent}%</Typography.Text></> },
    { title: 'Tiến độ', width: 118, render: (_: unknown, row: KpiGroupRow) => <><Progress percent={Math.min(100, Math.round(row.completionPercent))} size="small" showInfo={false} status={row.status === 'at_risk' ? 'exception' : undefined} /><Typography.Text type="secondary">{row.completionPercent}%</Typography.Text><br />{status(row.status)}</> },
    { title: '', width: 78, render: (_: unknown, row: KpiGroupRow) => assignmentActions(row, true, 'vertical') },
  ] : [
    { title: groupLabel, width: 230, render: (_: unknown, row: KpiGroupRow) => row.groupIndex === 0 ? { children: groupNameWithCode(row.group, groupLabel), props: { rowSpan: row.groupSize } } : { children: null, props: { rowSpan: 0 } } },
    { title: 'KPI chung', width: 250, render: (_: unknown, row: KpiGroupRow) => row.groupIndex === 0 ? { children: <><Progress percent={Math.min(100, Math.round(row.group.completionPercent))} status={row.group.status === 'at_risk' ? 'exception' : undefined} format={() => `${row.group.completionPercent}%`} /><Typography.Text type="secondary">Tổng trọng số: {row.group.totalWeight}</Typography.Text></>, props: { rowSpan: row.groupSize } } : { children: null, props: { rowSpan: 0 } } },
    { title: 'Chỉ số KPI', render: (_: unknown, row: KpiGroupRow) => <><Typography.Text strong>{row.metric?.name}</Typography.Text><br /><Typography.Text type="secondary">{row.metric?.code} · Trọng số {row.weight || 0}</Typography.Text></> },
    { title: 'Kết quả', width: 220, render: (_: unknown, row: KpiGroupRow) => `${formatNumber(row.actualValue)}/${formatNumber(row.targetValue)} ${unit(row.metric)}` },
    { title: 'Tiến độ', width: 220, render: (_: unknown, row: KpiGroupRow) => <Progress percent={Math.min(100, Math.round(row.completionPercent))} status={row.status === 'at_risk' ? 'exception' : undefined} format={() => `${row.completionPercent}%`} /> },
    { title: 'Trạng thái', width: 120, render: (_: unknown, row: KpiGroupRow) => status(row.status) },
    { title: '', width: 170, render: (_: unknown, row: KpiGroupRow) => assignmentActions(row, true) },
  ];

  return <div className="kpi-dashboard">
    <div className="page-header"><div><Typography.Title level={3} style={{ margin: 0 }}>KPI & Hiệu suất</Typography.Title></div><Space wrap className="kpi-actions"><Button aria-label="Thêm chỉ số" icon={<PlusOutlined />} title="Thêm chỉ số" onClick={() => open('metric')}><span className="kpi-action-label">Thêm chỉ số</span></Button><Button aria-label="Tạo chu kỳ" icon={<CalendarOutlined />} title="Tạo chu kỳ" onClick={() => open('cycle')}><span className="kpi-action-label">Tạo chu kỳ</span></Button><Button aria-label="Import check-in KPI" icon={<ImportOutlined />} title="Mở màn hình Import check-in KPI" onClick={() => navigate('/kpi/import-export')}><span className="kpi-action-label">Import</span></Button><Button aria-label="Sao chép KPI" icon={<CopyOutlined />} title="Sao chép KPI" disabled={!data?.cycle || (data.assignments || []).length === 0} onClick={openClone}><span className="kpi-action-label">Sao chép KPI</span></Button><Button aria-label="Giao KPI" type="primary" icon={<PlusOutlined />} title="Giao KPI" disabled={!data?.cycle || metrics.length === 0} onClick={() => open('assignment')}><span className="kpi-action-label">Giao KPI</span></Button></Space></div>
    <Space wrap style={{ marginBottom: 16 }}><Typography.Text strong>Chu kỳ:</Typography.Text><Select value={data?.cycle?.id} loading={loading} style={{ minWidth: 240 }} onChange={(id) => void load(id)} options={(data?.cycles || []).map((c) => ({ value: c.id, label: `${c.name}${c.status === 'closed' ? ' · đã chốt' : ''}` }))} /><Button icon={<EditOutlined />} disabled={!data?.cycle || data.cycle.status === 'closed'} onClick={openEditCycle}>Sửa chu kỳ</Button><Button onClick={() => setMetricsModalOpen(true)}>Quản lý chỉ số</Button></Space>
    {!data?.cycle ? <Card><Typography.Text type="secondary">Chưa có chu kỳ KPI. Hãy tạo chu kỳ đầu tiên để bắt đầu giao chỉ tiêu.</Typography.Text></Card> : <>
      <Row gutter={16} style={{ marginBottom: 16 }}><Col xs={12} md={6}><Card><Statistic title="Nhân viên có KPI" value={data.summary.total} /></Card></Col><Col xs={12} md={6}><Card><Statistic title="Đạt KPI chung" value={data.summary.achieved} valueStyle={{ color: '#389e0d' }} /></Card></Col><Col xs={12} md={6}><Card><Statistic title="Cần chú ý" value={data.summary.atRisk} valueStyle={{ color: '#cf1322' }} /></Card></Col><Col xs={12} md={6}><Card><Statistic title="KPI chung TB" value={data.summary.averageCompletion} suffix="%" /></Card></Col></Row>
      <Card className="kpi-table-card" title={`${data.cycle.name} · KPI theo nhân viên`} extra={<Typography.Text type="secondary">{data.cycle.startDate} — {data.cycle.endDate}</Typography.Text>}><Typography.Paragraph type="secondary">KPI chung được tính từ các chỉ số KPI con theo trọng số.</Typography.Paragraph><Table className="kpi-table" bordered loading={loading} rowKey="id" pagination={{ pageSize: 20 }} dataSource={groupRows} locale={{ emptyText: 'Chưa giao KPI nào trong chu kỳ này' }} columns={groupedKpiColumns('Nhân viên')} /></Card>
      {departmentRows.length > 0 && <Card className="kpi-table-card" style={{ marginTop: 16 }} title={`${data.cycle.name} · KPI theo phòng ban`}><Typography.Paragraph type="secondary">KPI chung phòng ban được tổng hợp từ các chỉ số con theo trọng số.</Typography.Paragraph><Table className="kpi-table" bordered rowKey="id" pagination={false} dataSource={departmentRows} columns={groupedKpiColumns('Phòng ban')} /></Card>}
    </>}
    <Modal title={createKind === 'cycle' ? 'Tạo chu kỳ KPI' : createKind === 'metric' ? 'Thêm chỉ số KPI' : 'Giao KPI'} open={Boolean(createKind)} onCancel={() => setCreateKind(null)} onOk={() => form.submit()} destroyOnHidden><Form form={form} layout="vertical" onFinish={submit}>
      {createKind === 'cycle' && <><Form.Item name="name" label="Tên chu kỳ" rules={[{ required: true }]}><Input placeholder="KPI tháng 08/2026" /></Form.Item><Row gutter={12}><Col span={12}><Form.Item name="startDate" label="Bắt đầu" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item></Col><Col span={12}><Form.Item name="endDate" label="Kết thúc" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item></Col></Row><Form.Item name="frequency" initialValue="monthly" label="Tần suất"><Select options={[{ value: 'weekly', label: 'Tuần' }, { value: 'monthly', label: 'Tháng' }, { value: 'quarterly', label: 'Quý' }, { value: 'yearly', label: 'Năm' }, { value: 'custom', label: 'Tùy chỉnh' }]} /></Form.Item></>}
      {createKind === 'metric' && <><Row gutter={12}><Col span={10}><Form.Item name="code" label="Mã KPI" rules={[{ required: true }]}><Input placeholder="SALES_REVENUE" /></Form.Item></Col><Col span={14}><Form.Item name="name" label="Tên chỉ số" rules={[{ required: true }]}><Input placeholder="Doanh thu thuần" /></Form.Item></Col></Row><Row gutter={12}><Col span={12}><Form.Item name="unit" initialValue="lượt" label="Đơn vị"><Input placeholder="Ví dụ: lượt, ca, giờ, khách, VNĐ" /></Form.Item></Col><Col span={12}><Form.Item name="direction" initialValue="higher_is_better" label="Hướng tốt"><Select options={[{ value: 'higher_is_better', label: 'Càng cao càng tốt' }, { value: 'lower_is_better', label: 'Càng thấp càng tốt' }]} /></Form.Item></Col></Row></>}
      {createKind === 'assignment' && <><Form.Item name="cycleId" initialValue={data?.cycle?.id} hidden><Input /></Form.Item><Form.Item name="metricId" label="Chỉ số" rules={[{ required: true }]}><Select options={metrics.map((m) => ({ value: m.id, label: `${m.code} — ${m.name}` }))} /></Form.Item><Form.Item name="scopeType" label="Giao KPI cho" initialValue="individual"><Radio.Group options={[{ value: 'individual', label: 'Nhân viên' }, { value: 'department', label: 'Phòng ban' }]} /></Form.Item>{recipientType === 'department' ? <Form.Item name="departmentIds" label="Phòng ban" rules={[{ required: true, message: 'Chọn ít nhất một phòng ban nhận KPI' }]}><Select mode="multiple" showSearch optionFilterProp="label" placeholder="Chọn một hoặc nhiều phòng ban" options={departments.map((item) => ({ value: item.id, label: `${item.code} — ${item.name}` }))} /></Form.Item> : <Form.Item name="staffIds" label="Nhân viên" rules={[{ required: true, message: 'Chọn ít nhất một nhân viên nhận KPI' }]}><Select mode="multiple" showSearch optionFilterProp="label" placeholder="Chọn một hoặc nhiều nhân viên" options={staff.map((item) => ({ value: item.id, label: `${item.code} — ${item.fullName}` }))} /></Form.Item>}<Form.Item name="targetValue" label="Chỉ tiêu" rules={[{ required: true }]}><InputNumber min={0} addonAfter={unit(selectedMetric) || undefined} formatter={isCurrencyMetric ? formatNumberInput : undefined} parser={isCurrencyMetric ? parseNumberInput : undefined} style={{ width: '100%' }} /></Form.Item><Form.Item name="weight" label="Trọng số" initialValue={1}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></>}
    </Form></Modal>
    <Modal title={editingAssignment ? `Chỉnh sửa KPI — ${editingAssignment.metric?.name}` : ''} open={Boolean(editingAssignment)} onCancel={() => setEditingAssignment(null)} onOk={() => form.submit()} destroyOnHidden><Form form={form} layout="vertical" onFinish={submitAssignmentEdit}><Typography.Paragraph type="secondary">Người nhận: <Typography.Text strong>{editingAssignment?.assigneeName}</Typography.Text>. Kết quả và lịch sử cập nhật được giữ nguyên.</Typography.Paragraph><Form.Item name="targetValue" label="Chỉ tiêu" rules={[{ required: true }]}><InputNumber min={0} addonAfter={editingAssignment?.metric?.unit === 'currency' ? '₫' : undefined} formatter={editingAssignment?.metric?.unit === 'currency' ? formatNumberInput : undefined} parser={editingAssignment?.metric?.unit === 'currency' ? parseNumberInput : undefined} style={{ width: '100%' }} /></Form.Item><Form.Item name="weight" label="Trọng số" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item><Form.Item name="note" label="Ghi chú"><Input.TextArea rows={3} /></Form.Item></Form></Modal>
    <Modal title={data?.cycle ? `Sao chép bộ KPI từ “${data.cycle.name}”` : 'Sao chép bộ KPI'} open={cloneOpen} onCancel={() => setCloneOpen(false)} onOk={() => cloneForm.submit()} destroyOnHidden><Form form={cloneForm} layout="vertical" onFinish={submitClone}><Typography.Paragraph type="secondary">Sao chép toàn bộ KPI đã giao, chỉ tiêu và trọng số sang chu kỳ đích. Kết quả và lịch sử cập nhật sẽ bắt đầu lại từ 0.</Typography.Paragraph><Form.Item name="targetCycleId" label="Chu kỳ đích" rules={[{ required: true, message: 'Chọn chu kỳ đích' }]}><Select showSearch optionFilterProp="label" placeholder="Chọn chu kỳ nhận bộ KPI" options={(data?.cycles || []).filter((cycle) => cycle.id !== data?.cycle?.id && cycle.status !== 'closed').map((cycle) => ({ value: cycle.id, label: `${cycle.name} (${cycle.startDate} — ${cycle.endDate})` }))} /></Form.Item></Form></Modal>
    <Modal className="kpi-history-modal" title={checkin ? `Lịch sử & cập nhật — ${checkin.metric?.name}` : ''} open={Boolean(checkin)} onCancel={() => { setCheckin(null); setCheckins([]); }} onOk={() => form.submit()} okText={updateMode === 'system' ? 'Đồng bộ' : 'Đồng ý'} destroyOnHidden width={screens.md ? 820 : 'calc(100vw - 24px)'}><Form form={form} layout="vertical" onFinish={updateMode === 'system' ? syncSource : submitCheckin}><Typography.Text type="secondary">Tổng KPI hiện tại: <Typography.Text strong>{formatNumber(checkin?.actualValue)} {unit(checkin?.metric)}</Typography.Text>.</Typography.Text><Table<Checkin> className="kpi-history-table" bordered style={{ margin: '16px 0' }} rowKey="id" size="small" loading={checkinsLoading} pagination={false} dataSource={checkins} locale={{ emptyText: 'Chưa có lần cập nhật nào' }} expandable={{ rowExpandable: (row) => Boolean(row.records?.length), expandedRowRender: (row) => <Table<CheckinRecord> bordered size="small" scroll={{ x: 640 }} rowKey="id" pagination={false} dataSource={row.records} columns={[{ title: 'Mã tham chiếu', dataIndex: 'referenceCode', width: 180, render: (value?: string) => value || '—' }, { title: 'Ngày record', dataIndex: 'recordDate', width: 130, render: (value?: string) => value ? value.split('-').reverse().join('/') : '—' }, { title: 'Mô tả', dataIndex: 'description', render: (value?: string) => value || '—' }, { title: 'Giá trị', dataIndex: 'actualValue', align: 'right', width: 150, render: (value: number) => `${formatNumber(value)} ${unit(checkin?.metric)}` }]} /> }} columns={[{ title: 'Ngày đồng bộ', dataIndex: 'checkinDate', width: 150, render: (value: string) => value ? value.split('-').reverse().join('/') : '-' }, { title: 'Dữ liệu', width: 170, render: (_: unknown, row: Checkin) => row.records?.length ? `${row.records.length} record` : `${formatNumber(row.actualValue)} ${unit(checkin?.metric)}` }, { title: 'Ghi chú', render: (_: unknown, row: Checkin) => row.sourceSnapshot ? `${row.comment || 'Đồng bộ dữ liệu'} · mở rộng để xem từng record` : row.comment || '—' }]} /><Form.Item name="updateMode" label="Cách cập nhật"><Radio.Group options={[{ value: 'manual', label: 'Nhập tay' }, { value: 'system', label: 'Lấy từ dữ liệu hệ thống' }]} /></Form.Item>{updateMode === 'system' ? <><Form.Item name="source" label="Nguồn dữ liệu" rules={[{ required: true, message: 'Chọn nguồn dữ liệu' }]}><Select showSearch optionFilterProp="label" placeholder="Chọn module nguồn" options={kpiSourceOptions} optionRender={(option) => <div><div>{option.data.label}</div><Typography.Text type="secondary">{option.data.description}</Typography.Text></div>} /></Form.Item><SourceFilters source={selectedSource} /><Row gutter={12}><Col span={12}><Form.Item name="dateFrom" label="Từ ngày"><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item></Col><Col span={12}><Form.Item name="dateTo" label="Đến ngày"><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item></Col></Row><Typography.Text type="secondary">Hệ thống tự gắn nhân viên của KPI vào dữ liệu nguồn khi model có trường nhân sự. Kết quả đồng bộ sẽ thay tổng hiện tại và lưu từng record vào lịch sử.</Typography.Text></> : <><Form.Item name="actualValue" label="Giá trị cộng thêm" rules={[{ required: true, message: 'Nhập giá trị cộng thêm' }]}><InputNumber min={0} addonAfter={checkin?.metric?.unit === 'currency' ? '₫' : undefined} formatter={checkin?.metric?.unit === 'currency' ? formatNumberInput : undefined} parser={checkin?.metric?.unit === 'currency' ? parseNumberInput : undefined} style={{ width: '100%' }} /></Form.Item><Form.Item name="checkinDate" label="Ngày cập nhật" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item><Form.Item name="comment" label="Ghi chú"><Input.TextArea rows={3} /></Form.Item></>}</Form></Modal>
    <Modal
      cancelText="Quay lại chỉnh bộ lọc"
      confirmLoading={previewLoading}
      okButtonProps={{ disabled: selectedPreviewRecordIds.length === 0 }}
      okText={`Tạo KPI check-in (${selectedPreviewRecordIds.length})`}
      open={previewOpen}
      title="Rà soát dữ liệu KPI"
      width={screens.md ? 860 : 'calc(100vw - 24px)'}
      onCancel={() => setPreviewOpen(false)}
      onOk={() => void form.submit()}
    >
      <Typography.Paragraph type="secondary">Chọn những record thực sự cần ghi nhận. Chỉ các mục được chọn mới tạo KPI check-in.</Typography.Paragraph>
      <Table<PreviewRecord>
        bordered
        dataSource={previewRecords}
        loading={previewLoading}
        pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (total) => `${total} record phù hợp` }}
        rowKey="id"
        rowSelection={{ selectedRowKeys: selectedPreviewRecordIds, onChange: (keys) => setSelectedPreviewRecordIds(keys.map(String)) }}
        scroll={{ x: 640 }}
        size="small"
        columns={[
          { title: 'Mã tham chiếu', dataIndex: 'referenceCode', width: 180, render: (value?: string) => value || '—' },
          { title: 'Ngày', dataIndex: 'recordDate', width: 130, render: (value?: string) => value ? value.split('-').reverse().join('/') : '—' },
          { title: 'Mô tả', dataIndex: 'description' },
          { title: `Giá trị${unit(checkin?.metric) ? ` (${unit(checkin?.metric)})` : ''}`, dataIndex: 'actualValue', align: 'right', width: 180, render: (value: number, row: PreviewRecord) => <InputNumber min={0} style={{ width: '100%' }} value={value} onChange={(nextValue) => setPreviewRecords((current) => current.map((record) => record.id === row.id ? { ...record, actualValue: Number(nextValue || 0) } : record))} /> },
        ]}
      />
    </Modal>
    <Modal destroyOnHidden okText="Lưu" open={Boolean(editingCycle)} title="Chỉnh sửa chu kỳ KPI" onCancel={() => setEditingCycle(null)} onOk={() => form.submit()}>
      <Form form={form} layout="vertical" onFinish={submitCycleEdit}>
        <Form.Item label="Tên chu kỳ" name="name" rules={[{ required: true }]}><Input /></Form.Item>
        <Row gutter={12}><Col span={12}><Form.Item label="Bắt đầu" name="startDate" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item></Col><Col span={12}><Form.Item label="Kết thúc" name="endDate" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item></Col></Row>
        <Form.Item label="Tần suất" name="frequency"><Select options={[{ value: 'weekly', label: 'Tuần' }, { value: 'monthly', label: 'Tháng' }, { value: 'quarterly', label: 'Quý' }, { value: 'yearly', label: 'Năm' }, { value: 'custom', label: 'Tùy chỉnh' }]} /></Form.Item>
      </Form>
    </Modal>
    <Modal destroyOnHidden okText="Lưu" open={Boolean(editingMetric)} title="Chỉnh sửa chỉ số KPI" onCancel={() => setEditingMetric(null)} onOk={() => form.submit()}>
      <Form form={form} layout="vertical" onFinish={submitMetricEdit}>
        <Form.Item label="Mã KPI"><Input disabled value={editingMetric?.code} /></Form.Item>
        <Form.Item label="Tên chỉ số" name="name" rules={[{ required: true }]}><Input /></Form.Item>
        <Row gutter={12}><Col span={12}><Form.Item label="Đơn vị" name="unit"><Input /></Form.Item></Col><Col span={12}><Form.Item label="Hướng tốt" name="direction"><Select options={[{ value: 'higher_is_better', label: 'Càng cao càng tốt' }, { value: 'lower_is_better', label: 'Càng thấp càng tốt' }]} /></Form.Item></Col></Row>
      </Form>
    </Modal>
    <Modal footer={null} open={metricsModalOpen} title="Quản lý chỉ số KPI" width={720} onCancel={() => setMetricsModalOpen(false)}>
      <Table<Metric> dataSource={metrics} pagination={{ pageSize: 10 }} rowKey="id" columns={[{ title: 'Mã', dataIndex: 'code', width: 150 }, { title: 'Chỉ số', dataIndex: 'name' }, { title: 'Đơn vị', dataIndex: 'unit', width: 100 }, { title: '', width: 60, render: (_value, row) => <Button aria-label="Sửa chỉ số KPI" icon={<EditOutlined />} size="small" onClick={() => openEditMetric(row)} /> }]} />
    </Modal>
    <Modal footer={null} open={Boolean(historyAssignment)} title={historyAssignment ? `Chi tiết KPI — ${historyAssignment.metric?.name || 'KPI'}` : 'Chi tiết KPI'} width={screens.md ? 860 : 'calc(100vw - 24px)'} onCancel={() => { setHistoryAssignment(null); setCheckins([]); }}>
      <div className="kpi-history-toolbar"><Typography.Text type="secondary">Tổng KPI hiện tại: <Typography.Text strong>{formatNumber(historyAssignment?.actualValue)} {unit(historyAssignment?.metric)}</Typography.Text></Typography.Text><Button type="primary" icon={<PlusOutlined />} disabled={data?.cycle?.status === 'closed'} onClick={() => { if (!historyAssignment) return; const assignment = historyAssignment; setHistoryAssignment(null); void openCheckin(assignment); }}>Thêm cập nhật</Button></div>
      <Table<Checkin> bordered dataSource={checkins} loading={checkinsLoading} pagination={{ pageSize: 10 }} rowKey="id" size="small" columns={[
        { title: 'Ngày cập nhật', dataIndex: 'checkinDate', width: 150, render: (value: string) => value ? value.split('-').reverse().join('/') : '—' },
        { title: 'Giá trị', dataIndex: 'actualValue', width: 150, render: (value: number) => `${formatNumber(value)} ${unit(historyAssignment?.metric)}` },
        { title: 'Ghi chú', dataIndex: 'comment', render: (value?: string) => value || '—' },
        { title: '', width: 96, render: (_value: unknown, row: Checkin) => <Space size={2}><Button aria-label="Sửa lần cập nhật" icon={<EditOutlined />} size="small" disabled={data?.cycle?.status === 'closed'} onClick={() => openEditCheckin(row)} /><Button aria-label="Xóa lần cập nhật" danger icon={<DeleteOutlined />} size="small" disabled={data?.cycle?.status === 'closed'} onClick={() => deleteCheckin(row)} /></Space> },
      ]} />
    </Modal>
    <Modal destroyOnHidden okText="Lưu thay đổi" open={Boolean(editingCheckin)} title="Chỉnh sửa lần cập nhật KPI" onCancel={() => setEditingCheckin(null)} onOk={() => form.submit()}>
      <Form form={form} layout="vertical" onFinish={submitCheckinEdit}>
        <Form.Item name="actualValue" label="Giá trị" rules={[{ required: true }]}><InputNumber min={0} addonAfter={unit(historyAssignment?.metric) || undefined} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="checkinDate" label="Ngày cập nhật" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="comment" label="Ghi chú"><Input.TextArea rows={3} /></Form.Item>
      </Form>
    </Modal>
  </div>;
}
