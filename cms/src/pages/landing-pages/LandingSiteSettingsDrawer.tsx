import { PlusOutlined } from '@ant-design/icons'
import { Button, Card, Col, Drawer, Flex, Form, Input, InputNumber, Row, Select, Space, Switch, Tabs, Tag, Typography } from 'antd'
import { createContext, useContext } from 'react'
import { ImagePickerInput } from '../../components/ImagePickerInput'
import type { FooterColumn, LandingGlobalSetting, NavItem, SocialLink } from './site-settings'

export type LandingSiteSettingsContextValue = {
  open: boolean
  settings: LandingGlobalSetting
  globalSaving: boolean
  menuSaving: boolean
  onClose: () => void
  onSaveGlobal: () => void
  onSaveMenu: () => void
  onUpdate: (patch: Partial<LandingGlobalSetting>) => void
  onAddRootNavItem: () => void
  onPatchTreeNavItem: (id: string, patch: Partial<NavItem>) => void
  onAddTreeNavChild: (parentId: string, depth: number) => void
  onRemoveTreeNavItem: (id: string) => void
  onAddFooterColumn: () => void
  onUpdateFooterColumn: (id: string, patch: Partial<FooterColumn>) => void
  onRemoveFooterColumn: (id: string) => void
  onAddFooterLink: (colId: string) => void
  onUpdateFooterLink: (colId: string, linkId: string, patch: { label?: string; href?: string }) => void
  onRemoveFooterLink: (colId: string, linkId: string) => void
  onAddSocialLink: () => void
  onUpdateSocialLink: (id: string, patch: Partial<SocialLink>) => void
  onRemoveSocialLink: (id: string) => void
}

const LandingSiteSettingsContext = createContext<LandingSiteSettingsContextValue | null>(null)

export function LandingSiteSettingsProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value: LandingSiteSettingsContextValue
}) {
  return <LandingSiteSettingsContext.Provider value={value}>{children}</LandingSiteSettingsContext.Provider>
}

export function useLandingSiteSettings() {
  const context = useContext(LandingSiteSettingsContext)
  if (!context) {
    throw new Error('useLandingSiteSettings must be used within LandingSiteSettingsProvider')
  }
  return context
}

function NavEditorTree({
  items,
  depth = 1,
}: {
  items: NavItem[]
  depth?: number
}) {
  const { onPatchTreeNavItem, onAddTreeNavChild, onRemoveTreeNavItem } = useLandingSiteSettings()

  return (
    <Space direction="vertical" size={8} style={{ width: '100%' }}>
      {items.map((item, idx) => (
        <Card key={item.id} size="small" className="glass-card">
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            <Flex align="center" justify="space-between" gap={12} wrap="wrap">
              <Space size={8} wrap>
                <Tag bordered={false} color="gold">Cấp {depth}</Tag>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>Mục {idx + 1}</Typography.Text>
              </Space>
              <Space size={6} wrap>
                {depth < 3 && (
                  <Button size="small" icon={<PlusOutlined />} onClick={() => onAddTreeNavChild(item.id, depth)}>
                    Thêm cấp {depth + 1}
                  </Button>
                )}
                <Button size="small" danger onClick={() => onRemoveTreeNavItem(item.id)}>Xoá</Button>
              </Space>
            </Flex>

            <Row gutter={[8, 8]} align="middle">
              <Col xs={24} md={8}>
                <Input size="small" value={item.label} placeholder="Nhãn hiển thị" onChange={(e) => onPatchTreeNavItem(item.id, { label: e.target.value })} />
              </Col>
              <Col xs={24} md={9}>
                <Input size="small" value={item.href} placeholder="/duong-dan" onChange={(e) => onPatchTreeNavItem(item.id, { href: e.target.value })} />
              </Col>
              <Col xs={24} md={7}>
                <Select
                  size="small"
                  style={{ width: '100%' }}
                  value={item.target ?? '_self'}
                  onChange={(value) => onPatchTreeNavItem(item.id, { target: value as NavItem['target'] })}
                  options={[{ value: '_self', label: 'Cùng tab' }, { value: '_blank', label: 'Tab mới' }]}
                />
              </Col>
            </Row>

            {item.children && item.children.length > 0 ? (
              <div style={{ paddingLeft: 12, borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
                <NavEditorTree items={item.children} depth={depth + 1} />
              </div>
            ) : null}
          </Space>
        </Card>
      ))}
    </Space>
  )
}

export function LandingSiteSettingsDrawer() {
  const {
    open,
    settings,
    globalSaving,
    menuSaving,
    onClose,
    onSaveGlobal,
    onSaveMenu,
    onUpdate,
    onAddRootNavItem,
    onAddFooterColumn,
    onUpdateFooterColumn,
    onRemoveFooterColumn,
    onAddFooterLink,
    onUpdateFooterLink,
    onRemoveFooterLink,
    onAddSocialLink,
    onUpdateSocialLink,
    onRemoveSocialLink,
  } = useLandingSiteSettings()

  return (
    <Drawer
      title="Cài đặt site"
      width={860}
      open={open}
      onClose={onClose}
      rootClassName="quick-drawer"
      extra={
        <Button type="primary" loading={globalSaving} onClick={onSaveGlobal}>
          Lưu cài đặt
        </Button>
      }
    >
      <Tabs
        className="settings-inner-tabs"
        size="small"
        items={[
          {
            key: 'logo',
            label: 'Biểu trưng',
            children: (
              <Form layout="vertical" size="small">
                <Form.Item label="URL biểu trưng">
                  <ImagePickerInput value={settings.logoUrl} onChange={(url) => onUpdate({ logoUrl: url })} />
                </Form.Item>
                <Form.Item label="Mô tả ảnh">
                  <Input value={settings.logoAlt} onChange={(e) => onUpdate({ logoAlt: e.target.value })} placeholder="Tên thương hiệu" />
                </Form.Item>
                <Form.Item label="Chiều rộng (px)">
                  <InputNumber min={40} max={600} value={settings.logoWidth} onChange={(v) => onUpdate({ logoWidth: Number(v ?? 160) })} style={{ width: '100%' }} />
                </Form.Item>
              </Form>
            ),
          },
          {
            key: 'menu',
            label: 'Thanh menu',
            children: (
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Typography.Text type="secondary">
                  Hỗ trợ tối đa 3 cấp menu. Từ cấp 1 bạn có thể thêm cấp 2, và từ cấp 2 có thể thêm cấp 3.
                </Typography.Text>
                <Flex justify="space-between" align="center" gap={12} wrap="wrap">
                  <Typography.Text type="secondary">
                    Menu này lưu riêng và dùng chung cho toàn bộ website, bao gồm cả landing page.
                  </Typography.Text>
                  <Button type="primary" loading={menuSaving} onClick={onSaveMenu}>
                    Lưu menu
                  </Button>
                </Flex>
                <NavEditorTree items={settings.menuItems ?? []} />
                <Button size="small" icon={<PlusOutlined />} onClick={onAddRootNavItem}>Thêm mục menu</Button>
              </Space>
            ),
          },
          {
            key: 'header',
            label: 'Đầu trang',
            children: (
              <Form layout="vertical" size="small">
                <Form.Item label="Cố định khi cuộn">
                  <Switch checked={settings.headerSticky} onChange={(v) => onUpdate({ headerSticky: v })} />
                </Form.Item>
                <Form.Item label="Màu nền đầu trang (hex)">
                  <Input
                    value={settings.headerBgColor}
                    onChange={(e) => onUpdate({ headerBgColor: e.target.value })}
                    placeholder="#ffffff"
                    prefix={
                      <span
                        style={{
                          display: 'inline-block',
                          width: 14,
                          height: 14,
                          borderRadius: 2,
                          background: settings.headerBgColor || '#ffffff',
                          border: '1px solid #d9d9d9',
                        }}
                      />
                    }
                  />
                </Form.Item>
                <Form.Item label="Nút CTA - Nhãn">
                  <Input value={settings.headerCtaLabel} onChange={(e) => onUpdate({ headerCtaLabel: e.target.value })} placeholder="Đặt lịch ngay" />
                </Form.Item>
                <Form.Item label="Nút CTA - Liên kết">
                  <Input value={settings.headerCtaHref} onChange={(e) => onUpdate({ headerCtaHref: e.target.value })} placeholder="/dat-lich" />
                </Form.Item>
              </Form>
            ),
          },
          {
            key: 'footer',
            label: 'Chân trang',
            children: (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Form layout="vertical" size="small">
                  <Form.Item label="Bản quyền">
                    <Input value={settings.footerCopyright} onChange={(e) => onUpdate({ footerCopyright: e.target.value })} placeholder="(c) 2025 Clinic. Bảo lưu mọi quyền." />
                  </Form.Item>
                </Form>

                <Typography.Text strong style={{ fontSize: 13 }}>Các cột chân trang</Typography.Text>
                {(settings.footerColumns ?? []).map((col) => (
                  <Card
                    key={col.id}
                    size="small"
                    className="glass-card"
                    title={
                      <Input
                        size="small"
                        value={col.title}
                        onChange={(e) => onUpdateFooterColumn(col.id, { title: e.target.value })}
                        placeholder="Tiêu đề cột"
                        style={{ fontWeight: 600 }}
                      />
                    }
                    extra={<Button size="small" danger onClick={() => onRemoveFooterColumn(col.id)}>Xoá</Button>}
                  >
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      {col.links.map((link) => (
                        <Row key={link.id} gutter={4} align="middle">
                          <Col span={10}>
                            <Input size="small" value={link.label} placeholder="Nhãn" onChange={(e) => onUpdateFooterLink(col.id, link.id, { label: e.target.value })} />
                          </Col>
                          <Col span={11}>
                            <Input size="small" value={link.href} placeholder="/duong-dan" onChange={(e) => onUpdateFooterLink(col.id, link.id, { href: e.target.value })} />
                          </Col>
                          <Col span={3}>
                            <Button size="small" danger block onClick={() => onRemoveFooterLink(col.id, link.id)}>Xoá</Button>
                          </Col>
                        </Row>
                      ))}
                      <Button size="small" icon={<PlusOutlined />} onClick={() => onAddFooterLink(col.id)}>Thêm liên kết</Button>
                    </Space>
                  </Card>
                ))}
                <Button size="small" icon={<PlusOutlined />} onClick={onAddFooterColumn}>Thêm cột</Button>

                <Typography.Text strong style={{ fontSize: 13 }}>Mạng xã hội</Typography.Text>
                {(settings.footerSocialLinks ?? []).map((s) => (
                  <Row key={s.id} gutter={8} align="middle">
                    <Col span={7}>
                      <Input size="small" value={s.platform} placeholder="Facebook" onChange={(e) => onUpdateSocialLink(s.id, { platform: e.target.value })} />
                    </Col>
                    <Col span={14}>
                      <Input size="small" value={s.url} placeholder="https://facebook.com/..." onChange={(e) => onUpdateSocialLink(s.id, { url: e.target.value })} />
                    </Col>
                    <Col span={3}>
                      <Button size="small" danger block onClick={() => onRemoveSocialLink(s.id)}>Xoá</Button>
                    </Col>
                  </Row>
                ))}
                <Button size="small" icon={<PlusOutlined />} onClick={onAddSocialLink}>Thêm mạng xã hội</Button>
              </Space>
            ),
          },
        ]}
      />
    </Drawer>
  )
}
