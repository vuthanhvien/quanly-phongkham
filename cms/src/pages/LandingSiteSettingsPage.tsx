import { useEffect, useState } from 'react'
import { Typography, message } from 'antd'
import { api } from '../api'
import { createId } from '../utils/createId'
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

export function LandingSiteSettingsPage() {
  const [settings, setSettings] = useState<LandingGlobalSetting>(emptyGlobal())
  const [globalSaving, setGlobalSaving] = useState(false)
  const [menuSaving, setMenuSaving] = useState(false)

  useEffect(() => { void loadSettings() }, [])

  async function loadSettings() {
    try {
      const [globalResponse, menuResponse] = await Promise.all([
        api.get('/settings/landing-global'),
        api.get('/settings/landing-menu'),
      ])
      const global = (globalResponse.data?.data ?? globalResponse.data) as LandingGlobalSetting
      const menu = (menuResponse.data?.data ?? menuResponse.data) as NavItem[]
      setSettings({ ...emptyGlobal(), ...global, menuItems: normalizeNavTree(menu) })
    } catch {
      try {
        const response = await api.get('/settings/landing-global')
        const global = (response.data?.data ?? response.data) as LandingGlobalSetting
        setSettings({ ...emptyGlobal(), ...global, menuItems: normalizeNavTree(global.menuItems) })
      } catch {
        message.error('Không thể tải cài đặt site')
      }
    }
  }

  function update(patch: Partial<LandingGlobalSetting>) {
    setSettings((current) => ({ ...current, ...patch }))
  }

  async function saveGlobal() {
    setGlobalSaving(true)
    try {
      const { menuItems, ...payload } = settings
      await api.put('/settings/landing-global', payload)
      message.success('Đã lưu cài đặt site')
    } finally {
      setGlobalSaving(false)
    }
  }

  async function saveMenu() {
    setMenuSaving(true)
    try {
      await api.put('/settings/landing-menu', { menuItems: settings.menuItems ?? [] })
      message.success('Đã lưu menu dùng chung')
    } catch {
      await api.put('/settings/landing-global', { menuItems: settings.menuItems ?? [] })
      message.success('Đã lưu menu qua cài đặt site')
    } finally {
      setMenuSaving(false)
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
          <Typography.Title level={3}>Cài đặt site</Typography.Title>
          <Typography.Text type="secondary">Cấu hình dùng chung cho website và toàn bộ landing page.</Typography.Text>
        </div>
      </div>
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
    </>
  )
}
