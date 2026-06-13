import { BgColorsOutlined, BorderOutlined, FontSizeOutlined, PictureOutlined } from '@ant-design/icons'
import { Button, Card, Col, Flex, Form, Input, InputNumber, Radio, Row, Select, Space, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import { defaultAppUiSettings, fontFamilyOptions, useAppUi, type AppUiSettings } from '../app-ui'

type UiSettingsFormValues = AppUiSettings

const themeOptions = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
]

const sizeOptions = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
]

export function UiSettingsPage() {
  const { settings, save, loading } = useAppUi()
  const [form] = Form.useForm<UiSettingsFormValues>()
  const [saving, setSaving] = useState(false)
  const watchedValues = Form.useWatch([], form)

  useEffect(() => {
    form.setFieldsValue({ ...defaultAppUiSettings, ...settings })
  }, [form, settings])

  async function handleSubmit(values: UiSettingsFormValues) {
    setSaving(true)
    try {
      await save(values)
      message.success('Đã cập nhật giao diện CMS')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <Flex align="start" justify="space-between" gap={16} wrap>
        <div>
          <Typography.Title level={2} style={{ marginBottom: 4 }}>
            UI settings
          </Typography.Title>
          <Typography.Paragraph style={{ margin: 0 }}>
            Chỉ admin mới xem được màn này. Các thay đổi sẽ áp dụng trực tiếp cho CMS sau khi lưu.
          </Typography.Paragraph>
        </div>
      </Flex>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Row gutter={[16, 16]}>
          <Col lg={14} xs={24}>
            <Card className="glass-card settings-card" title="Nhận diện ứng dụng">
              <Row gutter={[16, 0]}>
                <Col md={12} xs={24}>
                  <Form.Item label="Tên app" name="appName" rules={[{ required: true, message: 'Nhập tên app' }]}>
                    <Input placeholder="Ví dụ: Thiện Chánh CMS" />
                  </Form.Item>
                </Col>
                <Col md={12} xs={24}>
                  <Form.Item label="Icon app URL" name="appIconUrl">
                    <Input placeholder="https://.../icon.png" prefix={<PictureOutlined />} />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item label="Mô tả app" name="appDescription">
                    <Input.TextArea placeholder="Mô tả ngắn cho CMS" rows={3} />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          <Col lg={10} xs={24}>
            <Card className="glass-card settings-card" title="Xem nhanh">
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <Typography.Text strong>{watchedValues?.appName || settings.appName}</Typography.Text>
                <Typography.Paragraph style={{ margin: 0 }}>
                  {watchedValues?.appDescription || settings.appDescription || 'CMS vận hành viện thẩm mỹ'}
                </Typography.Paragraph>
                <Flex align="center" gap={12}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: Number(watchedValues?.borderRadius || settings.borderRadius),
                      background: watchedValues?.primaryColor || settings.primaryColor,
                      display: 'grid',
                      placeItems: 'center',
                      color: '#fff',
                      fontWeight: 800,
                      overflow: 'hidden',
                    }}
                  >
                    {watchedValues?.appIconUrl ? (
                      <img
                        alt={watchedValues?.appName || settings.appName}
                        src={watchedValues?.appIconUrl}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      String(watchedValues?.appName || settings.appName).slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <Typography.Text>Theme: {watchedValues?.theme || settings.theme}</Typography.Text>
                    <br />
                    <Typography.Text>Size: {watchedValues?.size || settings.size}</Typography.Text>
                  </div>
                </Flex>
              </Space>
            </Card>
          </Col>

          <Col lg={12} xs={24}>
            <Card className="glass-card settings-card" title="Theme & màu sắc">
              <Row gutter={[16, 0]}>
                <Col md={12} xs={24}>
                  <Form.Item label="Theme app" name="theme" rules={[{ required: true }]}>
                    <Radio.Group optionType="button" buttonStyle="solid" options={themeOptions} />
                  </Form.Item>
                </Col>
                <Col md={12} xs={24}>
                  <Form.Item
                    label="Màu chính"
                    name="primaryColor"
                    rules={[
                      { required: true, message: 'Nhập mã màu' },
                      { pattern: /^#([0-9a-fA-F]{6})$/, message: 'Dùng định dạng #RRGGBB' },
                    ]}
                  >
                    <Input placeholder="#e889ae" prefix={<BgColorsOutlined />} />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          <Col lg={12} xs={24}>
            <Card className="glass-card settings-card" title="Kích thước & bo góc">
              <Row gutter={[16, 0]}>
                <Col md={12} xs={24}>
                  <Form.Item label="Size app" name="size" rules={[{ required: true }]}>
                    <Radio.Group optionType="button" buttonStyle="solid" options={sizeOptions} />
                  </Form.Item>
                </Col>
                <Col md={12} xs={24}>
                  <Form.Item label="Border radius" name="borderRadius" rules={[{ required: true }]}>
                    <InputNumber min={0} max={32} style={{ width: '100%' }} addonBefore={<BorderOutlined />} />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          <Col span={24}>
            <Card className="glass-card settings-card" title="Font family">
              <Form.Item label="Chọn font" name="fontFamily" rules={[{ required: true }]}>
                <Select
                  options={fontFamilyOptions.map((font) => ({ value: font.value, label: font.label }))}
                  placeholder="Chọn font cho CMS"
                  suffixIcon={<FontSizeOutlined />}
                />
              </Form.Item>
            </Card>
          </Col>

          <Col span={24}>
            <Flex justify="end">
              <Button htmlType="submit" loading={saving || loading} type="primary">
                Lưu UI settings
              </Button>
            </Flex>
          </Col>
        </Row>
      </Form>
    </Space>
  )
}
