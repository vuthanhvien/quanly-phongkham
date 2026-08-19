import { RobotOutlined } from '@ant-design/icons'
import {
  Alert,
  Button,
  Card,
  Divider,
  Form,
  Input,
  Select,
  Spin,
  Space,
  Switch,
  Tabs,
  Typography,
  message,
} from 'antd'
import { useEffect, useState } from 'react'
import { api } from '../api'
import { ChatbotHistoryPage } from './ChatbotHistoryPage'

interface ChatbotConfig {
  id?: string
  systemPrompt?: string
  apiKey?: string
  enabled: boolean
  model: string
  toolSearchServices: boolean
  toolCreateAppointment: boolean
  toolCheckDoctorSchedule: boolean
  toolLookupAppointments: boolean
  adminEnabled: boolean
  adminApiKey?: string
  adminModel: string
  adminSystemPrompt?: string
  adminToolReadData: boolean
  adminToolReports: boolean
  adminToolMutations: boolean
  adminToolImport: boolean
  updatedAt?: string
}

const DEFAULT_SYSTEM_PROMPT = `Bạn là trợ lý tư vấn dịch vụ của phòng khám Thiện Chánh. Nhiệm vụ của bạn là:
- Tư vấn khách hàng về các dịch vụ, liệu trình điều trị của phòng khám
- Hỗ trợ đặt lịch hẹn cho khách hàng
- Kiểm tra lịch làm việc của bác sĩ khi được yêu cầu

Hãy trả lời thân thiện, chuyên nghiệp và ngắn gọn bằng tiếng Việt. Khi khách hàng muốn đặt lịch, hãy hỏi đầy đủ thông tin: tên, số điện thoại, và thời gian mong muốn.`

const DEFAULT_ADMIN_SYSTEM_PROMPT = `Bạn là trợ lý vận hành CMS.
- Hỗ trợ người dùng nhập liệu, kiểm tra dữ liệu và xem báo cáo.
- Luôn giải thích ngắn gọn, chỉ rõ màn hình/đường dẫn cần mở.
- Chỉ đề xuất tạo, sửa hoặc lưu trữ khi người dùng đã xác nhận thông tin; CMS sẽ yêu cầu xác nhận lần cuối trước khi thực hiện.`

export function ChatbotSettingsPage() {
  const [form] = Form.useForm<ChatbotConfig>()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [landingModels, setLandingModels] = useState<string[]>([])
  const [adminModels, setAdminModels] = useState<string[]>([])
  const [loadingModels, setLoadingModels] = useState({ landing: false, admin: false })
  const [masked, setMasked] = useState(true)
  const [activeTab, setActiveTab] = useState('landing')

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const response = await api.get('/settings/chatbot')
      const data = response.data.data as ChatbotConfig
      form.setFieldsValue({
        ...data,
        apiKey: data.apiKey ? '••••••••••••••••••••••••••' : '',
        adminApiKey: data.adminApiKey ? '••••••••••••••••••••••••••' : '',
      })
      await Promise.all([loadModels('landing', true), loadModels('admin', true)])
    } catch {
      message.error('Không thể tải cấu hình chatbot')
    } finally {
      setLoading(false)
    }
  }

  async function loadModels(scope: 'landing' | 'admin', silent = false) {
    setLoadingModels((current) => ({ ...current, [scope]: true }))
    try {
      const response = await api.get(`/settings/chatbot/models?scope=${scope}`)
      if (scope === 'admin') setAdminModels(response.data.data as string[])
      else setLandingModels(response.data.data as string[])
    } catch {
      if (scope === 'admin') setAdminModels([])
      else setLandingModels([])
      if (!silent) message.error(`Không thể tải model ${scope === 'admin' ? 'CMS' : 'Landing'}. Kiểm tra OpenAI API key rồi lưu lại.`)
    } finally {
      setLoadingModels((current) => ({ ...current, [scope]: false }))
    }
  }

  async function save(values: ChatbotConfig) {
    setSaving(true)
    try {
      const payload: Partial<ChatbotConfig> = { ...values }
      if (payload.apiKey?.startsWith('•')) {
        delete payload.apiKey
      }
      if (payload.adminApiKey?.startsWith('•')) {
        delete payload.adminApiKey
      }
      await api.put('/settings/chatbot', payload)
      message.success('Đã lưu cấu hình chatbot')
      await load()
    } catch {
      message.error('Lưu cấu hình thất bại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <Typography.Title level={3}>Cấu hình Chatbot</Typography.Title>
        </div>
      </div>

      <Spin spinning={loading}>
        {/* <Alert
          icon={<RobotOutlined />}
          showIcon
          type="info"
          message="Chatbot tư vấn & đặt lịch"
          description="Chatbot sẽ xuất hiện trên landing page để tư vấn dịch vụ và hỗ trợ khách hàng đặt lịch hẹn. Cần có Anthropic API Key để kích hoạt."
          style={{ marginBottom: 24 }}
        /> */}

        <Form form={form} layout="vertical" onFinish={save}>
          <Tabs
            className="record-status-tabs chatbot-settings-tabs"
            activeKey={activeTab}
            items={[
              { key: 'landing', label: 'Chatbot Landing' },
              { key: 'cms', label: 'Trợ lý CMS' },
              { key: 'history', label: 'Lịch sử GIS AI' },
            ]}
            onChange={setActiveTab}
          />

          {activeTab === 'landing' && <Card className="glass-card chatbot-settings-panel">

          <Card size="small" style={{ marginBottom: 16 }}>
            <Space style={{ justifyContent: 'space-between', width: '100%' }}>
              <div>
                <Typography.Text strong>Bật chatbot Landing</Typography.Text>
                <br />
                <Typography.Text type="secondary">Hiển thị chatbot tư vấn trên landing page.</Typography.Text>
              </div>
              <Form.Item name="enabled" valuePropName="checked" style={{ margin: 0 }}>
                <Switch />
              </Form.Item>
            </Space>
          </Card>

          <Form.Item
            name="apiKey"
            label="OpenAI API Key"
            extra="Lấy API key tại platform.openai.com. Lưu key rồi bấm “Tải model” để lấy các model mà project của bạn dùng được."
          >
            <Input.Password
              placeholder="sk-..."
              visibilityToggle={{ visible: !masked, onVisibleChange: (v) => setMasked(!v) }}
              onFocus={() => {
                const current = form.getFieldValue('apiKey') as string
                if (current?.startsWith('•')) {
                  form.setFieldValue('apiKey', '')
                }
              }}
            />
          </Form.Item>

          <Form.Item name="model" label="Model AI" initialValue="gpt-4o-mini">
            <Select
              loading={loadingModels.landing}
              options={landingModels.map((model) => ({ value: model, label: model }))}
              placeholder="Lưu OpenAI API key rồi tải model"
              style={{ maxWidth: 360 }}
              dropdownRender={(menu) => <>{menu}<Divider style={{ margin: '8px 0' }} /><Button type="link" loading={loadingModels.landing} onClick={() => void loadModels('landing')}>Tải lại model</Button></>}
            />
          </Form.Item>

          <Divider />

          <Typography.Title level={5} style={{ marginBottom: 16 }}>
            System Prompt
          </Typography.Title>

          <Form.Item
            name="systemPrompt"
            label="Hướng dẫn cho AI"
            extra="Định nghĩa vai trò, phong cách và giới hạn của chatbot."
          >
            <Input.TextArea
              rows={8}
              placeholder={DEFAULT_SYSTEM_PROMPT}
              style={{ fontFamily: 'monospace', fontSize: 13 }}
            />
          </Form.Item>

          <Divider />

          <Typography.Title level={5} style={{ marginBottom: 16 }}>
            Công cụ (Tools)
          </Typography.Title>

          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card size="small">
              <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                <div>
                  <Typography.Text strong>Tìm kiếm dịch vụ</Typography.Text>
                  <br />
                  <Typography.Text type="secondary">
                    Cho phép chatbot tìm kiếm các dịch vụ, liệu trình trong hệ thống
                  </Typography.Text>
                </div>
                <Form.Item name="toolSearchServices" valuePropName="checked" style={{ margin: 0 }}>
                  <Switch />
                </Form.Item>
              </Space>
            </Card>

            <Card size="small">
              <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                <div>
                  <Typography.Text strong>Tạo lịch hẹn</Typography.Text>
                  <br />
                  <Typography.Text type="secondary">
                    Cho phép chatbot tạo lịch hẹn trực tiếp vào hệ thống khi khách đồng ý
                  </Typography.Text>
                </div>
                <Form.Item name="toolCreateAppointment" valuePropName="checked" style={{ margin: 0 }}>
                  <Switch />
                </Form.Item>
              </Space>
            </Card>

            <Card size="small">
              <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                <div>
                  <Typography.Text strong>Kiểm tra lịch bác sĩ</Typography.Text>
                  <br />
                  <Typography.Text type="secondary">
                    Cho phép chatbot tra cứu lịch làm việc và lịch hẹn của bác sĩ
                  </Typography.Text>
                </div>
                <Form.Item name="toolCheckDoctorSchedule" valuePropName="checked" style={{ margin: 0 }}>
                  <Switch />
                </Form.Item>
              </Space>
            </Card>

            <Card size="small">
              <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                <div>
                  <Typography.Text strong>Tra cứu lịch hẹn của khách</Typography.Text>
                  <br />
                  <Typography.Text type="secondary">
                    Cho phép chatbot tìm lịch hẹn khi khách cung cấp đúng tên và số điện thoại
                  </Typography.Text>
                </div>
                <Form.Item name="toolLookupAppointments" valuePropName="checked" style={{ margin: 0 }}>
                  <Switch />
                </Form.Item>
              </Space>
            </Card>
          </Space>

          <Divider />

          <Button
            className="primary-glow"
            htmlType="submit"
            loading={saving}
            type="primary"
            size="large"
          >
            Lưu cấu hình
          </Button>
          </Card>}

          {activeTab === 'cms' && <Card className="glass-card chatbot-settings-panel">
          {/* <Alert
            icon={<RobotOutlined />}
            showIcon
            type="info"
            message="GIS AI — Bubble chat cho nhân viên và quản trị viên"
            description="Trợ lý hiểu màn hình đang mở, có thể chỉ đường dẫn, tra cứu/check dữ liệu, hỗ trợ báo cáo và đề xuất thao tác. Bác sĩ có thể bấm micro để nói tiếng Việt; hệ thống chuyển thành text trước khi gửi và lưu lịch sử theo tài khoản. Thao tác ghi hoặc lưu trữ luôn cần người dùng xác nhận ở bubble chat."
            style={{ marginBottom: 16 }}
          /> */}

          <Card size="small" style={{ marginBottom: 16 }}>
            <Space style={{ justifyContent: 'space-between', width: '100%' }}>
              <div>
                <Typography.Text strong>Bật trợ lý CMS</Typography.Text>
                <br />
                <Typography.Text type="secondary">Dùng OpenAI API Key riêng cho trợ lý CMS.</Typography.Text>
              </div>
              <Form.Item name="adminEnabled" valuePropName="checked" style={{ margin: 0 }}>
                <Switch />
              </Form.Item>
            </Space>
          </Card>

          <Form.Item
            name="adminApiKey"
            label="OpenAI API Key cho CMS"
            extra="Key này tách biệt hoàn toàn với chatbot Landing và được mã hóa, không hiển thị lại."
          >
            <Input.Password
              placeholder="sk-..."
              visibilityToggle={{ visible: !masked, onVisibleChange: (v) => setMasked(!v) }}
              onFocus={() => {
                const current = form.getFieldValue('adminApiKey') as string
                if (current?.startsWith('•')) form.setFieldValue('adminApiKey', '')
              }}
            />
          </Form.Item>

          <Form.Item name="adminModel" label="Model AI cho CMS" initialValue="gpt-4o-mini">
            <Select
              loading={loadingModels.admin}
              options={adminModels.map((model) => ({ value: model, label: model }))}
              placeholder="Lưu OpenAI API key CMS rồi tải model"
              style={{ maxWidth: 360 }}
              dropdownRender={(menu) => <>{menu}<Divider style={{ margin: '8px 0' }} /><Button type="link" loading={loadingModels.admin} onClick={() => void loadModels('admin')}>Tải lại model</Button></>}
            />
          </Form.Item>

          <Divider />

          <Typography.Title level={5} style={{ marginBottom: 16 }}>
            System Prompt
          </Typography.Title>

          <Form.Item
            name="adminSystemPrompt"
            label="Hướng dẫn riêng cho trợ lý CMS"
            extra="Bổ sung quy trình, thuật ngữ và quy ước nội bộ."
          >
            <Input.TextArea rows={6} placeholder={DEFAULT_ADMIN_SYSTEM_PROMPT} style={{ fontFamily: 'monospace', fontSize: 13 }} />
          </Form.Item>

          <Divider />

          <Typography.Title level={5} style={{ marginBottom: 16 }}>
            Công cụ (Tools)
          </Typography.Title>

          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <ToolToggle name="adminToolReadData" title="Tra cứu & kiểm tra dữ liệu" description="Cho phép đọc danh sách và chi tiết bản ghi theo đúng quyền của người đăng nhập." />
            <ToolToggle name="adminToolReports" title="Báo cáo kế toán" description="Cho phép tổng hợp các báo cáo kế toán có sẵn trong CMS." />
            <ToolToggle name="adminToolMutations" title="Thêm, sửa, lưu trữ dữ liệu" description="AI chỉ tạo đề xuất; người dùng phải xác nhận trước khi hệ thống ghi dữ liệu." />
            <ToolToggle name="adminToolImport" title="Hướng dẫn import Excel" description="Hiển thị nút mở đúng trang import của từng phân hệ." />
          </Space>

          <Divider />

          <Button className="primary-glow" htmlType="submit" loading={saving} type="primary" size="large">
            Lưu cấu hình trợ lý
          </Button>
          </Card>}

          {activeTab === 'history' && <Card className="glass-card chatbot-settings-panel"><ChatbotHistoryPage embedded /></Card>}
        </Form>
      </Spin>
    </>
  )
}

function ToolToggle({ name, title, description }: { name: keyof ChatbotConfig; title: string; description: string }) {
  return (
    <Card size="small">
      <Space style={{ justifyContent: 'space-between', width: '100%' }}>
        <div>
          <Typography.Text strong>{title}</Typography.Text>
          <br />
          <Typography.Text type="secondary">{description}</Typography.Text>
        </div>
        <Form.Item name={name} valuePropName="checked" style={{ margin: 0 }}>
          <Switch />
        </Form.Item>
      </Space>
    </Card>
  )
}
