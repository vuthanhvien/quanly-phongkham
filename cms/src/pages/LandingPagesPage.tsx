import {
  DeleteOutlined,
  DesktopOutlined,
  EditOutlined,
  EyeOutlined,
  MobileOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  SettingOutlined,
  TabletOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Collapse,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Row,
  Col,
  Select,
  Space,
  Switch,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd'
import { createId } from '../utils/createId'
import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api'
import { ImagePickerInput } from '../components/ImagePickerInput'
import type { LandingBlock, LandingBlockType, LandingFormField, LandingPage, LandingSectionWidth, LandingSlide } from '../models'
import { LandingThemeEditor } from './LandingThemePage'
import { BlockComposerModal, BlockComposerProvider } from './landing-pages/BlockComposerModal'
import { LandingSiteSettingsDrawer, LandingSiteSettingsProvider } from './landing-pages/LandingSiteSettingsDrawer'
import { SectionsTreeCard } from './landing-pages/SectionsTreeCard'
import { TemplatePickerModal } from './landing-pages/TemplatePickerModal'
import {
  blockTypeIcons,
  blockTypeOptions,
  buildBlockForSection,
  type BlockComposerState,
  createBlock,
  createField,
  createSectionMeta,
  createSlide,
  deriveSections,
  emptyPage,
  makeId,
  normalizeBlock,
  normalizeBlocks,
  normalizePath,
  type PageTemplate,
  type LandingSectionDraft,
  normalizeSectionWidth,
  slugify,
} from './landing-pages/editor-helpers'
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
import { PAGE_TEMPLATES } from './landing-pages/templates'

const LANDING_URL = import.meta.env.VITE_LANDING_URL || 'http://localhost:3001'
function isYoutubeUrl(url: string) {
  return /youtube\.com|youtu\.be/.test(url)
}

function toEmbedUrl(url: string) {
  if (!isYoutubeUrl(url)) return url
  const shortMatch = url.match(/youtu\.be\/([^?]+)/)
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`
  const longMatch = url.match(/[?&]v=([^&]+)/)
  if (longMatch) return `https://www.youtube.com/embed/${longMatch[1]}`
  return url
}

function titleLevel(level?: number): 1 | 2 | 3 | 4 | 5 {
  const next = Math.max(1, Math.min(5, level || 2))
  return next as 1 | 2 | 3 | 4 | 5
}


export function LandingPagesPage() {
  const [pages, setPages] = useState<LandingPage[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Omit<LandingPage, 'id' | 'createdAt' | 'updatedAt'>>(emptyPage())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [templateModal, setTemplateModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [iframeKey, setIframeKey] = useState(0)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [blockComposer, setBlockComposer] = useState<BlockComposerState | null>(null)
  const [globalOpen, setGlobalOpen] = useState(false)
  const [globalSettings, setGlobalSettings] = useState<LandingGlobalSetting>(emptyGlobal())
  const [globalSaving, setGlobalSaving] = useState(false)
  const [menuSaving, setMenuSaving] = useState(false)
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const selectedPage = useMemo(
    () => pages.find((item) => item.id === selectedId) || null,
    [pages, selectedId],
  )
  const previewUrl = useMemo(() => {
    const base = LANDING_URL
    const path = draft.path === '/' ? '' : draft.path
    const url = `${base.replace(/\/$/, '')}${path || '/'}`
    if (!selectedId) return url
    const sep = url.includes('?') ? '&' : '?'
    return `${url}${sep}pageId=${selectedId}`
  }, [draft.path, selectedId])

  useEffect(() => {
    void loadPages()
    void loadGlobalSettings()
    void loadMenuSettings()
  }, [])

  async function loadGlobalSettings() {
    try {
      const res = await api.get('/settings/landing-global')
      const payload = (res.data?.data ?? res.data) as LandingGlobalSetting
      const next = { ...emptyGlobal(), ...payload }
      setGlobalSettings((current) => ({ ...current, ...next }))
    } catch {
      // keep defaults
    }
  }

  async function loadMenuSettings() {
    try {
      const res = await api.get('/settings/landing-menu')
      const items = (res.data?.data ?? res.data) as NavItem[]
      setGlobalSettings((current) => ({ ...current, menuItems: normalizeNavTree(items) }))
    } catch {
      try {
        const res = await api.get('/settings/landing-global')
        const payload = (res.data?.data ?? res.data) as LandingGlobalSetting
        setGlobalSettings((current) => ({ ...current, menuItems: normalizeNavTree(payload.menuItems) }))
      } catch {
        // keep defaults
      }
    }
  }

  async function saveGlobalSettings() {
    setGlobalSaving(true)
    try {
      const { menuItems, ...payload } = globalSettings
      await api.put('/settings/landing-global', payload)
      message.success('Đã lưu cài đặt site')
      setIframeKey((k) => k + 1)
    } catch {
      message.error('Lưu thất bại')
    } finally {
      setGlobalSaving(false)
    }
  }

  async function saveMenuSettings() {
    setMenuSaving(true)
    try {
      await api.put('/settings/landing-menu', { menuItems: globalSettings.menuItems ?? [] })
      message.success('Đã lưu menu dùng chung')
      setIframeKey((k) => k + 1)
    } catch {
      try {
        await api.put('/settings/landing-global', { menuItems: globalSettings.menuItems ?? [] })
        message.success('Đã lưu menu qua cấu hình site hiện tại')
        setIframeKey((k) => k + 1)
      } catch {
        message.error('Lưu menu thất bại')
      }
    } finally {
      setMenuSaving(false)
    }
  }

  function updateGlobal(patch: Partial<LandingGlobalSetting>) {
    setGlobalSettings((s) => ({ ...s, ...patch }))
  }

  function addNavItem() {
    const item: NavItem = { id: createId(), label: 'Menu mới', href: '/', target: '_self' }
    updateGlobal({ menuItems: [...(globalSettings.menuItems ?? []), item] })
  }

  function updateNavItem(id: string, patch: Partial<NavItem>) {
    updateGlobal({ menuItems: (globalSettings.menuItems ?? []).map((m) => (m.id === id ? { ...m, ...patch } : m)) })
  }

  function removeNavItem(id: string) {
    updateGlobal({ menuItems: (globalSettings.menuItems ?? []).filter((m) => m.id !== id) })
  }

  function addFooterColumn() {
    const col: FooterColumn = { id: createId(), title: 'Cột mới', links: [] }
    updateGlobal({ footerColumns: [...(globalSettings.footerColumns ?? []), col] })
  }

  function updateFooterColumn(id: string, patch: Partial<FooterColumn>) {
    updateGlobal({ footerColumns: (globalSettings.footerColumns ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c)) })
  }

  function removeFooterColumn(id: string) {
    updateGlobal({ footerColumns: (globalSettings.footerColumns ?? []).filter((c) => c.id !== id) })
  }

  function addFooterLink(colId: string) {
    updateGlobal({
      footerColumns: (globalSettings.footerColumns ?? []).map((c) =>
        c.id === colId ? { ...c, links: [...c.links, { id: createId(), label: 'Link', href: '/' }] } : c,
      ),
    })
  }

  function updateFooterLink(colId: string, linkId: string, patch: { label?: string; href?: string }) {
    updateGlobal({
      footerColumns: (globalSettings.footerColumns ?? []).map((c) =>
        c.id === colId ? { ...c, links: c.links.map((l) => (l.id === linkId ? { ...l, ...patch } : l)) } : c,
      ),
    })
  }

  function removeFooterLink(colId: string, linkId: string) {
    updateGlobal({
      footerColumns: (globalSettings.footerColumns ?? []).map((c) =>
        c.id === colId ? { ...c, links: c.links.filter((l) => l.id !== linkId) } : c,
      ),
    })
  }

  function addSocialLink() {
    updateGlobal({ footerSocialLinks: [...(globalSettings.footerSocialLinks ?? []), { id: createId(), platform: 'Facebook', url: '' }] })
  }

  function updateSocialLink(id: string, patch: Partial<SocialLink>) {
    updateGlobal({ footerSocialLinks: (globalSettings.footerSocialLinks ?? []).map((s) => (s.id === id ? { ...s, ...patch } : s)) })
  }

  function removeSocialLink(id: string) {
    updateGlobal({ footerSocialLinks: (globalSettings.footerSocialLinks ?? []).filter((s) => s.id !== id) })
  }

  function addRootNavItem() {
    updateGlobal({ menuItems: [...(globalSettings.menuItems ?? []), createNavItem()] })
  }

  function patchTreeNavItem(id: string, patch: Partial<NavItem>) {
    updateGlobal({
      menuItems: updateNavTree(globalSettings.menuItems ?? [], id, (item) => ({
        ...item,
        ...patch,
        children: patch.children ?? item.children ?? [],
      })),
    })
  }

  function addTreeNavChild(parentId: string, depth: number) {
    if (depth >= 3) return
    updateGlobal({
      menuItems: updateNavTree(globalSettings.menuItems ?? [], parentId, (item) => ({
        ...item,
        children: [...(item.children ?? []), createNavItem(depth === 1 ? 'Menu cấp 2' : 'Menu cấp 3')],
      })),
    })
  }

  function removeTreeNavItem(id: string) {
    updateGlobal({ menuItems: removeNavTreeItem(globalSettings.menuItems ?? [], id) })
  }


  useEffect(() => {
    if (!selectedPage) return
    setDraft({
      slug: selectedPage.slug,
      path: selectedPage.path,
      title: selectedPage.title,
      description: selectedPage.description || '',
      seoTitle: selectedPage.seoTitle || '',
      seoDescription: selectedPage.seoDescription || '',
      blocks: normalizeBlocks(selectedPage.blocks || []),
      isPublished: selectedPage.isPublished,
    })
  }, [selectedPage])

  async function loadPages(nextSelectedId?: string | null) {
    setLoading(true)
    try {
      const response = await api.get('/settings/landing-pages')
      const nextPages = response.data.data as LandingPage[]
      setPages(nextPages)

      if (typeof nextSelectedId !== 'undefined') {
        setSelectedId(nextSelectedId)
        return
      }

      if (!nextPages.length) {
        setSelectedId(null)
        setDraft(emptyPage())
        return
      }

      setSelectedId((current) => (current && nextPages.some((item) => item.id === current) ? current : nextPages[0].id))
    } finally {
      setLoading(false)
    }
  }

  function updateDraft(patch: Partial<typeof draft>) {
    setDraft((current) => ({ ...current, ...patch }))
  }

  function startCreatePage() {
    setTemplateModal(true)
  }

  function applyTemplate(template: PageTemplate) {
    setSelectedId(null)
    setDraft({
      ...template.page,
      blocks: normalizeBlocks(template.page.blocks.map((block) => ({ ...block, id: makeId() }))),
    })
    setTemplateModal(false)
  }

  async function applyAndSave(template: PageTemplate) {
    // Blank template: chỉ apply vào editor, không save
    if (!template.page.title.trim()) {
      applyTemplate(template)
      return
    }

    const blocks = normalizeBlocks(template.page.blocks.map((block, index) => ({ ...block, id: makeId(), order: index + 1 })))
    const payload = {
      ...template.page,
      blocks,
      slug: slugify(template.page.slug || template.page.title),
      path: normalizePath(template.page.path || template.page.slug || template.page.title),
    }

    setTemplateModal(false)
    setSaving(true)
    try {
      const response = await api.post('/settings/landing-pages', payload)
      message.success(`Đã tạo page "${payload.title}"`)
      await loadPages(response.data.data.id)
    } catch {
      message.error('Tạo page thất bại')
    } finally {
      setSaving(false)
    }
  }

  function syncSlugFromTitle(title: string) {
    const nextSlug = slugify(title)
    setDraft((current) => ({
      ...current,
      title,
      slug: current.slug ? current.slug : nextSlug,
      path: current.path && current.path !== '/' ? current.path : normalizePath(nextSlug),
    }))
  }


  function addBlock(type: LandingBlockType, sectionId?: string) {
    setDraft((current) => {
      const block = buildBlockForSection(type, sectionId, current.blocks)
      return {
        ...current,
        blocks: [...current.blocks, block],
      }
    })
  }

  function openBlockComposer(sectionId: string) {
    setBlockComposer({
      sectionId,
      block: buildBlockForSection('title', sectionId, draft.blocks),
    })
  }

  function updateComposerBlock(patch: Partial<LandingBlock>) {
    setBlockComposer((current) => {
      if (!current) return current
      return {
        ...current,
        block: normalizeBlock({ ...current.block, ...patch }, draft.blocks.length),
      }
    })
  }

  function changeComposerType(type: LandingBlockType) {
    setBlockComposer((current) => {
      if (!current) return current
      return {
        ...current,
        block: buildBlockForSection(type, current.sectionId, draft.blocks),
      }
    })
  }

  function updateComposerField(fieldId: string, patch: Partial<LandingFormField>) {
    setBlockComposer((current) => {
      if (!current) return current
      return {
        ...current,
        block: {
          ...current.block,
          fields: (current.block.fields || []).map((field) => (field.id === fieldId ? { ...field, ...patch } : field)),
        },
      }
    })
  }

  function addComposerField() {
    setBlockComposer((current) => {
      if (!current) return current
      return {
        ...current,
        block: { ...current.block, fields: [...(current.block.fields || []), createField()] },
      }
    })
  }

  function removeComposerField(fieldId: string) {
    setBlockComposer((current) => {
      if (!current) return current
      return {
        ...current,
        block: { ...current.block, fields: (current.block.fields || []).filter((field) => field.id !== fieldId) },
      }
    })
  }

  function updateComposerSlide(slideId: string, patch: Partial<LandingSlide>) {
    setBlockComposer((current) => {
      if (!current) return current
      return {
        ...current,
        block: {
          ...current.block,
          slides: (current.block.slides || []).map((slide) => (slide.id === slideId ? { ...slide, ...patch } : slide)),
        },
      }
    })
  }

  function addComposerSlide() {
    setBlockComposer((current) => {
      if (!current) return current
      return {
        ...current,
        block: { ...current.block, slides: [...(current.block.slides || []), createSlide()] },
      }
    })
  }

  function removeComposerSlide(slideId: string) {
    setBlockComposer((current) => {
      if (!current) return current
      return {
        ...current,
        block: { ...current.block, slides: (current.block.slides || []).filter((slide) => slide.id !== slideId) },
      }
    })
  }

  async function saveComposerBlock() {
    if (!blockComposer) return
    const nextDraft = {
      ...draft,
      blocks: normalizeBlocks([...draft.blocks, blockComposer.block]),
    }
    setDraft(nextDraft)
    const saved = await saveDraftSnapshot(nextDraft, 'Da them block va reload landing page')
    if (!saved) return
    setSelectedBlockId(blockComposer.block.id)
    setBlockComposer(null)
  }

  function addSection(width: LandingSectionWidth) {
    setDraft((current) => {
      const sections = deriveSections(current.blocks)
      const nextOrder = sections.length ? Math.max(...sections.map((section) => section.order)) + 1 : 1
      const meta = createSectionMeta(width, nextOrder)
      const seedBlock = normalizeBlock(
        {
          ...createBlock('title'),
          ...meta,
          title: width === 'full' ? 'Section tràn chiều rộng' : 'Section trong khung',
        },
        current.blocks.length,
      )
      return {
        ...current,
        blocks: [...current.blocks, seedBlock],
      }
    })
  }

  function updateSection(sectionId: string, patch: Partial<Pick<LandingBlock, 'sectionTitle' | 'sectionWidth' | 'sectionOrder'>>) {
    setDraft((current) => ({
      ...current,
      blocks: current.blocks.map((block, index) =>
        block.sectionId === sectionId
          ? normalizeBlock({ ...block, ...patch }, index)
          : normalizeBlock(block, index),
      ),
    }))
  }

  function removeSection(sectionId: string) {
    setDraft((current) => ({
      ...current,
      blocks: current.blocks
        .filter((block) => block.sectionId !== sectionId)
        .map((block, index) => normalizeBlock({ ...block, order: index + 1 }, index)),
    }))
  }

  function removeBlock(blockId: string) {
    setDraft((current) => ({
      ...current,
      blocks: current.blocks
        .filter((block) => block.id !== blockId)
        .map((block, index) => normalizeBlock({ ...block, order: index + 1 }, index)),
    }))
  }


  async function saveDraftSnapshot(nextDraft: Omit<LandingPage, 'id' | 'createdAt' | 'updatedAt'>, successMessage: string) {
    const payload = {
      ...nextDraft,
      slug: slugify(nextDraft.slug || nextDraft.title),
      path: normalizePath(nextDraft.path || nextDraft.slug || nextDraft.title),
      blocks: normalizeBlocks(nextDraft.blocks.map((block, index) => ({ ...block, order: index + 1 }))),
    }

    if (!payload.title.trim()) {
      message.error('Can nhap ten page')
      return null
    }

    setSaving(true)
    try {
      let saved: LandingPage
      if (selectedId) {
        const response = await api.patch(`/settings/landing-pages/${selectedId}`, payload)
        saved = response.data.data as LandingPage
      } else {
        const response = await api.post('/settings/landing-pages', payload)
        saved = response.data.data as LandingPage
      }
      message.success(successMessage)
      await loadPages(saved.id)
      setIframeKey((k) => k + 1)
      return saved
    } finally {
      setSaving(false)
    }
  }

  async function savePage() {
    const payload = {
      ...draft,
      slug: slugify(draft.slug || draft.title),
      path: normalizePath(draft.path || draft.slug || draft.title),
      blocks: normalizeBlocks(draft.blocks.map((block, index) => ({ ...block, order: index + 1 }))),
    }

    if (!payload.title.trim()) {
      message.error('Cần nhập tên page')
      return
    }

    setSaving(true)
    try {
      if (selectedId) {
        const response = await api.patch(`/settings/landing-pages/${selectedId}`, payload)
        message.success('Đã cập nhật landing page')
        await loadPages(response.data.data.id)
        setIframeKey((k) => k + 1)
      } else {
        const response = await api.post('/settings/landing-pages', payload)
        message.success('Đã tạo landing page')
        await loadPages(response.data.data.id)
        setIframeKey((k) => k + 1)
      }
    } finally {
      setSaving(false)
    }
  }

  async function saveAndOpen() {
    const payload = {
      ...draft,
      slug: slugify(draft.slug || draft.title),
      path: normalizePath(draft.path || draft.slug || draft.title),
      blocks: normalizeBlocks(draft.blocks.map((block, index) => ({ ...block, order: index + 1 }))),
    }
    if (!payload.title.trim()) {
      message.error('Cần nhập tên page')
      return
    }
    setSaving(true)
    try {
      let savedPath = payload.path
      let savedId = selectedId || ''
      if (selectedId) {
        const response = await api.patch(`/settings/landing-pages/${selectedId}`, payload)
        savedPath = response.data.data.path
        savedId = response.data.data.id
        message.success('Đã cập nhật')
        await loadPages(response.data.data.id)
      } else {
        const response = await api.post('/settings/landing-pages', payload)
        savedPath = response.data.data.path
        savedId = response.data.data.id
        message.success('Đã tạo landing page')
        await loadPages(response.data.data.id)
      }
      const base = LANDING_URL.replace(/\/$/, '')
      const path = savedPath === '/' ? '' : savedPath
      const targetUrl = `${base}${path || '/'}`
      const sep = targetUrl.includes('?') ? '&' : '?'
      window.open(`${targetUrl}${sep}pageId=${savedId}`, '_blank', 'noreferrer')
    } finally {
      setSaving(false)
    }
  }

  async function deletePage() {
    if (!selectedId) return
    await api.delete(`/settings/landing-pages/${selectedId}`)
    message.success('Đã xóa landing page')
    await loadPages(null)
  }

  const sections = useMemo(() => deriveSections(draft.blocks), [draft.blocks])

  const iframeUrl = useMemo(() => {
    const sep = previewUrl.includes('?') ? '&' : '?'
    return editMode ? `${previewUrl}${sep}cms_edit=1` : previewUrl
  }, [previewUrl, editMode])

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!editMode) return
      const data = event.data as { type?: string; blockId?: string }
      if (data?.type === 'cms-block-select' && data.blockId) {
        setSelectedBlockId(data.blockId)
        document.getElementById(`block-panel-${data.blockId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [editMode])

  function blockPreview(block: LandingBlock): string {
    const text = block.title ?? block.text ?? block.url ?? ''
    return text.slice(0, 50)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', gap: 0 }}>
      {/* ── Header ── */}
      <div className="page-header" style={{ flexShrink: 0 }}>
        <Flex align="center" gap={12} wrap="wrap">
          <Typography.Title level={3} style={{ margin: 0 }}>Trang landing</Typography.Title>
          <Select
            style={{ minWidth: 240 }}
            placeholder="Chọn page..."
            value={selectedId}
            onChange={(id) => setSelectedId(id)}
            loading={loading}
            options={pages.map((p) => ({ value: p.id, label: p.title || p.path || p.slug }))}
          />
          <Tag color={draft.isPublished ? 'green' : 'default'}>
            {draft.isPublished ? 'Đã xuất bản' : 'Nháp'}
          </Tag>
        </Flex>
        <Space wrap>
          <Button icon={<PlusOutlined />} onClick={startCreatePage}>Trang mới</Button>
          {selectedId ? (
            <Popconfirm title="Xóa landing page này?" onConfirm={() => void deletePage()}>
              <Button danger icon={<DeleteOutlined />}>Xóa</Button>
            </Popconfirm>
          ) : null}
          <Button icon={<SaveOutlined />} loading={saving} onClick={savePage}>Lưu</Button>
          <Button icon={<EyeOutlined />} loading={saving} type="primary" onClick={() => void saveAndOpen()}>Lưu & Mở</Button>
          <Button icon={<SettingOutlined />} onClick={() => setGlobalOpen(true)}>Cài đặt site</Button>
        </Space>
      </div>

      {/* ── Two-column body ── */}
      <div style={{ flex: 1, display: 'flex', gap: 16, overflow: 'hidden', minHeight: 0, padding: '0 0 16px' }}>

        {/* Left 30% — info + blocks + theme */}
        <div style={{ width: '30%', minWidth: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
          <Tabs
            size="small"
            style={{ flex: 1 }}
            items={[
              {
                key: 'content',
                label: 'Nội dung',
                children: (
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    {/* Page meta */}
                    <Card className="glass-card" size="small" title="Thông tin trang">
                      <Form layout="vertical" size="small">
                        <Form.Item label="Tên trang" style={{ marginBottom: 8 }}>
                          <Input value={draft.title} onChange={(event) => syncSlugFromTitle(event.target.value)} placeholder="Ví dụ: Trang chủ" />
                        </Form.Item>
                        <Row gutter={8}>
                          <Col span={12}>
                            <Form.Item label="Slug" style={{ marginBottom: 8 }}>
                              <Input value={draft.slug} onChange={(event) => updateDraft({ slug: slugify(event.target.value) })} placeholder="trang-chu" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="Đường dẫn" style={{ marginBottom: 8 }}>
                              <Input value={draft.path} onChange={(event) => updateDraft({ path: normalizePath(event.target.value) })} placeholder="/" />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Form.Item label="Mô tả ngắn" style={{ marginBottom: 8 }}>
                          <Input.TextArea rows={2} value={draft.description} onChange={(event) => updateDraft({ description: event.target.value })} />
                        </Form.Item>
                        <Row gutter={8}>
                          <Col span={12}>
                            <Form.Item label="Tiêu đề SEO" style={{ marginBottom: 8 }}>
                              <Input value={draft.seoTitle} onChange={(event) => updateDraft({ seoTitle: event.target.value })} />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="Mô tả SEO" style={{ marginBottom: 8 }}>
                              <Input value={draft.seoDescription} onChange={(event) => updateDraft({ seoDescription: event.target.value })} />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Form.Item label="Xuất bản" style={{ marginBottom: 0 }}>
                          <Flex align="center" gap={8}>
                            <Switch size="small" checked={draft.isPublished} onChange={(checked) => updateDraft({ isPublished: checked })} />
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{draft.isPublished ? 'Đang xuất bản' : 'Bản nháp'}</Typography.Text>
                          </Flex>
                        </Form.Item>
                      </Form>
                    </Card>

                    <SectionsTreeCard
                      sections={sections}
                      selectedBlockId={selectedBlockId}
                      blockTypeOptions={blockTypeOptions}
                      blockTypeIcons={blockTypeIcons}
                      blockPreview={blockPreview}
                      onAddSection={addSection}
                      onOpenBlockComposer={openBlockComposer}
                      onRemoveSection={removeSection}
                      onUpdateSection={updateSection}
                      onSelectBlock={setSelectedBlockId}
                      onRemoveBlock={removeBlock}
                    />

                  </Space>
                ),
              },
              {
                key: 'theme',
                label: 'Giao diện',
                children: <LandingThemeEditor />,
              },
            ]}
          />
        </div>

        {/* Right 70% — iframe preview */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, gap: 8 }}>
          <Flex align="center" justify="space-between" style={{ flexShrink: 0 }}>
            <Space>
              <Button
                type={editMode ? 'primary' : 'default'}
                icon={<EditOutlined />}
                onClick={() => {
                  setEditMode((prev) => !prev)
                  setIframeKey((k) => k + 1)
                }}
              >
                {editMode ? 'Chế độ edit (bật)' : 'Chế độ edit'}
              </Button>
              <Button icon={<ReloadOutlined />} onClick={() => setIframeKey((k) => k + 1)}>Tải lại</Button>
            </Space>
            <Space.Compact>
              <Button
                icon={<DesktopOutlined />}
                type={previewDevice === 'desktop' ? 'primary' : 'default'}
                onClick={() => setPreviewDevice('desktop')}
              >Desktop</Button>
              <Button
                icon={<TabletOutlined />}
                type={previewDevice === 'tablet' ? 'primary' : 'default'}
                onClick={() => setPreviewDevice('tablet')}
              >Máy tính bảng</Button>
              <Button
                icon={<MobileOutlined />}
                type={previewDevice === 'mobile' ? 'primary' : 'default'}
                onClick={() => setPreviewDevice('mobile')}
              >Điện thoại</Button>
            </Space.Compact>
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>{previewUrl}</Typography.Text>
          </Flex>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflow: 'auto', background: previewDevice !== 'desktop' ? '#f0f0f0' : 'transparent', borderRadius: 8, minHeight: 0 }}>
            <iframe
              key={iframeKey}
              ref={iframeRef}
              src={iframeUrl}
              style={{
                border: '1px solid #d9d9d9',
                borderRadius: 8,
                background: '#fff',
                minHeight: 400,
                width: previewDevice === 'mobile' ? 390 : previewDevice === 'tablet' ? 768 : '100%',
                height: previewDevice !== 'desktop' ? 'calc(100vh - 180px)' : '100%',
                flexShrink: 0,
                transition: 'width 0.25s',
              }}
              title="Xem trước trang landing"
            />
          </div>
        </div>
      </div>
      <LandingSiteSettingsProvider
        value={{
          open: globalOpen,
          settings: globalSettings,
          globalSaving,
          menuSaving,
          onClose: () => setGlobalOpen(false),
          onSaveGlobal: () => void saveGlobalSettings(),
          onSaveMenu: () => void saveMenuSettings(),
          onUpdate: updateGlobal,
          onAddRootNavItem: addRootNavItem,
          onPatchTreeNavItem: patchTreeNavItem,
          onAddTreeNavChild: addTreeNavChild,
          onRemoveTreeNavItem: removeTreeNavItem,
          onAddFooterColumn: addFooterColumn,
          onUpdateFooterColumn: updateFooterColumn,
          onRemoveFooterColumn: removeFooterColumn,
          onAddFooterLink: addFooterLink,
          onUpdateFooterLink: updateFooterLink,
          onRemoveFooterLink: removeFooterLink,
          onAddSocialLink: addSocialLink,
          onUpdateSocialLink: updateSocialLink,
          onRemoveSocialLink: removeSocialLink,
        }}
      >
        <LandingSiteSettingsDrawer />
      </LandingSiteSettingsProvider>

      <BlockComposerProvider
        value={{
          open: Boolean(blockComposer),
          saving,
          composer: blockComposer,
          sections,
          blockTypeOptions,
          onCancel: () => setBlockComposer(null),
          onSave: () => void saveComposerBlock(),
          onChangeType: changeComposerType,
          onUpdateBlock: updateComposerBlock,
          onAddSlide: addComposerSlide,
          onUpdateSlide: updateComposerSlide,
          onRemoveSlide: removeComposerSlide,
          onAddField: addComposerField,
          onUpdateField: updateComposerField,
          onRemoveField: removeComposerField,
          slugify,
        }}
      >
        <BlockComposerModal />
      </BlockComposerProvider>

      <TemplatePickerModal
        open={templateModal}
        saving={saving}
        templates={PAGE_TEMPLATES}
        onCancel={() => setTemplateModal(false)}
        onApply={(template) => void applyAndSave(template)}
      />
    </div>
  )
}
