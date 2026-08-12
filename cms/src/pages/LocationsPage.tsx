import { DatabaseOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, Layout, Modal, Popconfirm, Space, Table, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import { api } from '../api'

type MasterData = { id: string; group: string; name: string; value: string; parentValue?: string; sortOrder: number; isActive: boolean }
const MODULES = [
  { group: 'LOCATION_COUNTRY', label: 'Country' },
  { group: 'LOCATION_CITY', label: 'City' },
  { group: 'LOCATION_WARD', label: 'Ward' },
]

export function LocationsPage() {
  const [group, setGroup] = useState(MODULES[0].group)
  const [rows, setRows] = useState<MasterData[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<MasterData | null>(null)
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()
  const activeModule = MODULES.find((item) => item.group === group) || MODULES[0]

  const load = async () => { setLoading(true); try { const response = await api.get('/master-data', { params: { group } }); setRows(response.data.data || []) } finally { setLoading(false) } }
  useEffect(() => { void load() }, [group])
  const showForm = (item?: MasterData) => { setEditing(item || null); form.setFieldsValue(item || { group, isActive: true, sortOrder: rows.length }); setOpen(true) }
  const save = async (values: MasterData) => { try { if (editing) await api.patch(`/master-data/${editing.id}`, values); else await api.post('/master-data', { ...values, group }); message.success('Đã lưu dữ liệu'); setOpen(false); void load() } catch { message.error('Không thể lưu dữ liệu') } }
  const remove = async (id: string) => { await api.delete(`/master-data/${id}`); message.success('Đã xoá dữ liệu'); void load() }

  return <>
    <div className="page-header">
      <Typography.Title className="page-title-with-icon" level={3}><DatabaseOutlined /><span>Master Data</span></Typography.Title>
    </div>
    <Layout className="master-data-layout">
      <Layout.Sider className="master-data-nav" theme="light" width={244}>
        <Typography.Text className="eyebrow">Module</Typography.Text>
        {MODULES.map((item) => <Button key={item.group} block className={group === item.group ? 'active' : ''} type="text" onClick={() => setGroup(item.group)}>{item.label}</Button>)}
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
