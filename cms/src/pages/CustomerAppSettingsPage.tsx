import { AppstoreOutlined, DeleteOutlined, MobileOutlined, PlusOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Checkbox, Col, Divider, Form, Input, InputNumber, Row, Select, Space, Spin, Switch, Tabs, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import { api } from '../api'
import { getApiErrorMessage } from '../utils/apiError'
import { createId } from '../utils/createId'

type AppConfig = {
  appTitle: string
  businessName?: string
  logoUrl?: string
  primaryColor?: string
  customerAppUrl?: string
  layout?: { homeStyle?: string; showLogo?: boolean; maxHomeBlocks?: number }
  blocks?: Array<{ id: string; title: string; type: string; enabled: boolean }>
  bottomMenu?: Array<{ key: string; label: string; icon: string; enabled: boolean; primary?: boolean }>
  features?: Record<string, boolean>
}

const defaultConfig: AppConfig = {
  appTitle: 'Đặt lịch khám',
  layout: { homeStyle: 'cards', showLogo: true, maxHomeBlocks: 6 },
  blocks: [],
  bottomMenu: [
    { key: 'home', label: 'Trang chủ', icon: 'home', enabled: true },
    { key: 'bookings', label: 'Lịch hẹn', icon: 'calendar', enabled: true },
    { key: 'booking-create', label: 'Đặt lịch', icon: 'plus', enabled: true, primary: true },
    { key: 'chat', label: 'Tin nhắn', icon: 'chat', enabled: true },
    { key: 'profile', label: 'Cá nhân', icon: 'profile', enabled: true },
  ],
  features: { appointments: true, chat: true, invoices: true, profile: true },
}

const featureOptions = [
  ['appointments', 'Đặt và quản lý lịch hẹn'],
  ['chat', 'Trò chuyện với phòng khám'],
  ['invoices', 'Hoá đơn / thanh toán'],
  ['profile', 'Hồ sơ khách hàng'],
] as const

export function CustomerAppSettingsPage() {
  const [form] = Form.useForm<AppConfig>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [embedUrl, setEmbedUrl] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const response = await api.get('/settings/customer-app')
      const data = response.data?.data ?? response.data
      const config = { ...defaultConfig, ...data, layout: { ...defaultConfig.layout, ...(data.layout || {}) }, features: { ...defaultConfig.features, ...(data.features || {}) } }
      form.setFieldsValue(config)
      setEmbedUrl(config.customerAppUrl || '')
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Không tải được cấu hình app khách hàng'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const save = async (values: AppConfig) => {
    setSaving(true)
    try {
      await api.put('/settings/customer-app', values)
      setEmbedUrl(values.customerAppUrl || '')
      message.success('Đã lưu cấu hình app khách hàng')
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Không thể lưu cấu hình app khách hàng'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Spin spinning={loading}>
      <div className="page-header">
        <div>
          <Typography.Title className="page-title-with-icon" level={3}><MobileOutlined /><span>App khách hàng</span></Typography.Title>
          <Typography.Text type="secondary">Cấu hình app trong thư mục customer_app: thương hiệu, bố cục, nội dung, menu và các tính năng hiển thị.</Typography.Text>
        </div>
        <Space><Button icon={<ReloadOutlined />} onClick={() => void load()}>Làm mới</Button><Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={() => void form.submit()}>Lưu cấu hình</Button></Space>
      </div>

      <Form form={form} layout="vertical" initialValues={defaultConfig} onFinish={(values) => void save(values)}>
        <Tabs items={[
          { key: 'general', label: 'Thông tin & layout', children: <Card className="glass-card"><Row gutter={16}><Col xs={24} md={12}><Form.Item label="Tiêu đề app" name="appTitle" rules={[{ required: true, message: 'Nhập tiêu đề app' }]}><Input /></Form.Item></Col><Col xs={24} md={12}><Form.Item label="Tên doanh nghiệp" name="businessName"><Input placeholder="Ví dụ: Phòng khám ABC" /></Form.Item></Col><Col xs={24} md={12}><Form.Item label="Logo (URL)" name="logoUrl"><Input placeholder="https://..." /></Form.Item></Col><Col xs={24} md={12}><Form.Item label="Màu chủ đạo" name="primaryColor"><Input placeholder="#E889AE" /></Form.Item></Col><Col xs={24} md={12}><Form.Item label="Kiểu trang chủ" name={['layout', 'homeStyle']}><Select options={[{ value: 'cards', label: 'Thẻ (cards)' }, { value: 'list', label: 'Danh sách' }, { value: 'compact', label: 'Thu gọn' }]} /></Form.Item></Col><Col xs={24} md={12}><Form.Item label="Số block trang chủ" name={['layout', 'maxHomeBlocks']}><InputNumber min={1} max={20} style={{ width: '100%' }} /></Form.Item></Col></Row><Form.Item name={['layout', 'showLogo']} valuePropName="checked"><Checkbox>Hiển thị logo trên trang chủ</Checkbox></Form.Item></Card> },
          { key: 'blocks', label: 'Blocks', children: <Card className="glass-card"><Typography.Paragraph type="secondary">Các block là thành phần nội dung hiển thị ở trang chủ app, ví dụ banner, giới thiệu hay ưu đãi.</Typography.Paragraph><Form.List name="blocks">{(fields, { add, remove }) => <Space direction="vertical" size={12} style={{ width: '100%' }}>{fields.map((field) => <Card key={field.key} size="small"><Row gutter={12} align="middle"><Col xs={24} md={8}><Form.Item {...field} label="Tiêu đề" name={[field.name, 'title']} rules={[{ required: true }]}><Input /></Form.Item></Col><Col xs={16} md={7}><Form.Item {...field} label="Loại block" name={[field.name, 'type']}><Select options={[{ value: 'banner', label: 'Banner' }, { value: 'text', label: 'Văn bản' }, { value: 'promotion', label: 'Ưu đãi' }, { value: 'quick-action', label: 'Thao tác nhanh' }]} /></Form.Item></Col><Col xs={8} md={5}><Form.Item {...field} label="Hiển thị" name={[field.name, 'enabled']} valuePropName="checked"><Switch /></Form.Item></Col><Col xs={24} md={4}><Button danger icon={<DeleteOutlined />} onClick={() => remove(field.name)}>Xóa</Button></Col><Form.Item {...field} hidden name={[field.name, 'id']} /></Row></Card>)}<Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({ id: createId(), title: 'Block mới', type: 'banner', enabled: true })}>Thêm block</Button></Space>}</Form.List></Card> },
          { key: 'menu', label: 'Bottom menu', children: <Card className="glass-card"><Form.List name="bottomMenu">{(fields, { add, remove }) => <Space direction="vertical" size={12} style={{ width: '100%' }}>{fields.map((field) => <Card key={field.key} size="small"><Row gutter={12} align="middle"><Col xs={24} md={6}><Form.Item {...field} label="Mã" name={[field.name, 'key']} rules={[{ required: true }]}><Input /></Form.Item></Col><Col xs={24} md={6}><Form.Item {...field} label="Nhãn" name={[field.name, 'label']} rules={[{ required: true }]}><Input /></Form.Item></Col><Col xs={12} md={4}><Form.Item {...field} label="Icon" name={[field.name, 'icon']}><Select options={['home', 'calendar', 'plus', 'chat', 'profile'].map((value) => ({ value, label: value }))} /></Form.Item></Col><Col xs={6} md={3}><Form.Item {...field} label="Bật" name={[field.name, 'enabled']} valuePropName="checked"><Switch /></Form.Item></Col><Col xs={6} md={3}><Form.Item {...field} label="Nút chính" name={[field.name, 'primary']} valuePropName="checked"><Switch /></Form.Item></Col><Col xs={24} md={2}><Button danger type="text" icon={<DeleteOutlined />} onClick={() => remove(field.name)} /></Col></Row></Card>)}<Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({ key: `custom-${fields.length + 1}`, label: 'Menu mới', icon: 'home', enabled: true })}>Thêm menu</Button></Space>}</Form.List></Card> },
          { key: 'features', label: 'Tính năng', children: <Card className="glass-card"><Typography.Paragraph type="secondary">Tắt một tính năng sẽ ẩn mục tương ứng trong app khi app nạp lại cấu hình.</Typography.Paragraph><Row gutter={[16, 16]}>{featureOptions.map(([key, label]) => <Col xs={24} md={12} key={key}><Form.Item name={['features', key]} valuePropName="checked"><Switch checkedChildren="Bật" unCheckedChildren="Tắt" /> <Typography.Text style={{ marginLeft: 10 }}>{label}</Typography.Text></Form.Item></Col>)}</Row></Card> },
          { key: 'embed', label: 'Nhúng app', children: <Card className="glass-card"><Alert showIcon type="info" message="Build Flutter Web rồi nhập URL triển khai tại đây để xem app trực tiếp trong CMS." style={{ marginBottom: 16 }} /><Form.Item label="URL Flutter Web" name="customerAppUrl" extra="Ví dụ: https://app.tenmien.com hoặc http://localhost:xxxx"><Input placeholder="https://app.example.com" onChange={(event) => setEmbedUrl(event.target.value)} /></Form.Item>{embedUrl ? <iframe title="Xem trước app khách hàng" src={embedUrl} style={{ width: '100%', height: 680, border: 0, borderRadius: 12, background: '#fff' }} /> : <div style={{ padding: 36, textAlign: 'center' }}><AppstoreOutlined style={{ fontSize: 32 }} /><Divider /><Typography.Text type="secondary">Chưa có URL app để nhúng.</Typography.Text></div>}</Card> },
        ]} />
      </Form>
    </Spin>
  )
}
