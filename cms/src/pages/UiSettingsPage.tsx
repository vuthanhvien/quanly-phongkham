import { BgColorsOutlined, BorderOutlined, DownOutlined, FontSizeOutlined, HolderOutlined, UndoOutlined } from '@ant-design/icons'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button, Card, Checkbox, Col, Flex, Form, Input, InputNumber, Radio, Row, Select, Space, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import { buildShadowValue, companyTypeOptions, defaultAppUiSettings, fontFamilyOptions, syncDocumentBranding, useAppUi, type AppUiSettings } from '../app-ui'
import { appModuleGroups, appModuleLabels, appStandaloneModules, companyTypeModulePresets, resolveMenuGroupLabel, type AppModuleGroup, type CompanyType } from '../company-types'
import { ImagePickerInput } from '../components/ImagePickerInput'

type UiSettingsFormValues = AppUiSettings
type ModuleDndSection = AppModuleGroup & { standalone?: boolean }

function SettingsBlock({ children, extra, title }: { children: React.ReactNode; extra?: React.ReactNode; title: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <Card
      className={`glass-card settings-card collapsible-settings-block${collapsed ? ' is-collapsed' : ''}`}
      extra={extra}
      title={(
        <button
          aria-expanded={!collapsed}
          className="collapsible-settings-block-trigger"
          onClick={() => setCollapsed((value) => !value)}
          type="button"
        >
          <DownOutlined />
          <span>{title}</span>
        </button>
      )}
    >
      {!collapsed && children}
    </Card>
  )
}

function SortableModuleRow({
  checked,
  label,
  moduleKey,
  onCheckedChange,
}: {
  checked: boolean
  label: string
  moduleKey: string
  onCheckedChange: (checked: boolean) => void
}) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({ id: moduleKey })
  return (
    <div
      className={`module-dnd-module${checked ? ' is-enabled' : ''}${isDragging ? ' is-dragging' : ''}`}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <span
        aria-label={`Kéo module ${label}`}
        className="module-dnd-handle module-dnd-handle--module"
        {...attributes}
        {...listeners}
      >
        <HolderOutlined />
      </span>
      <Checkbox checked={checked} onChange={(event) => onCheckedChange(event.target.checked)}>
        {label}
      </Checkbox>
    </div>
  )
}

function SortableModuleSection({
  group,
  onGroupCheckedChange,
  onModuleCheckedChange,
  onModuleDragEnd,
  selectedCompanyType,
  selectedModules,
}: {
  group: ModuleDndSection
  onGroupCheckedChange: (moduleKeys: string[], checked: boolean) => void
  onModuleCheckedChange: (moduleKey: string, checked: boolean) => void
  onModuleDragEnd: (groupKey: string, event: DragEndEvent) => void
  selectedCompanyType: CompanyType
  selectedModules: string[]
}) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({ id: group.key })
  const childSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const selectedCount = group.modules.filter((moduleKey) => selectedModules.includes(moduleKey)).length
  const isStandalone = Boolean(group.standalone)
  const title = isStandalone
    ? appModuleLabels[group.modules[0]] || group.label
    : resolveMenuGroupLabel(group.key, group.label, selectedCompanyType)

  return (
    <div
      className={`module-dnd-group${isStandalone ? ' module-dnd-group--single' : ''}${isDragging ? ' is-dragging' : ''}`}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div className="module-dnd-group-head">
        <span
          aria-label={`Kéo ${isStandalone ? 'mục' : 'nhóm'} ${title}`}
          className="module-dnd-handle"
          {...attributes}
          {...listeners}
        >
          <HolderOutlined />
        </span>
        <Checkbox
          checked={selectedCount === group.modules.length}
          indeterminate={!isStandalone && selectedCount > 0 && selectedCount < group.modules.length}
          onChange={(event) => onGroupCheckedChange(group.modules, event.target.checked)}
        >
          <Typography.Text strong>{title}</Typography.Text>
        </Checkbox>
        {!isStandalone && <span className="module-dnd-count">{selectedCount}/{group.modules.length}</span>}
      </div>
      {!isStandalone && (
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={(event) => onModuleDragEnd(group.key, event)}
          sensors={childSensors}
        >
          <SortableContext items={group.modules} strategy={verticalListSortingStrategy}>
            <div className="module-dnd-module-list">
              {group.modules.map((moduleKey) => (
                <SortableModuleRow
                  checked={selectedModules.includes(moduleKey)}
                  key={moduleKey}
                  label={appModuleLabels[moduleKey] || moduleKey}
                  moduleKey={moduleKey}
                  onCheckedChange={(checked) => onModuleCheckedChange(moduleKey, checked)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

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
      { name: 'buttonPrimaryBgColor', label: 'Nền nút chính' },
      { name: 'buttonPrimaryTextColor', label: 'Chữ nút chính' },
      { name: 'buttonPrimaryBorderColor', label: 'Viền nút chính' },
      { name: 'buttonDefaultBgColor', label: 'Nền nút thường' },
      { name: 'buttonDefaultTextColor', label: 'Chữ nút thường' },
      { name: 'buttonDefaultBorderColor', label: 'Viền nút thường' },
      { name: 'buttonSecondaryBgColor', label: 'Nền nút secondary' },
      { name: 'buttonSecondaryTextColor', label: 'Chữ nút secondary' },
      { name: 'buttonSecondaryBorderColor', label: 'Viền nút secondary' },
      { name: 'buttonSuccessBgColor', label: 'Nền nút success' },
      { name: 'buttonSuccessTextColor', label: 'Chữ nút success' },
      { name: 'buttonSuccessBorderColor', label: 'Viền nút success' },
      { name: 'buttonInfoBgColor', label: 'Nền nút info' },
      { name: 'buttonInfoTextColor', label: 'Chữ nút info' },
      { name: 'buttonInfoBorderColor', label: 'Viền nút info' },
      { name: 'buttonWarningBgColor', label: 'Nền nút warning' },
      { name: 'buttonWarningTextColor', label: 'Chữ nút warning' },
      { name: 'buttonWarningBorderColor', label: 'Viền nút warning' },
      { name: 'buttonErrorBgColor', label: 'Nền nút error' },
      { name: 'buttonErrorTextColor', label: 'Chữ nút error' },
      { name: 'buttonErrorBorderColor', label: 'Viền nút error' },
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
          padding: 0,
          background: 'transparent',
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
  const draftAppName = Form.useWatch('appName', form)
  const selectedCompanyType = (Form.useWatch('companyType', form) || settings.companyType || defaultAppUiSettings.companyType) as CompanyType
  const [selectedModules, setSelectedModules] = useState<string[]>([])
  const [moduleGroups, setModuleGroups] = useState<ModuleDndSection[]>(() => buildOrderedModuleGroups([]))
  const [hasCustomModuleSelection, setHasCustomModuleSelection] = useState(false)
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    const usesPreset = !settings.hasCustomModuleSelection
    const enabledModules = usesPreset ? companyTypeModulePresets[settings.companyType] || [] : settings.enabledModules
    form.setFieldsValue({
      ...defaultAppUiSettings,
      ...settings,
      enabledModules,
    })
    setSelectedModules(enabledModules.map(String))
    setModuleGroups(buildOrderedModuleGroups(enabledModules.map(String)))
    setHasCustomModuleSelection(!usesPreset)
  }, [form, settings])

  useEffect(() => {
    document.title = String(draftAppName || settings.appName || defaultAppUiSettings.appName).trim() || defaultAppUiSettings.appName
  }, [draftAppName, settings.appName])

  async function handleSubmit(values: UiSettingsFormValues) {
    setSaving(true)
    const modulePayload = {
      enabledModules: selectedModules,
      hasCustomModuleSelection,
    }
    try {
      const next = await save({
        ...values,
        ...modulePayload,
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
    const presetModules = companyTypeModulePresets[defaultAppUiSettings.companyType].map(String)
    setSelectedModules(presetModules)
    setModuleGroups(buildOrderedModuleGroups(presetModules))
    setHasCustomModuleSelection(false)
  }

  function setGroupModules(moduleKeys: string[], checked: boolean) {
    setSelectedModules((current) => {
      const selected = new Set(current)
      moduleKeys.forEach((moduleKey) => checked ? selected.add(moduleKey) : selected.delete(moduleKey))
      return serializeSelectedModules(moduleGroups, selected)
    })
    setHasCustomModuleSelection(true)
  }

  function setModuleChecked(moduleKey: string, checked: boolean) {
    setSelectedModules((current) => {
      const selected = new Set(current)
      if (checked) selected.add(moduleKey)
      else selected.delete(moduleKey)
      return serializeSelectedModules(moduleGroups, selected)
    })
    setHasCustomModuleSelection(true)
  }

  function reorderModuleGroup(event: DragEndEvent) {
    const fromKey = String(event.active.id)
    const toKey = event.over?.id ? String(event.over.id) : ""
    if (!toKey || fromKey === toKey) return
    setModuleGroups((current) => {
      const fromIndex = current.findIndex((group) => group.key === fromKey)
      const toIndex = current.findIndex((group) => group.key === toKey)
      if (fromIndex < 0 || toIndex < 0) return current
      const next = arrayMove(current, fromIndex, toIndex)
      setSelectedModules(serializeSelectedModules(next, new Set(selectedModules)))
      return next
    })
    setHasCustomModuleSelection(true)
  }

  function reorderModuleInGroup(targetGroupKey: string, event: DragEndEvent) {
    const fromKey = String(event.active.id)
    const toKey = event.over?.id ? String(event.over.id) : ""
    if (!toKey || fromKey === toKey) return
    setModuleGroups((current) => {
      const next = current.map((group) => ({ ...group, modules: [...group.modules] }))
      const group = next.find((item) => item.key === targetGroupKey)
      if (!group) return current
      const fromIndex = group.modules.indexOf(fromKey)
      const toIndex = group.modules.indexOf(toKey)
      if (fromIndex < 0 || toIndex < 0) return current
      group.modules = arrayMove(group.modules, fromIndex, toIndex)
      setSelectedModules(serializeSelectedModules(next, new Set(selectedModules)))
      return next
    })
    setHasCustomModuleSelection(true)
  }

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <Flex align="start" justify="space-between" gap={16} wrap>
        <div>
          <Typography.Title className="page-title-with-icon" level={3} style={{ marginBottom: 4 }}>
            <BgColorsOutlined />
            <span>Giao diện CMS</span>
          </Typography.Title>
        </div>
        <Space>
          <Button icon={<UndoOutlined />} onClick={handleResetDefaults}>
            Khôi phục preset mặc định
          </Button>
        </Space>
      </Flex>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Row gutter={[16, 16]}>
          <Col lg={15} xs={24}>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <SettingsBlock title="Nhận diện ứng dụng">
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
                    <Form.Item extra="Dùng cho logo trong CMS và favicon trên tab trình duyệt. Hỗ trợ PNG, ICO, SVG." label="Favicon CMS / URL icon app" name="appIconUrl">
                      <ImagePickerInput placeholder="https://.../favicon.png" />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item label="Mô tả app" name="appDescription">
                      <Input.TextArea placeholder="Mô tả ngắn cho CMS" rows={3} />
                    </Form.Item>
                  </Col>
                </Row>
              </SettingsBlock>

              <SettingsBlock
                title="Bật / tắt module sử dụng"
              >
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <Flex align="center" justify="space-between" gap={12} wrap>
                    <Typography.Paragraph style={{ margin: 0 }}>
                      Kéo mục hoặc nhóm để đổi thứ tự menu cha, kéo module con để đổi thứ tự trong nhóm. Checkbox quyết định module nào được bật.
                    </Typography.Paragraph>
                    <Typography.Text type="secondary">{selectedModules.length} module đang bật</Typography.Text>
                  </Flex>
                  <DndContext collisionDetection={closestCenter} onDragEnd={reorderModuleGroup} sensors={dndSensors}>
                    <SortableContext items={moduleGroups.map((group) => group.key)} strategy={verticalListSortingStrategy}>
                      <div className="module-dnd-board">
                        {moduleGroups.map((group) => (
                          <SortableModuleSection
                            group={group}
                            key={group.key}
                            onGroupCheckedChange={setGroupModules}
                            onModuleCheckedChange={setModuleChecked}
                            onModuleDragEnd={reorderModuleInGroup}
                            selectedCompanyType={selectedCompanyType}
                            selectedModules={selectedModules}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </Space>
              </SettingsBlock>

              <SettingsBlock title="Màu sắc giao diện">
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
              </SettingsBlock>

              <SettingsBlock title="Hiển thị & hiệu ứng">
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
                        optionLabelProp="label"
                        options={fontFamilyOptions.map((font) => ({
                          value: font.value,
                          label: <span style={{ fontFamily: font.value }}>{font.label}</span>,
                        }))}
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
              </SettingsBlock>
            </Space>
          </Col>

          <Col lg={9} xs={24}>
            <Form.Item noStyle shouldUpdate>
              {() => {
                const preview = { ...defaultAppUiSettings, ...settings, ...form.getFieldsValue(true) }
                const previewShadow = buildShadowValue(preview, 1)
                return <div className="ui-settings-preview-sticky">
            <div className="ui-settings-preview-content">
              <Button block className="ui-settings-save-button ui-settings-save-button--top" icon={<BgColorsOutlined />} loading={saving || loading} onClick={() => form.submit()} type="primary">
                Lưu UI settings
              </Button>
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
                      <div style={{ padding: '8px 10px', borderRadius: preview.borderRadius - 2, color: preview.menuTextColor }}>Tổng quan</div>
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
                            background: preview.buttonPrimaryBgColor,
                            borderColor: preview.buttonPrimaryBorderColor,
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
                        {[
                          ['Secondary', preview.buttonSecondaryBgColor, preview.buttonSecondaryTextColor, preview.buttonSecondaryBorderColor],
                          ['Success', preview.buttonSuccessBgColor, preview.buttonSuccessTextColor, preview.buttonSuccessBorderColor],
                          ['Info', preview.buttonInfoBgColor, preview.buttonInfoTextColor, preview.buttonInfoBorderColor],
                          ['Warning', preview.buttonWarningBgColor, preview.buttonWarningTextColor, preview.buttonWarningBorderColor],
                          ['Error', preview.buttonErrorBgColor, preview.buttonErrorTextColor, preview.buttonErrorBorderColor],
                        ].map(([label, background, color, borderColor]) => (
                          <Button
                            key={label}
                            style={{ background, color, borderColor }}
                          >
                            {label}
                          </Button>
                        ))}
                      </Flex>
                    </div>
                  </div>
                </div>
              </div>

              <Space className="ui-settings-preview-summary" direction="vertical" size={8} style={{ width: '100%', marginTop: 16 }}>
                <Typography.Text strong>Thiết lập hiện tại</Typography.Text>
                <Typography.Text type="secondary">Font: {fontFamilyOptions.find((font) => font.value === preview.fontFamily)?.label || preview.fontFamily}</Typography.Text>
                <Typography.Text type="secondary">Size: {preview.size}</Typography.Text>
                <Typography.Text type="secondary">Radius: {preview.borderRadius}px</Typography.Text>
                <Typography.Text type="secondary">Shadow: {preview.shadowOpacity}% / {preview.shadowBlur}px / y {preview.shadowOffsetY}px</Typography.Text>
              </Space>
            </div>
                </div>
              }}
            </Form.Item>
          </Col>

        </Row>
      </Form>
    </Space>
  )
}

function buildOrderedModuleGroups(enabledModules: string[]) {
  const order = new Map(enabledModules.map((moduleKey, index) => [moduleKey, index]))
  const sections: ModuleDndSection[] = [
    ...appStandaloneModules.map((moduleKey) => ({
      key: `single:${moduleKey}`,
      label: appModuleLabels[moduleKey] || moduleKey,
      modules: [moduleKey],
      standalone: true,
    })),
    ...appModuleGroups,
  ]
  return sections
    .map((group, groupIndex) => ({
      ...group,
      modules: [...group.modules].sort((left, right) => {
        const leftOrder = order.get(left)
        const rightOrder = order.get(right)
        if (leftOrder !== undefined && rightOrder !== undefined) return leftOrder - rightOrder
        if (leftOrder !== undefined) return -1
        if (rightOrder !== undefined) return 1
        return group.modules.indexOf(left) - group.modules.indexOf(right)
      }),
      __order: Math.min(
        ...group.modules
          .map((moduleKey) => order.get(moduleKey))
          .filter((index): index is number => index !== undefined),
        Number.MAX_SAFE_INTEGER,
      ),
      __groupIndex: groupIndex,
    }))
    .sort((left, right) => {
      if (left.__order !== right.__order) return left.__order - right.__order
      return left.__groupIndex - right.__groupIndex
    })
    .map(({ __order, __groupIndex, ...group }) => group)
}

function serializeSelectedModules(groups: AppModuleGroup[], selected: Set<string>) {
  return groups.flatMap((group) => group.modules.filter((moduleKey) => selected.has(moduleKey)))
}
