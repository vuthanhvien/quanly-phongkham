import { DeleteOutlined, EditOutlined, GlobalOutlined, PlusOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons'
import { Button, Card, Checkbox, Empty, Flex, Form, Input, Modal, Popconfirm, Space, Spin, Tooltip, Typography, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { ModalTitleBar } from '../components/ModalTitleBar'
import { createId } from '../utils/createId'
import { getApiErrorMessage } from '../utils/apiError'
import { LandingSiteSettingsPanel, LandingSiteSettingsProvider } from './landing-pages/LandingSiteSettingsDrawer'
import {
  createNavItem,
  emptyGlobal,
  normalizeNavTree,
  removeNavTreeItem,
  type FooterColumn,
  type LandingGlobalSetting,
  type NavItem,
  type SocialLink,
  updateNavTree,
} from './landing-pages/site-settings'

type LandingDomain = { id: string; name: string; domain: string }

const DEFAULT_DOMAIN_KEY = '__default__'

export function LandingSiteSettingsPage() {
  const [domains, setDomains] = useState<LandingDomain[]>([])
  const [selectedDomain, setSelectedDomain] = useState(DEFAULT_DOMAIN_KEY)
  const [domainsLoading, setDomainsLoading] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settings, setSettings] = useState<LandingGlobalSetting>(emptyGlobal())
  const [globalSaving, setGlobalSaving] = useState(false)
  const [menuSaving, setMenuSaving] = useState(false)
  const [editing, setEditing] = useState<LandingDomain | null>(null)
  const [domainModalOpen, setDomainModalOpen] = useState(false)
  const [fullscreenPopup, setFullscreenPopup] = useState(false)
  const [domainForm] = Form.useForm<{ name: string; domain: string }>()

  const selectedDomainRecord = useMemo(
    () => domains.find((item) => item.domain === selectedDomain) || null,
    [domains, selectedDomain],
  )
  const selectedDomainParam = selectedDomain === DEFAULT_DOMAIN_KEY ? undefined : selectedDomain

  useEffect(() => { void loadDomains() }, [])
  useEffect(() => { void loadSettings(selectedDomainParam) }, [selectedDomainParam])

  async function loadDomains() {
    setDomainsLoading(true)
    try {
      const domainsResponse = await api.get('/settings/landing-domains')
      const nextDomains = domainsResponse.data.data || []
      setDomains(nextDomains)
      setSelectedDomain((current) => {
        if (current === DEFAULT_DOMAIN_KEY || nextDomains.some((item: LandingDomain) => item.domain === current)) return current
        return DEFAULT_DOMAIN_KEY
      })
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Không tải được danh sách domain'))
    } finally {
      setDomainsLoading(false)
    }
  }

  async function loadSettings(domain?: string) {
    setSettingsLoading(true)
    try {
      const params = domain ? { domain } : undefined
      const [globalResponse, menuResponse] = await Promise.all([
        api.get('/settings/landing-global', { params }),
        api.get('/settings/landing-menu', { params }),
      ])
      const global = (globalResponse.data?.data ?? globalResponse.data) as LandingGlobalSetting
      const menu = (menuResponse.data?.data ?? menuResponse.data) as NavItem[]
      setSettings({ ...emptyGlobal(), ...global, menuItems: normalizeNavTree(menu) })
    } catch {
      try {
        const response = await api.get('/settings/landing-global', { params: domain ? { domain } : undefined })
        const global = (response.data?.data ?? response.data) as LandingGlobalSetting
        setSettings({ ...emptyGlobal(), ...global, menuItems: normalizeNavTree(global.menuItems) })
      } catch {
        message.error('Không thể tải cài đặt site')
      }
    } finally {
      setSettingsLoading(false)
    }
  }

  function update(patch: Partial<LandingGlobalSetting>) {
    setSettings((current) => ({ ...current, ...patch }))
  }

  async function saveGlobal() {
    setGlobalSaving(true)
    try {
      const { menuItems, ...payload } = settings
      await api.put('/settings/landing-global', payload, { params: selectedDomainParam ? { domain: selectedDomainParam } : undefined })
      message.success(selectedDomainParam ? `Đã lưu cài đặt site cho ${selectedDomainParam}` : 'Đã lưu cài đặt site mặc định')
    } finally {
      setGlobalSaving(false)
    }
  }

  async function saveMenu() {
    setMenuSaving(true)
    try {
      const params = selectedDomainParam ? { domain: selectedDomainParam } : undefined
      await api.put('/settings/landing-menu', { menuItems: settings.menuItems ?? [] }, { params })
      message.success(selectedDomainParam ? `Đã lưu menu cho ${selectedDomainParam}` : 'Đã lưu menu mặc định')
    } catch {
      await api.put('/settings/landing-global', { menuItems: settings.menuItems ?? [] }, { params: selectedDomainParam ? { domain: selectedDomainParam } : undefined })
      message.success('Đã lưu menu qua cài đặt site')
    } finally {
      setMenuSaving(false)
    }
  }

  async function setUseParentConfig(checked: boolean) {
    if (!selectedDomainParam) return
    update({ useParentConfig: checked })
    try {
      await api.put('/settings/landing-global', { useParentConfig: checked }, { params: { domain: selectedDomainParam } })
      message.success(checked ? 'Domain sẽ dùng cấu hình mặc định' : 'Đã bật cấu hình riêng cho domain')
      await loadSettings(selectedDomainParam)
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Không thể cập nhật cấu hình domain'))
      update({ useParentConfig: !checked })
    }
  }

  function openCreateDomain() {
    setEditing(null)
    domainForm.resetFields()
    setDomainModalOpen(true)
  }

  function openEditDomain(row: LandingDomain) {
    setEditing(row)
    domainForm.setFieldsValue({ name: row.name, domain: row.domain })
    setDomainModalOpen(true)
  }

  async function saveDomain(values: { name: string; domain: string }) {
    try {
      if (editing) await api.patch(`/settings/landing-domains/${encodeURIComponent(editing.domain)}`, values)
      else await api.post('/settings/landing-domains', values)
      message.success(editing ? 'Đã cập nhật domain' : 'Đã thêm domain')
      setDomainModalOpen(false)
      setFullscreenPopup(false)
      await loadDomains()
      setSelectedDomain(values.domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Không thể lưu domain'))
    }
  }

  async function removeDomain(domain: string) {
    try {
      await api.delete(`/settings/landing-domains/${encodeURIComponent(domain)}`)
      message.success('Đã gỡ domain')
      if (selectedDomain === domain) setSelectedDomain(DEFAULT_DOMAIN_KEY)
      await loadDomains()
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Không thể gỡ domain'))
    }
  }

  function addFooterColumn() {
    update({ footerColumns: [...(settings.footerColumns ?? []), { id: createId(), title: 'Cột mới', links: [] } satisfies FooterColumn] })
  }

  function updateFooterColumn(id: string, patch: Partial<FooterColumn>) {
    update({ footerColumns: (settings.footerColumns ?? []).map((column) => column.id === id ? { ...column, ...patch } : column) })
  }

  function removeFooterColumn(id: string) { update({ footerColumns: (settings.footerColumns ?? []).filter((column) => column.id !== id) }) }
  function addFooterLink(columnId: string) { update({ footerColumns: (settings.footerColumns ?? []).map((column) => column.id === columnId ? { ...column, links: [...column.links, { id: createId(), label: 'Link', href: '/' }] } : column) }) }
  function updateFooterLink(columnId: string, linkId: string, patch: { label?: string; href?: string }) { update({ footerColumns: (settings.footerColumns ?? []).map((column) => column.id === columnId ? { ...column, links: column.links.map((link) => link.id === linkId ? { ...link, ...patch } : link) } : column) }) }
  function removeFooterLink(columnId: string, linkId: string) { update({ footerColumns: (settings.footerColumns ?? []).map((column) => column.id === columnId ? { ...column, links: column.links.filter((link) => link.id !== linkId) } : column) }) }
  function addSocialLink() { update({ footerSocialLinks: [...(settings.footerSocialLinks ?? []), { id: createId(), platform: 'Facebook', url: '' }] }) }
  function updateSocialLink(id: string, patch: Partial<SocialLink>) { update({ footerSocialLinks: (settings.footerSocialLinks ?? []).map((link) => link.id === id ? { ...link, ...patch } : link) }) }
  function removeSocialLink(id: string) { update({ footerSocialLinks: (settings.footerSocialLinks ?? []).filter((link) => link.id !== id) }) }
  function addRootNavItem() { update({ menuItems: [...(settings.menuItems ?? []), createNavItem()] }) }
  function patchTreeNavItem(id: string, patch: Partial<NavItem>) { update({ menuItems: updateNavTree(settings.menuItems ?? [], id, (item) => ({ ...item, ...patch, children: patch.children ?? item.children ?? [] })) }) }
  function addTreeNavChild(parentId: string, depth: number) { if (depth < 3) update({ menuItems: updateNavTree(settings.menuItems ?? [], parentId, (item) => ({ ...item, children: [...(item.children ?? []), createNavItem(depth === 1 ? 'Menu cấp 2' : 'Menu cấp 3')] })) }) }
  function removeTreeNavItem(id: string) { update({ menuItems: removeNavTreeItem(settings.menuItems ?? [], id) }) }

  return (
    <>
      <div className="page-header">
        <div>
          <Typography.Title className="page-title-with-icon" level={3}>
            <SettingOutlined />
            <span>Cài đặt site</span>
          </Typography.Title>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => { void loadDomains(); void loadSettings(selectedDomainParam) }}>Làm mới</Button>
      </div>

      <div className="landing-site-settings-layout">
        <Card
          className="glass-card landing-domain-sidebar"
          title={<Space><GlobalOutlined /><span>Tên miền</span></Space>}
          extra={<Tooltip title="Thêm domain"><Button size="small" type="primary" icon={<PlusOutlined />} onClick={openCreateDomain} /></Tooltip>}
        >
          <Spin spinning={domainsLoading}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <button
                className={`landing-domain-card${selectedDomain === DEFAULT_DOMAIN_KEY ? ' is-active' : ''}`}
                onClick={() => setSelectedDomain(DEFAULT_DOMAIN_KEY)}
                type="button"
              >
                <span>
                  <strong>Mặc định</strong>
                  <small>Dùng khi domain chưa có cấu hình riêng</small>
                </span>
              </button>

              {domains.length ? domains.map((row) => (
                <button
                  className={`landing-domain-card${selectedDomain === row.domain ? ' is-active' : ''}`}
                  key={row.domain}
                  onClick={() => setSelectedDomain(row.domain)}
                  type="button"
                >
                  <span>
                    <strong>{row.name}</strong>
                    <small>{row.domain}</small>
                  </span>
                  <span className="landing-domain-card-actions" onClick={(event) => event.stopPropagation()}>
                    <Tooltip title="Sửa domain">
                      <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEditDomain(row)} />
                    </Tooltip>
                    <Popconfirm cancelText="Hủy" okButtonProps={{ danger: true }} okText="Gỡ" title={`Gỡ domain ${row.domain}?`} onConfirm={() => void removeDomain(row.domain)}>
                      <Tooltip title="Gỡ domain">
                        <Button danger size="small" type="text" icon={<DeleteOutlined />} />
                      </Tooltip>
                    </Popconfirm>
                  </span>
                </button>
              )) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có domain" />
              )}
            </Space>
          </Spin>
        </Card>

        <div className="landing-site-settings-main">
          <Card className="glass-card landing-site-selected-domain">
            <Flex align="center" justify="space-between" gap={12} wrap>
              <Space direction="vertical" size={0}>
                <Typography.Text type="secondary">Đang cấu hình</Typography.Text>
                <Typography.Text strong>{selectedDomainRecord ? `${selectedDomainRecord.name} — ${selectedDomainRecord.domain}` : 'Cấu hình mặc định'}</Typography.Text>
              </Space>
              {selectedDomainParam ? (
                <Checkbox checked={settings.useParentConfig !== false} onChange={(event) => void setUseParentConfig(event.target.checked)}>
                  Sử dụng cấu hình mặc định
                </Checkbox>
              ) : <Typography.Text type="secondary">Fallback chung</Typography.Text>}
            </Flex>
          </Card>
          <Spin spinning={settingsLoading}>
            {selectedDomainParam && settings.useParentConfig !== false ? (
              <Card className="glass-card landing-site-parent-empty">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={(
                    <Space direction="vertical" size={4}>
                      <Typography.Text strong>Domain này đang dùng cấu hình mặc định</Typography.Text>
                      <Typography.Text type="secondary">Tắt checkbox “Sử dụng cấu hình mặc định” để chỉnh cấu hình riêng.</Typography.Text>
                    </Space>
                  )}
                />
              </Card>
            ) : (
              <LandingSiteSettingsProvider value={{
                open: true, settings, globalSaving, menuSaving, onClose: () => undefined,
                onSaveGlobal: () => void saveGlobal(), onSaveMenu: () => void saveMenu(), onUpdate: update,
                onAddRootNavItem: addRootNavItem, onPatchTreeNavItem: patchTreeNavItem, onAddTreeNavChild: addTreeNavChild, onRemoveTreeNavItem: removeTreeNavItem,
                onAddFooterColumn: addFooterColumn, onUpdateFooterColumn: updateFooterColumn, onRemoveFooterColumn: removeFooterColumn,
                onAddFooterLink: addFooterLink, onUpdateFooterLink: updateFooterLink, onRemoveFooterLink: removeFooterLink,
                onAddSocialLink: addSocialLink, onUpdateSocialLink: updateSocialLink, onRemoveSocialLink: removeSocialLink,
              }}>
                <LandingSiteSettingsPanel />
              </LandingSiteSettingsProvider>
            )}
          </Spin>
        </div>
      </div>

      <Modal
        className={`quick-drawer${fullscreenPopup ? ' quick-drawer-fullscreen' : ''}`}
        destroyOnHidden
        footer={null}
        open={domainModalOpen}
        title={<ModalTitleBar fullscreen={fullscreenPopup} title={editing ? 'Cập nhật domain' : 'Thêm domain'} onToggleFullscreen={() => setFullscreenPopup((current) => !current)} />}
        width={fullscreenPopup ? 'calc(100vw - 24px)' : 560}
        onCancel={() => {
          setDomainModalOpen(false)
          setFullscreenPopup(false)
        }}
      >
        <Form form={domainForm} layout="vertical" onFinish={(values) => void saveDomain(values)}>
          <Form.Item label="Tên" name="name" rules={[{ required: true, message: 'Nhập tên' }]}>
            <Input placeholder="Website chính" />
          </Form.Item>
          <Form.Item label="Domain" name="domain" rules={[{ required: true, message: 'Nhập domain' }]} extra="Có thể kèm port, ví dụ clinic.example.com:8080.">
            <Input placeholder="clinic.example.com:8080" />
          </Form.Item>
          <Space>
            <Button className="primary-glow" htmlType="submit" type="primary">Lưu</Button>
            <Button onClick={() => { setDomainModalOpen(false); setFullscreenPopup(false) }}>Hủy</Button>
          </Space>
        </Form>
      </Modal>
    </>
  )
}
