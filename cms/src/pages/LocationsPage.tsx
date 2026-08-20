import { DatabaseOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, Layout, Modal, Popconfirm, Space, Table, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { baseFields, normalizeSelectOption } from '../models'

type MasterData = { id: string; group: string; name: string; value: string; parentValue?: string; sortOrder: number; isActive: boolean }
const MODULES = [
  { group: 'LOCATION_COUNTRY', label: 'Country' },
  { group: 'LOCATION_CITY', label: 'City' },
  { group: 'LOCATION_WARD', label: 'Ward' },
]

const RESOURCE_LABELS: Record<string, string> = {
  posts: 'Bài viết', news: 'Tin tức', staff: 'Nhân sự', customers: 'Khách hàng', leads: 'Khách tiềm năng', products: 'Sản phẩm', appointments: 'Lịch hẹn', consultations: 'Tư vấn', treatments: 'Điều trị', invoices: 'Hóa đơn', expenses: 'Chi phí', payrolls: 'Bảng lương', commissions: 'Hoa hồng', projects: 'Dự án', tasks: 'Công việc', attendances: 'Chấm công', 'work-schedules': 'Lịch làm việc', 'work-contracts': 'Hợp đồng lao động', 'staff-insurances': 'Bảo hiểm', 'staff-rewards': 'Khen thưởng & kỷ luật', 'staff-trainings': 'Đào tạo', 'performance-reviews': 'Đánh giá năng lực', 'leave-requests': 'Đơn nghỉ phép', 'leave-types': 'Loại nghỉ phép', 'payment-requests': 'Đề nghị thanh toán', 'business-trip-requests': 'Đơn công tác', 'attendance-adjustment-requests': 'Điều chỉnh chấm công', 'lead-activities': 'Hoạt động khách tiềm năng', 'medical-episodes': 'Hồ sơ điều trị', 'service-orders': 'Đơn dịch vụ', 'customer-images': 'Hình ảnh - chẩn đoán', 'stock-batches': 'Lô hàng', 'accounting-periods': 'Kỳ kế toán', 'accounting-chart-accounts': 'Hệ thống tài khoản', 'accounting-cash-flow-mappings': 'Luồng tiền kế toán', 'accounting-vouchers': 'Chứng từ kế toán', 'workflow-definitions': 'Định nghĩa workflow', 'workflow-steps': 'Bước workflow', 'workflow-instances': 'Phiên workflow', 'workflow-tasks': 'Việc workflow',
}

const FIELD_LABELS: Record<string, string> = { status: 'Trạng thái', gender: 'Giới tính', isFeatured: 'Nổi bật', productType: 'Loại sản phẩm', type: 'Loại', method: 'Phương thức thanh toán', paymentMethod: 'Phương thức thanh toán', requestType: 'Loại đề nghị', mediaType: 'Loại hình ảnh', priority: 'Độ ưu tiên', contractType: 'Loại hợp đồng', insuranceType: 'Loại bảo hiểm', accountType: 'Loại tài khoản', normalBalance: 'Tính chất số dư', cashFlowGroup: 'Nhóm dòng tiền', voucherType: 'Loại chứng từ', direction: 'Chiều dòng tiền', section: 'Phân loại', activityType: 'Loại hoạt động', approverType: 'Kiểu người duyệt', rejectBehavior: 'Xử lý từ chối', targetResource: 'Model áp dụng', requiresAllocation: 'Quản lý số dư', isPaid: 'Hưởng lương', isActive: 'Đang áp dụng' }

function getModuleLabel(group: string) {
  if (group === 'LOCATION_COUNTRY') return 'Country'
  if (group === 'LOCATION_CITY') return 'City'
  if (group === 'LOCATION_WARD') return 'Ward'
  const [resource, field] = group.split('.')
  return `${RESOURCE_LABELS[resource] || resource} — ${FIELD_LABELS[field] || field}`
}

function getModelLabel(group: string) {
  if (group.startsWith('LOCATION_')) return 'Địa chỉ'
  return RESOURCE_LABELS[group.split('.')[0]] || group.split('.')[0]
}

function getFieldLabel(group: string) {
  if (group === 'LOCATION_COUNTRY') return 'Country'
  if (group === 'LOCATION_CITY') return 'City'
  if (group === 'LOCATION_WARD') return 'Ward'
  return FIELD_LABELS[group.split('.')[1]] || group.split('.')[1]
}

export function LocationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const groupFromUrl = () => {
    const module = searchParams.get('module')
    const field = searchParams.get('field')
    if (!module) return MODULES[0].group
    return field ? `${module}.${field}` : module
  }
  const [group, setGroup] = useState(groupFromUrl)
  const [modules, setModules] = useState(MODULES)
  const [rows, setRows] = useState<MasterData[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<MasterData | null>(null)
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()
  const activeModule = modules.find((item) => item.group === group) || modules[0]
  const moduleGroups = modules.reduce<Array<{ label: string; items: typeof modules }>>((groups, item) => {
    const label = getModelLabel(item.group)
    const current = groups.find((entry) => entry.label === label)
    if (current) current.items.push(item)
    else groups.push({ label, items: [item] })
    return groups
  }, [])

  const load = async () => { setLoading(true); try { const response = await api.get('/master-data', { params: { group } }); setRows(response.data.data || []) } finally { setLoading(false) } }
  const selectGroup = (nextGroup: string) => {
    const [module, field] = nextGroup.split('.')
    setGroup(nextGroup)
    setSearchParams(field ? { module, field } : { module })
  }
  useEffect(() => { void load() }, [group])
  useEffect(() => {
    const nextGroup = groupFromUrl()
    if (nextGroup !== group) setGroup(nextGroup)
  }, [searchParams])
  useEffect(() => {
    const seedAndLoadGroups = async () => {
      const items = Object.entries(baseFields).flatMap(([resource, fields]) => fields.flatMap((field) => {
        if (!Array.isArray(field.options) || field.options.length === 0) return []
        return field.options.map((option) => {
          const normalized = normalizeSelectOption(option)
          return { group: `${resource}.${field.key}`, name: normalized.label, value: normalized.value }
        })
      }))
      if (items.length) await api.post('/master-data/seed', { items })
      const response = await api.get('/master-data/groups')
      const existing = new Set(MODULES.map((item) => item.group))
      setModules([...MODULES, ...(response.data.data || []).filter((item: { group: string }) => !existing.has(item.group)).map((item: { group: string }) => ({ group: item.group, label: getModuleLabel(item.group) }))])
    }
    void seedAndLoadGroups()
  }, [])
  const showForm = (item?: MasterData) => { setEditing(item || null); form.setFieldsValue(item || { group, isActive: true, sortOrder: rows.length }); setOpen(true) }
  const save = async (values: MasterData) => { try { if (editing) await api.patch(`/master-data/${editing.id}`, values); else await api.post('/master-data', { ...values, group }); message.success('Đã lưu dữ liệu'); setOpen(false); void load() } catch { message.error('Không thể lưu dữ liệu') } }
  const remove = async (id: string) => { await api.delete(`/master-data/${id}`); message.success('Đã xoá dữ liệu'); void load() }

  return <>
    <div className="page-header">
      <Typography.Title className="page-title-with-icon" level={3}><DatabaseOutlined /><span>Master Data</span></Typography.Title>
    </div>
    <Layout className="master-data-layout">
      <Layout.Sider className="master-data-nav" theme="light" width={280}>
        {moduleGroups.map((model) => <div key={model.label} className="master-data-nav-group">
          <Typography.Text className="master-data-nav-group-title">{model.label}</Typography.Text>
          {model.items.map((item) => <Button key={item.group} block className={group === item.group ? 'active' : ''} type="text" onClick={() => selectGroup(item.group)}>{getFieldLabel(item.group)}</Button>)}
        </div>)}
      </Layout.Sider>
      <Layout.Content className="master-data-content">
        <Card className="glass-card" title={activeModule.label} extra={<Button icon={<PlusOutlined />} type="primary" onClick={() => showForm()}>Thêm dữ liệu</Button>}>
          <Table loading={loading} dataSource={rows} rowKey="id" columns={[
            { title: 'Label', dataIndex: 'name' }, { title: 'Value', dataIndex: 'value' }, { title: 'Parent value', dataIndex: 'parentValue', render: (value) => value || '-' }, { title: 'Thứ tự', dataIndex: 'sortOrder', width: 90 },
            { title: '', width: 100, render: (_value, row) => <Space><Button icon={<EditOutlined />} size="small" type="text" onClick={() => showForm(row)} /><Popconfirm title="Xóa dữ liệu này?" onConfirm={() => void remove(row.id)}><Button danger icon={<DeleteOutlined />} size="small" type="text" /></Popconfirm></Space> },
          ]} />
        </Card>
      </Layout.Content>
    </Layout>
    <Modal open={open} title={editing ? 'Sửa Master Data' : 'Thêm Master Data'} onCancel={() => setOpen(false)} onOk={() => form.submit()}>
      <Form form={form} layout="vertical" onFinish={save}>
        <Form.Item hidden name="group"><Input /></Form.Item>
        <Form.Item label="Label" name="name" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item label="Value" name="value" rules={[{ required: true }]}><Input disabled={Boolean(editing)} /></Form.Item>
        <Form.Item label="Parent value" name="parentValue"><Input /></Form.Item>
        <Form.Item label="Thứ tự" name="sortOrder"><Input type="number" /></Form.Item>
      </Form>
    </Modal>
  </>
}
