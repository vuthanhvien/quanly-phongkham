import { BgColorsOutlined, BorderOutlined, FontSizeOutlined, UndoOutlined } from '@ant-design/icons'
import { Button, Card, Checkbox, Col, Flex, Form, Input, InputNumber, Radio, Row, Select, Space, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import { buildShadowValue, companyTypeOptions, defaultAppUiSettings, fontFamilyOptions, useAppUi, type AppUiSettings } from '../app-ui'
import { appModuleGroups, appModuleLabels, companyTypeModulePresets, resolveMenuGroupLabel, type CompanyType } from '../company-types'
import { ImagePickerInput } from '../components/ImagePickerInput'

type UiSettingsFormValues = AppUiSettings

const sizeOptions = [
  { value: 'small', label: 'Nhỏ' },
  { value: 'medium', label: 'Vừa' },
  { value: 'large', label: 'Lớn' },
]

const colorRules = [
  { required: true, message: 'Nhập mã màu' },
  { pattern: /^#([0-9a-fA-F]{6})$/, message: 'Dùng định dạng #RRGGBB' },
]

const colorSections: Array<{
  title: string
  fields: Array<{ name: keyof AppUiSettings; label: string }>
}> = [
  {
    title: 'Nền & surface',
    fields: [
      { name: 'primaryColor', label: 'Màu chính' },
      { name: 'pageBgColor', label: 'Nền trang' },
      { name: 'surfaceColor', label: 'Nền card / surface' },
      { name: 'surfaceBorderColor', label: 'Viền card / surface' },
    ],
  },
  {
    title: 'Đầu trang',
    fields: [
      { name: 'headerBgColor', label: 'Nền đầu trang' },
      { name: 'headerBorderColor', label: 'Viền đầu trang' },
      { name: 'headerTextColor', label: 'Chữ đầu trang' },
    ],
  },
  {
    title: 'Thanh menu',
    fields: [
      { name: 'menuBgColor', label: 'Nền menu' },
      { name: 'menuTextColor', label: 'Chữ mục menu' },
      { name: 'menuGroupTextColor', label: 'Chữ nhóm menu' },
      { name: 'menuHoverBgColor', label: 'Nền khi rê chuột' },
      { name: 'menuActiveBgColor', label: 'Nền mục đang chọn' },
      { name: 'menuActiveTextColor', label: 'Chữ mục đang chọn' },
    ],
  },
  {
    title: 'Chữ hiển thị',
    fields: [
      { name: 'textColor', label: 'Chữ chính' },
      { name: 'textMutedColor', label: 'Chữ phụ' },
      { name: 'titleColor', label: 'Tiêu đề / heading' },
    ],
  },
  {
    title: 'Nút bấm',
    fields: [
      { name: 'buttonPrimaryTextColor', label: 'Chữ nút chính' },
      { name: 'buttonDefaultBgColor', label: 'Nền nút thường' },
      { name: 'buttonDefaultTextColor', label: 'Chữ nút thường' },
      { name: 'buttonDefaultBorderColor', label: 'Viền nút thường' },
    ],
  },
]

function ColorInput({ value, onChange, placeholder }: { value?: string; onChange?: (value: string) => void; placeholder?: string }) {
  const normalized = /^#([0-9a-fA-F]{6})$/.test(String(value || '').trim()) ? String(value).trim() : '#000000'

  return (
    <Flex gap={8} align="center">
      <input
        type="color"
        value={normalized}
        onChange={(event) => onChange?.(event.target.value)}
        style={{
          width: 44,
          height: 38,
          border: '1px solid var(--app-line)',
          borderRadius: '10px',
          padding: 4,
          background: 'var(--app-surface)',
          cursor: 'pointer',
        }}
      />
      <Input
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        prefix={
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: normalized,
              display: 'inline-block',
              border: '1px solid rgba(15, 23, 42, 0.12)',
            }}
          />
        }
      />
    </Flex>
  )
}

export function UiSettingsPage() {
  const { settings, save, loading } = useAppUi()
  const [form] = Form.useForm<UiSettingsFormValues>()
  const [saving, setSaving] = useState(false)
  const watchedValues = Form.useWatch([], form)
  const preview = { ...defaultAppUiSettings, ...settings, ...(watchedValues || {}) }
  const previewShadow = buildShadowValue(preview, 1)

  useEffect(() => {
    form.setFieldsValue({ ...defaultAppUiSettings, ...settings })
  }, [form, settings])

  async function handleSubmit(values: UiSettingsFormValues) {
    setSaving(true)
    try {
      await save({
        ...values,
        appDescription: typeof values.appDescription === 'string' ? values.appDescription.trim() : '',
      })
      message.success('Đã cập nhật giao diện CMS')
    } finally {
      setSaving(false)
    }
  }

  function handleResetDefaults() {
    form.setFieldsValue(defaultAppUiSettings)
  }

  function handleApplyCompanyPreset() {
    const companyType = (form.getFieldValue('companyType') || defaultAppUiSettings.companyType) as CompanyType
    form.setFieldValue('enabledModules', companyTypeModulePresets[companyType] || [])
    message.success('Đã áp preset module theo loại hình công ty')
  }

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <Flex align="start" justify="space-between" gap={16} wrap>
        <div>
          <Typography.Title level={3} style={{ marginBottom: 4 }}>
            Giao diện CMS
          </Typography.Title>
          <Typography.Paragraph style={{ margin: 0 }}>
            Tuỳ biến sâu màu sắc và phong cách CMS cho nền, đầu trang, menu, chữ và nút bấm.
          </Typography.Paragraph>
        </div>
        <Button icon={<UndoOutlined />} onClick={handleResetDefaults}>
          Khôi phục preset mặc định
        </Button>
      </Flex>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Row gutter={[16, 16]}>
          <Col lg={15} xs={24}>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Card className="glass-card settings-card" title="Nhận diện ứng dụng">
                <Row gutter={[16, 0]}>
                  <Col md={12} xs={24}>
                    <Form.Item label="Loại hình công ty" name="companyType" rules={[{ required: true, message: 'Chọn loại hình' }]}>
                      <Select
                        options={companyTypeOptions.map((item) => ({ value: item.value, label: item.label }))}
                        placeholder="Chọn loại hình doanh nghiệp"
                      />
                    </Form.Item>
                  </Col>
                  <Col md={12} xs={24}>
                    <Form.Item label="Tên app" name="appName" rules={[{ required: true, message: 'Nhập tên app' }]}>
                      <Input placeholder="Ví dụ: Thiện Chánh CMS" />
                    </Form.Item>
                  </Col>
                  <Col md={12} xs={24}>
                    <Form.Item label="URL icon app" name="appIconUrl">
                      <ImagePickerInput placeholder="https://.../icon.png" />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item label="Mô tả app" name="appDescription">
                      <Input.TextArea placeholder="Mô tả ngắn cho CMS" rows={3} />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              <Card
                className="glass-card settings-card"
                extra={
                  <Button size="small" type="default" onClick={handleApplyCompanyPreset}>
                    Áp preset theo loại hình
                  </Button>
                }
                title="Bật / tắt module sử dụng"
              >
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <Typography.Paragraph style={{ margin: 0 }}>
                    `companyType` chỉ là quick action để gợi ý bộ module. Module nào hiển thị thực tế sẽ phụ thuộc vào danh sách bật/tắt bên dưới.
                  </Typography.Paragraph>
                  <Form.Item name="enabledModules" style={{ marginBottom: 0 }}>
                    <Checkbox.Group style={{ width: '100%' }}>
                      <Space direction="vertical" size={14} style={{ width: '100%' }}>
                        {appModuleGroups.map((group) => (
                          <div key={group.key}>
                            <Typography.Title level={5} style={{ marginBottom: 10 }}>
                              {resolveMenuGroupLabel(group.key, group.label, preview.companyType)}
                            </Typography.Title>
                            <Row gutter={[12, 12]}>
                              {group.modules.map((moduleKey) => (
                                <Col key={moduleKey} md={12} xs={24}>
                                  <Checkbox value={moduleKey}>{appModuleLabels[moduleKey] || moduleKey}</Checkbox>
                                </Col>
                              ))}
                            </Row>
                          </div>
                        ))}
                      </Space>
                    </Checkbox.Group>
                  </Form.Item>
                </Space>
              </Card>

              {colorSections.map((section) => (
                <Card key={section.title} className="glass-card settings-card" title={section.title}>
                  <Row gutter={[16, 0]}>
                    {section.fields.map((field) => (
                      <Col key={field.name} md={12} xs={24}>
                        <Form.Item label={field.label} name={field.name} rules={colorRules}>
                          <ColorInput placeholder="#000000" />
                        </Form.Item>
                      </Col>
                    ))}
                  </Row>
                </Card>
              ))}

              <Card className="glass-card settings-card" title="Kích thước & bo góc">
                <Row gutter={[16, 0]}>
                  <Col md={12} xs={24}>
                    <Form.Item label="Kích thước giao diện" name="size" rules={[{ required: true }]}>
                      <Radio.Group optionType="button" buttonStyle="solid" options={sizeOptions} />
                    </Form.Item>
                  </Col>
                  <Col md={12} xs={24}>
                    <Form.Item label="Độ bo góc" name="borderRadius" rules={[{ required: true }]}>
                      <InputNumber min={0} max={32} style={{ width: '100%' }} addonBefore={<BorderOutlined />} />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              <Card className="glass-card settings-card" title="Phông chữ">
                <Form.Item label="Chọn font" name="fontFamily" rules={[{ required: true }]}>
                  <Select
                    options={fontFamilyOptions.map((font) => ({ value: font.value, label: font.label }))}
                    placeholder="Chọn font cho CMS"
                    suffixIcon={<FontSizeOutlined />}
                  />
                </Form.Item>
              </Card>

              <Card className="glass-card settings-card" title="Đổ bóng">
                <Row gutter={[16, 0]}>
                  <Col md={12} xs={24}>
                    <Form.Item label="Màu bóng" name="shadowColor" rules={colorRules}>
                      <ColorInput placeholder="#0f172a" />
                    </Form.Item>
                  </Col>
                  <Col md={12} xs={24}>
                    <Form.Item label="Opacity (%)" name="shadowOpacity" rules={[{ required: true }]}>
                      <InputNumber min={0} max={100} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col md={12} xs={24}>
                    <Form.Item label="Độ mờ" name="shadowBlur" rules={[{ required: true }]}>
                      <InputNumber min={0} max={60} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col md={12} xs={24}>
                    <Form.Item label="Độ lệch Y" name="shadowOffsetY" rules={[{ required: true }]}>
                      <InputNumber min={0} max={24} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </Space>
          </Col>

          <Col lg={9} xs={24}>
            <div className="ui-settings-preview-sticky">
            <Card className="glass-card settings-card" title="Xem trước nhanh">
              <div
                style={{
                  background: preview.pageBgColor,
                  border: `1px solid ${preview.surfaceBorderColor}`,
                  borderRadius: preview.borderRadius + 4,
                  overflow: 'hidden',
                  boxShadow: previewShadow,
                }}
              >
                <div
                  style={{
                    background: preview.headerBgColor,
                    borderBottom: `1px solid ${preview.headerBorderColor}`,
                    boxShadow: previewShadow,
                    color: preview.headerTextColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                  }}
                >
                  <Flex align="center" gap={10}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: preview.borderRadius,
                        background: preview.primaryColor,
                        color: preview.buttonPrimaryTextColor,
                        display: 'grid',
                        placeItems: 'center',
                        overflow: 'hidden',
                        fontWeight: 800,
                      }}
                    >
                      {preview.appIconUrl ? (
                        <img alt={preview.appName} src={preview.appIconUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        preview.appName.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div style={{ color: preview.titleColor, fontSize: 14, fontWeight: 800 }}>{preview.appName}</div>
                      {preview.appDescription ? (
                        <div style={{ color: preview.textMutedColor, fontSize: 10 }}>{preview.appDescription}</div>
                      ) : null}
                    </div>
                  </Flex>
                  <Button
                    size="small"
                    style={{
                      background: preview.buttonDefaultBgColor,
                      color: preview.buttonDefaultTextColor,
                      borderColor: preview.buttonDefaultBorderColor,
                    }}
                  >
                    Tài khoản
                  </Button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '108px minmax(0, 1fr)', minHeight: 260 }}>
                  <div style={{ background: preview.menuBgColor, borderRight: `1px solid ${preview.surfaceBorderColor}`, padding: 10 }}>
                    <div style={{ color: preview.menuGroupTextColor, fontSize: 11, fontWeight: 800, marginBottom: 8, textTransform: 'uppercase' }}>
                      Điều hướng
                    </div>
                    <div style={{ display: 'grid', gap: 6 }}>
                      <div style={{ padding: '8px 10px', borderRadius: preview.borderRadius - 2, color: preview.menuTextColor }}>Dashboard</div>
                      <div
                        style={{
                          padding: '8px 10px',
                          borderRadius: preview.borderRadius - 2,
                          background: preview.menuHoverBgColor,
                          color: preview.menuTextColor,
                        }}
                      >
                        Hover item
                      </div>
                      <div
                        style={{
                          padding: '8px 10px',
                          borderRadius: preview.borderRadius - 2,
                          background: preview.menuActiveBgColor,
                          color: preview.menuActiveTextColor,
                          fontWeight: 700,
                        }}
                      >
                        Active item
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: 14 }}>
                    <div
                      style={{
                        background: preview.surfaceColor,
                        border: `1px solid ${preview.surfaceBorderColor}`,
                        borderRadius: preview.borderRadius,
                        padding: 14,
                        boxShadow: previewShadow,
                      }}
                    >
                      <div style={{ color: preview.titleColor, fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Tiêu đề nội dung</div>
                      <div style={{ color: preview.textColor, fontSize: 13, marginBottom: 4 }}>
                        Đây là text chính để bạn kiểm tra độ tương phản và cảm giác tổng thể.
                      </div>
                      <div style={{ color: preview.textMutedColor, fontSize: 12, marginBottom: 14 }}>
                        Text phụ cho mô tả, trạng thái, ghi chú và metadata.
                      </div>
                      <Flex gap={8} wrap>
                        <Button
                          type="primary"
                          style={{
                            background: preview.primaryColor,
                            color: preview.buttonPrimaryTextColor,
                          }}
                        >
                          Primary
                        </Button>
                        <Button
                          style={{
                            background: preview.buttonDefaultBgColor,
                            color: preview.buttonDefaultTextColor,
                            borderColor: preview.buttonDefaultBorderColor,
                          }}
                        >
                          Default
                        </Button>
                      </Flex>
                    </div>
                  </div>
                </div>
              </div>

              <Space direction="vertical" size={8} style={{ width: '100%', marginTop: 16 }}>
                <Typography.Text strong>Thiết lập hiện tại</Typography.Text>
                <Typography.Text type="secondary">Font: {fontFamilyOptions.find((font) => font.value === preview.fontFamily)?.label || preview.fontFamily}</Typography.Text>
                <Typography.Text type="secondary">Size: {preview.size}</Typography.Text>
                <Typography.Text type="secondary">Radius: {preview.borderRadius}px</Typography.Text>
                <Typography.Text type="secondary">Shadow: {preview.shadowOpacity}% / {preview.shadowBlur}px / y {preview.shadowOffsetY}px</Typography.Text>
              </Space>
            </Card>
            </div>
          </Col>

          <Col span={24}>
            <Flex justify="end">
              <Button htmlType="submit" loading={saving || loading} type="primary" icon={<BgColorsOutlined />}>
                Lưu UI settings
              </Button>
            </Flex>
          </Col>
        </Row>
      </Form>
    </Space>
  )
}
