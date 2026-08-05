import { BgColorsOutlined, BorderOutlined, DatabaseOutlined, FontSizeOutlined, UndoOutlined } from '@ant-design/icons'
import { Button, Card, Checkbox, Col, Flex, Form, Input, InputNumber, Popconfirm, Radio, Row, Select, Space, Typography, message } from 'antd'
import { api } from '../api'
import { useEffect, useState } from 'react'
import { buildShadowValue, companyTypeOptions, defaultAppUiSettings, fontFamilyOptions, syncDocumentBranding, useAppUi, type AppUiSettings } from '../app-ui'
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
  const [initializing, setInitializing] = useState(false)
  const draftAppName = Form.useWatch('appName', form)
  const selectedCompanyType = (Form.useWatch('companyType', form) || settings.companyType || defaultAppUiSettings.companyType) as CompanyType
  const selectedModules = Form.useWatch('enabledModules', form) || []

  useEffect(() => {
    const usesPreset = !settings.hasCustomModuleSelection
    form.setFieldsValue({
      ...defaultAppUiSettings,
      ...settings,
      enabledModules: usesPreset ? companyTypeModulePresets[settings.companyType] || [] : settings.enabledModules,
    })
  }, [form, settings])

  useEffect(() => {
    document.title = String(draftAppName || settings.appName || defaultAppUiSettings.appName).trim() || defaultAppUiSettings.appName
  }, [draftAppName, settings.appName])

  async function handleSubmit(values: UiSettingsFormValues) {
    setSaving(true)
    try {
      // Module selection is controlled by grouped checkboxes outside the hidden form field.
      // Read the live form store so a click immediately followed by Save is not lost.
      const currentValues = form.getFieldsValue(true) as UiSettingsFormValues
      const next = await save({
        ...values,
        enabledModules: Array.isArray(currentValues.enabledModules) ? currentValues.enabledModules.map(String) : [],
        hasCustomModuleSelection: Boolean(currentValues.hasCustomModuleSelection),
        appDescription: typeof values.appDescription === 'string' ? values.appDescription.trim() : '',
      })
      syncDocumentBranding(next)
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
    form.setFieldValue('hasCustomModuleSelection', true)
    message.success('Đã áp preset module theo loại hình công ty')
  }

  function setGroupModules(moduleKeys: string[], checked: boolean) {
    const selected = new Set<string>(((form.getFieldValue('enabledModules') || []) as unknown[]).map(String))
    moduleKeys.forEach((moduleKey) => checked ? selected.add(moduleKey) : selected.delete(moduleKey))
    form.setFieldsValue({ enabledModules: Array.from(selected), hasCustomModuleSelection: true })
  }

  function setGroupModuleValues(moduleKeys: string[], values: Array<string | number | boolean>) {
    const selected = new Set<string>(((form.getFieldValue('enabledModules') || []) as unknown[]).map(String))
    moduleKeys.forEach((moduleKey) => selected.delete(moduleKey))
    values.map(String).forEach((moduleKey) => selected.add(moduleKey))
    form.setFieldsValue({ enabledModules: Array.from(selected), hasCustomModuleSelection: true })
  }

  async function handleInitializeIndustryData() {
    setInitializing(true)
    try {
      const response = await api.post('/settings/app-ui/initialize-industry-data', { companyType: selectedCompanyType })
      const created = response.data.data?.created || {}
      message.success(`Đã khởi tạo: ${created.units || 0} đơn vị, ${created.categories || 0} nhóm hàng, ${created.products || 0} hàng mẫu`)
    } finally {
      setInitializing(false)
    }
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
        <Space>
          <Button icon={<UndoOutlined />} onClick={handleResetDefaults}>
            Khôi phục preset mặc định
          </Button>
          <Button loading={saving || loading} type="primary" icon={<BgColorsOutlined />} onClick={() => form.submit()}>
            Lưu UI settings
          </Button>
        </Space>
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
                  <Popconfirm
                    title="Khởi tạo dữ liệu theo ngành hàng?"
                    description="Chỉ bổ sung dữ liệu mẫu còn thiếu, không xóa dữ liệu hiện có."
                    okText="Khởi tạo"
                    cancelText="Hủy"
                    onConfirm={() => void handleInitializeIndustryData()}
                  >
                    <Button type="primary" icon={<DatabaseOutlined />} loading={initializing}>Khởi tạo dữ liệu</Button>
                  </Popconfirm>
                }
                title="Dữ liệu theo ngành hàng"
              >
                <Typography.Text>{companyTypeOptions.find((item) => item.value === selectedCompanyType)?.label}</Typography.Text>
              </Card>

              <Card
                className="glass-card settings-card"
                extra={
                  <Space size={8}>
                    <Button size="small" type="default" onClick={() => { form.setFieldValue('enabledModules', []); form.setFieldValue('hasCustomModuleSelection', true) }}>Bỏ chọn hết</Button>
                    <Button size="small" type="default" onClick={handleApplyCompanyPreset}>Áp preset theo loại hình</Button>
                  </Space>
                }
                title="Bật / tắt module sử dụng"
              >
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <Typography.Paragraph style={{ margin: 0 }}>
                    `companyType` chỉ là quick action để gợi ý bộ module. Module nào hiển thị thực tế sẽ phụ thuộc vào danh sách bật/tắt bên dưới.
                  </Typography.Paragraph>
                  <Form.Item name="hasCustomModuleSelection" hidden valuePropName="checked"><Checkbox /></Form.Item>
                  <Form.Item name="enabledModules" hidden><Checkbox.Group /></Form.Item>
                  <Space direction="vertical" size={14} style={{ width: '100%' }}>
                    {appModuleGroups.map((group) => {
                      const selectedCount = group.modules.filter((moduleKey) => selectedModules.includes(moduleKey)).length
                      const groupValues = group.modules.filter((moduleKey) => selectedModules.includes(moduleKey))
                      return (
                        <div key={group.key}>
                          <Checkbox
                            checked={selectedCount === group.modules.length}
                            indeterminate={selectedCount > 0 && selectedCount < group.modules.length}
                            onChange={(event) => setGroupModules(group.modules, event.target.checked)}
                            style={{ marginBottom: 10 }}
                          >
                            <Typography.Text strong>{resolveMenuGroupLabel(group.key, group.label, selectedCompanyType)}</Typography.Text>
                          </Checkbox>
                          <div style={{ paddingLeft: 28 }}>
                            <Checkbox.Group value={groupValues} style={{ width: '100%' }} onChange={(values) => setGroupModuleValues(group.modules, values)}>
                              <Row gutter={[12, 12]}>
                                {group.modules.map((moduleKey) => (
                                  <Col key={moduleKey} md={12} xs={24}>
                                    <Checkbox value={moduleKey}>{appModuleLabels[moduleKey] || moduleKey}</Checkbox>
                                  </Col>
                                ))}
                              </Row>
                            </Checkbox.Group>
                          </div>
                        </div>
                      )
                    })}
                  </Space>
                </Space>
              </Card>

              <Card className="glass-card settings-card" title="Màu sắc giao diện">
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  {colorSections.map((section) => (
                    <div key={section.title}>
                      <Typography.Text strong>{section.title}</Typography.Text>
                      <Row gutter={[16, 0]} style={{ marginTop: 8 }}>
                        {section.fields.map((field) => (
                          <Col key={field.name} lg={8} md={12} xs={24}>
                            <Form.Item label={field.label} name={field.name} rules={colorRules}>
                              <ColorInput placeholder="#000000" />
                            </Form.Item>
                          </Col>
                        ))}
                      </Row>
                    </div>
                  ))}
                </Space>
              </Card>

              <Card className="glass-card settings-card" title="Hiển thị & hiệu ứng">
                <Row gutter={[16, 0]}>
                  <Col lg={8} md={12} xs={24}>
                    <Form.Item label="Kích thước giao diện" name="size" rules={[{ required: true }]}>
                      <Radio.Group optionType="button" buttonStyle="solid" options={sizeOptions} />
                    </Form.Item>
                  </Col>
                  <Col lg={8} md={12} xs={24}>
                    <Form.Item label="Độ bo góc" name="borderRadius" rules={[{ required: true }]}>
                      <InputNumber min={0} max={32} style={{ width: '100%' }} addonBefore={<BorderOutlined />} />
                    </Form.Item>
                  </Col>
                  <Col lg={8} md={12} xs={24}>
                    <Form.Item label="Chọn font" name="fontFamily" rules={[{ required: true }]}>
                      <Select
                        options={fontFamilyOptions.map((font) => ({ value: font.value, label: font.label }))}
                        placeholder="Chọn font cho CMS"
                        suffixIcon={<FontSizeOutlined />}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={[16, 0]}>
                  <Col lg={8} md={12} xs={24}>
                    <Form.Item label="Màu bóng" name="shadowColor" rules={colorRules}>
                      <ColorInput placeholder="#0f172a" />
                    </Form.Item>
                  </Col>
                  <Col lg={8} md={12} xs={24}>
                    <Form.Item label="Opacity (%)" name="shadowOpacity" rules={[{ required: true }]}>
                      <InputNumber min={0} max={100} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col lg={8} md={12} xs={24}>
                    <Form.Item label="Độ mờ" name="shadowBlur" rules={[{ required: true }]}>
                      <InputNumber min={0} max={60} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col lg={8} md={12} xs={24}>
                    <Form.Item label="Độ lệch Y" name="shadowOffsetY" rules={[{ required: true }]}>
                      <InputNumber min={0} max={24} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </Space>
          </Col>

          <Col lg={9} xs={24}>
            <Form.Item noStyle shouldUpdate>
              {() => {
                const preview = { ...defaultAppUiSettings, ...settings, ...form.getFieldsValue(true) }
                const previewShadow = buildShadowValue(preview, 1)
                return <div className="ui-settings-preview-sticky">
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
              }}
            </Form.Item>
          </Col>

        </Row>
      </Form>
    </Space>
  )
}
