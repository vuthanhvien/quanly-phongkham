import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Alert, App, Button, Card, Form, Input, Modal, Space, Switch, Table, Typography } from 'antd'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import 'antd/dist/reset.css'
import './styles.css'

type Tenant = { id: string; domain: string; databaseUrl: string; isActive: boolean; createdAt: string }
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' })
api.interceptors.request.use((config) => { const token = localStorage.getItem('platform-token'); if (token) config.headers.Authorization = `Bearer ${token}`; return config })

function PlatformApp() {
  const [token, setToken] = useState(localStorage.getItem('platform-token'))
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<Tenant | null>(null)
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm<Omit<Tenant, 'id' | 'createdAt'>>()
  const [loginForm] = Form.useForm<{ email: string; password: string }>()
  const load = async () => { setLoading(true); try { const { data } = await api.get('/platform/tenants'); setTenants(data.data || []) } finally { setLoading(false) } }
  useEffect(() => { if (token) void load() }, [token])
  const login = async (values: { email: string; password: string }) => { const { data } = await api.post('/platform-auth/login', values); localStorage.setItem('platform-token', data.accessToken); setToken(data.accessToken) }
  const save = async (values: Omit<Tenant, 'id' | 'createdAt'>) => { if (editing) await api.patch(`/platform/tenants/${editing.id}`, values); else await api.post('/platform/tenants', values); setOpen(false); setEditing(null); form.resetFields(); await load() }
  if (!token) return <main className="login"><Card title="Platform CMS · Super Admin"><Form form={loginForm} layout="vertical" onFinish={login}><Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item><Form.Item name="password" label="Mật khẩu" rules={[{ required: true }]}><Input.Password /></Form.Item><Button htmlType="submit" type="primary" block>Đăng nhập</Button></Form></Card></main>
  return <App><main className="page"><header><div><Typography.Title level={2}>Quản lý tenant</Typography.Title><Typography.Text type="secondary">Mỗi domain được kết nối tới một database riêng.</Typography.Text></div><Space><Button onClick={() => { localStorage.removeItem('platform-token'); setToken(null) }}>Đăng xuất</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.setFieldsValue({ isActive: true }); setOpen(true) }}>Thêm tenant</Button></Space></header><Alert showIcon type="info" message="Ánh xạ domain được cache ở backend và tự xoá cache khi tenant thay đổi." /><Card><Table loading={loading} rowKey="id" dataSource={tenants} columns={[{ title: 'Domain', dataIndex: 'domain' }, { title: 'Database URL', dataIndex: 'databaseUrl', ellipsis: true }, { title: 'Trạng thái', dataIndex: 'isActive', render: (value) => value ? 'Đang hoạt động' : 'Tạm dừng' }, { title: '', width: 64, render: (_, row) => <Button type="text" icon={<EditOutlined />} onClick={() => { setEditing(row); form.setFieldsValue(row); setOpen(true) }} /> }]} /></Card><Modal open={open} title={editing ? 'Cập nhật tenant' : 'Thêm tenant'} onCancel={() => setOpen(false)} onOk={() => form.submit()} okText="Lưu"><Form form={form} layout="vertical" onFinish={save}><Form.Item name="domain" label="Domain" rules={[{ required: true }]}><Input placeholder="clinic-a.example.com" /></Form.Item><Form.Item name="databaseUrl" label="Database URL" rules={[{ required: true }]}><Input.Password placeholder="mysql://user:password@host:3306/database" /></Form.Item><Form.Item name="isActive" label="Hoạt động" valuePropName="checked"><Switch /></Form.Item></Form></Modal></main></App>
}
createRoot(document.getElementById('root')!).render(<PlatformApp />)
