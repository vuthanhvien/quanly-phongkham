import { RobotOutlined } from '@ant-design/icons'
import {
  Alert,
  Button,
  Card,
  Divider,
  Form,
  Input,
  Select,
  Space,
  Switch,
  Typography,
  message,
} from 'antd'
import { useEffect, useState } from 'react'
import { api } from '../api'

interface ChatbotConfig {
  id?: string
  systemPrompt?: string
  apiKey?: string
  model: string
  toolSearchServices: boolean
  toolCreateAppointment: boolean
  toolCheckDoctorSchedule: boolean
  updatedAt?: string
}

const MODEL_OPTIONS = [
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (Khuyến nghị)' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (Nhanh, tiết kiệm)' },
  { value: 'claude-opus-4-8', label: 'Claude Opus 4.8 (Mạnh nhất)' },
]

const DEFAULT_SYSTEM_PROMPT = `Bạn là trợ lý tư vấn dịch vụ của phòng khám Thiện Chánh. Nhiệm vụ của bạn là:
- Tư vấn khách hàng về các dịch vụ, liệu trình điều trị của phòng khám
- Hỗ trợ đặt lịch hẹn cho khách hàng
- Kiểm tra lịch làm việc của bác sĩ khi được yêu cầu

Hãy trả lời thân thiện, chuyên nghiệp và ngắn gọn bằng tiếng Việt. Khi khách hàng muốn đặt lịch, hãy hỏi đầy đủ thông tin: tên, số điện thoại, và thời gian mong muốn.`

export function ChatbotSettingsPage() {
  const [form] = Form.useForm<ChatbotConfig>()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [masked, setMasked] = useState(true)

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
      })
    } catch {
      message.error('Không thể tải cấu hình chatbot')
    } finally {
      setLoading(false)
    }
  }

  async function save(values: ChatbotConfig) {
    setSaving(true)
    try {
      const payload: Partial<ChatbotConfig> = { ...values }
      if (payload.apiKey?.startsWith('•')) {
        delete payload.apiKey
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

      <Card className="glass-card" loading={loading}>
        <Alert
          icon={<RobotOutlined />}
          showIcon
          type="info"
          message="Chatbot tư vấn & đặt lịch"
          description="Chatbot sẽ xuất hiện trên landing page để tư vấn dịch vụ và hỗ trợ khách hàng đặt lịch hẹn. Cần có Anthropic API Key để kích hoạt."
          style={{ marginBottom: 24 }}
        />

        <Form form={form} layout="vertical" onFinish={save}>
          <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>
            Kết nối API
          </Typography.Title>

          <Form.Item
            name="apiKey"
            label="Anthropic API Key"
            extra="Lấy API key tại console.anthropic.com. Key sẽ được mã hóa và không hiển thị lại."
          >
            <Input.Password
              placeholder="sk-ant-..."
              visibilityToggle={{ visible: !masked, onVisibleChange: (v) => setMasked(!v) }}
              onFocus={() => {
                const current = form.getFieldValue('apiKey') as string
                if (current?.startsWith('•')) {
                  form.setFieldValue('apiKey', '')
                }
              }}
            />
          </Form.Item>

          <Form.Item name="model" label="Model AI" initialValue="claude-sonnet-4-6">
            <Select options={MODEL_OPTIONS} style={{ maxWidth: 360 }} />
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
        </Form>
      </Card>
    </>
  )
}
