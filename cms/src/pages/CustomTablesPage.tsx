import { DeleteOutlined, PlusOutlined, TableOutlined } from '@ant-design/icons'
import { Button, Card, Checkbox, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

type Column = { id?: string; key: string; label: string; dataType: string; required?: boolean; options?: string[]; sortOrder?: number }
type DynamicTable = { id: string; key: string; name: string; description?: string; isActive: boolean; columns: Column[]; rows: Array<{ id: string; values: Record<string, unknown> }> }
const types = [{ value: 'text', label: 'Văn bản' }, { value: 'number', label: 'Số' }, { value: 'date', label: 'Ngày' }, { value: 'boolean', label: 'Bật/tắt' }, { value: 'select', label: 'Danh sách chọn' }]

export function CustomTablesPage() {
  const [tables, setTables] = useState<DynamicTable[]>([])
  const [editing, setEditing] = useState<DynamicTable | null>(null)
  const [schemaOpen, setSchemaOpen] = useState(false)
  const [schemaForm] = Form.useForm()
  const navigate = useNavigate()

  const load = async () => setTables((await api.get('/settings/custom-tables')).data.data || [])
  useEffect(() => { void load() }, [])
  const openCreate = () => { setEditing(null); schemaForm.setFieldsValue({ isActive: true, columns: [{ key: '', label: '', dataType: 'text', sortOrder: 0 }] }); setSchemaOpen(true) }
  const openEdit = (table: DynamicTable) => { setEditing(table); schemaForm.setFieldsValue({ ...table, columns: table.columns.map((column) => ({ ...column, options: column.options?.join(', ') })) }); setSchemaOpen(true) }
  const saveSchema = async (values: Record<string, unknown>) => {
    const payload = { ...values, columns: ((values.columns || []) as Array<Record<string, unknown>>).map((column, index) => ({ ...column, key: String(column.key || '').trim(), label: String(column.label || '').trim(), sortOrder: index, options: column.dataType === 'select' ? String(column.options || '').split(',').map((item) => item.trim()).filter(Boolean) : undefined })) }
    if (editing) await api.patch(`/settings/custom-tables/${editing.id}`, payload); else await api.post('/settings/custom-tables', payload)
    message.success('Đã lưu bảng dữ liệu động'); setSchemaOpen(false); await load()
  }
  const removeTable = async (id: string) => { await api.delete(`/settings/custom-tables/${id}`); message.success('Đã lưu trữ bảng'); await load() }
  return <Card title="Bảng dữ liệu động" extra={<Button icon={<PlusOutlined />} type="primary" onClick={openCreate}>Thêm bảng</Button>}>
    <Typography.Paragraph type="secondary">Tạo schema cột và dữ liệu dùng chung; sau đó chọn bảng này trong trường tuỳ biến kiểu “Bảng dữ liệu động”.</Typography.Paragraph>
    <Table rowKey="id" dataSource={tables} pagination={false} columns={[
      { title: 'Tên', render: (_, row: DynamicTable) => <><strong>{row.name}</strong><br /><Typography.Text type="secondary">{row.key}</Typography.Text></> },
      { title: 'Schema', render: (_, row: DynamicTable) => row.columns.map((column) => column.label).join(' · ') || 'Chưa có cột' },
      { title: '', render: (_, row: DynamicTable) => <Space><Button icon={<TableOutlined />} onClick={() => navigate(`/custom-tables/${row.id}/data`)}>Dữ liệu</Button><Button onClick={() => openEdit(row)}>Schema</Button><Popconfirm title="Lưu trữ bảng này?" onConfirm={() => void removeTable(row.id)}><Button danger icon={<DeleteOutlined />} /></Popconfirm></Space> },
    ]} />
    <Modal title={editing ? 'Sửa schema bảng' : 'Thêm bảng dữ liệu động'} open={schemaOpen} onCancel={() => setSchemaOpen(false)} onOk={() => schemaForm.submit()} width={900}>
      <Form form={schemaForm} layout="vertical" onFinish={(values) => void saveSchema(values)}><Space.Compact block><Form.Item name="name" label="Tên bảng" rules={[{ required: true }]} style={{ flex: 1 }}><Input /></Form.Item><Form.Item name="key" label="Key" rules={[{ required: true }]} style={{ flex: 1 }}><Input disabled={Boolean(editing)} /></Form.Item></Space.Compact><Form.Item name="description" label="Mô tả"><Input.TextArea rows={2} /></Form.Item><Form.Item name="isActive" valuePropName="checked"><Checkbox>Đang sử dụng</Checkbox></Form.Item>
      <Form.List name="columns">{(fields, { add, remove }) => <><Space style={{ marginBottom: 8 }}><strong>Cột dữ liệu</strong><Button onClick={() => add({ dataType: 'text', sortOrder: fields.length })}>Thêm cột</Button></Space>{fields.map((field, index) => <Space key={field.key} align="baseline" style={{ display: 'flex' }}><Form.Item name={[field.name, 'label']} rules={[{ required: true }]}><Input placeholder="Tên cột" /></Form.Item><Form.Item name={[field.name, 'key']} rules={[{ required: true }]}><Input placeholder="key" /></Form.Item><Form.Item name={[field.name, 'dataType']} initialValue="text"><Select options={types} style={{ width: 140 }} /></Form.Item><Form.Item name={[field.name, 'options']}><Input placeholder="Lựa chọn, cách nhau dấu phẩy" /></Form.Item><Form.Item name={[field.name, 'required']} valuePropName="checked"><Checkbox>Bắt buộc</Checkbox></Form.Item><Button danger onClick={() => remove(index)}>Xóa</Button></Space>)}</>}</Form.List></Form>
    </Modal>
  </Card>
}
