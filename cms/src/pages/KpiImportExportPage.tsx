import { DownloadOutlined, ImportOutlined, SaveOutlined, UploadOutlined } from '@ant-design/icons';
import { Alert, Button, Dropdown, Select, Space, Table, Typography, Upload, message } from 'antd';
import { useState } from 'react';
import { CmsBackButton } from '../components/CmsBackButton';
import * as XLSX from 'xlsx';
import { api } from '../api';

type CheckinRow = { checkinDate: string; cycleName?: string; metricCode: string; assigneeCode: string; assigneeName?: string; scopeType?: string; actualValue: number; unit?: string; comment?: string };
const checkinColumns = ['checkinDate', 'cycleName', 'metricCode', 'assigneeCode', 'assigneeName', 'scopeType', 'actualValue', 'unit', 'comment'] as const;
const template: CheckinRow[] = [{ checkinDate: '2026-09-01', cycleName: '', metricCode: 'CHAM_CONG', assigneeCode: 'NV001', assigneeName: '', scopeType: 'individual', actualValue: 1, unit: 'lần', comment: 'Import check-in KPI' }];

export function KpiImportExportPage() {
  const [rows, setRows] = useState<CheckinRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [sampleRows, setSampleRows] = useState(1);
  const download = (data: CheckinRow[], filename: string) => { const normalized = data.map((row) => Object.fromEntries(checkinColumns.map((key) => [key, row[key] ?? '']))); const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(normalized, { header: [...checkinColumns] }), 'KPI Check-ins'); XLSX.writeFile(book, filename); };
  const readFile = async (file: File) => { const book = XLSX.read(await file.arrayBuffer()); return XLSX.utils.sheet_to_json<CheckinRow>(book.Sheets[book.SheetNames[0]], { defval: '' }); };
  const importRows = async () => { if (!rows.length) return; setBusy(true); try { const response = await api.post('/kpi/checkins/import', { checkins: rows }); const errors = response.data.data?.errors || []; message.success(`Đã lưu ${response.data.data?.imported || 0} dòng`); if (errors.length) message.warning(`${errors.length} dòng không hợp lệ`); } finally { setBusy(false); } };
  const upload = <Upload accept=".xlsx,.xls" showUploadList={false} beforeUpload={(file) => { void readFile(file).then((data) => { setRows(data); message.success(`Đã đọc ${data.length} dòng`); }); return false; }}><span>Tải tệp lên</span></Upload>;
  return <>
    <div className="page-header"><Space align="center" size={12}><CmsBackButton to="/kpi" title="Quay lại KPI" /><Typography.Title className="record-import-title" level={3}>Import check-in KPI</Typography.Title></Space><Space wrap><Select aria-label="Số dòng dữ liệu mẫu" value={sampleRows} onChange={setSampleRows} style={{ width: 120 }} options={[{ value: 1, label: '1 dòng' }, { value: 10, label: '10 dòng' }, { value: 50, label: '50 dòng' }, { value: 100, label: '100 dòng' }]} /><Dropdown menu={{ items: [{ key: 'template', icon: <DownloadOutlined />, label: 'Tải file mẫu', onClick: () => download(Array.from({ length: sampleRows }, () => ({ ...template[0] })), 'kpi-checkin-template.xlsx') }, { key: 'export', icon: <ImportOutlined />, label: 'Xuất dữ liệu hiện có', onClick: () => void api.get('/kpi/checkins/export').then((response) => download(response.data.data || [], 'kpi-checkins-export.xlsx')) }, { key: 'upload', icon: <UploadOutlined />, label: upload }] }} trigger={['click']}><Button icon={<UploadOutlined />}>Tệp dữ liệu</Button></Dropdown><Button className="primary-glow" disabled={!rows.length} icon={<SaveOutlined />} loading={busy} type="primary" onClick={() => void importRows()}>Lưu dữ liệu</Button></Space></div>
      {rows.length ? <Table<CheckinRow> bordered dataSource={rows} rowKey={(_row, index) => String(index)} pagination={{ pageSize: 20 }} columns={[{ title: 'Ngày check-in', dataIndex: 'checkinDate' }, { title: 'Mã KPI', dataIndex: 'metricCode' }, { title: 'Mã người/phòng ban', dataIndex: 'assigneeCode' }, { title: 'Giá trị', dataIndex: 'actualValue' }, { title: 'Ghi chú', dataIndex: 'comment' }]} /> : <Alert className="record-import-empty" showIcon type="info" message="Chưa có dữ liệu xem trước" description="Sau khi tải tệp Excel lên, hệ thống sẽ hiển thị bảng xem trước tại đây trước khi lưu." />}
  </>;
}
