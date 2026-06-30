export type LandingBlockType = 'title' | 'text' | 'image' | 'video' | 'form' | 'slider'

export type LandingSectionWidth = 'container' | 'full'

export interface LandingFormField {
  id: string
  name: string
  label: string
  type: 'text' | 'textarea' | 'email' | 'tel' | 'number'
  placeholder?: string
  required: boolean
  span: number
}

export interface LandingSlide {
  id: string
  url: string
  alt?: string
  caption?: string
}

export interface LandingBlock {
  id: string
  type: LandingBlockType
  row: number
  span: number
  order: number
  sectionId?: string
  sectionTitle?: string
  sectionWidth?: LandingSectionWidth
  sectionOrder?: number
  title?: string
  level?: number
  align?: 'left' | 'center' | 'right'
  text?: string
  url?: string
  alt?: string
  caption?: string
  description?: string
  submitLabel?: string
  successMessage?: string
  fields?: LandingFormField[]
  slides?: LandingSlide[]
}

export interface LandingPageData {
  id: string
  slug: string
  path: string
  title: string
  description?: string
  seoTitle?: string
  seoDescription?: string
  blocks: LandingBlock[]
  isPublished: boolean
}

export interface LandingSection {
  id: string
  title: string
  width: LandingSectionWidth
  order: number
  blocks: LandingBlock[]
}

export interface NavItem {
  id: string
  label: string
  href: string
  target?: '_blank' | '_self'
  children?: NavItem[]
}

export interface FooterLink {
  id: string
  label: string
  href: string
}

export interface FooterColumn {
  id: string
  title: string
  links: FooterLink[]
}

export interface SocialLink {
  id: string
  platform: string
  url: string
}

export interface LandingGlobalSetting {
  logoUrl?: string
  logoAlt?: string
  logoWidth?: number
  headerSticky?: boolean
  headerBgColor?: string
  headerCtaLabel?: string
  headerCtaHref?: string
  menuItems?: NavItem[]
  footerColumns?: FooterColumn[]
  footerSocialLinks?: SocialLink[]
  footerCopyright?: string
}

function normalizeNavItem(item: NavItem, depth = 1): NavItem {
  return {
    id: item.id || crypto.randomUUID(),
    label: item.label || '',
    href: item.href || '/',
    target: item.target === '_blank' ? '_blank' : '_self',
    children: depth >= 3 ? [] : (item.children ?? []).map((child) => normalizeNavItem(child, depth + 1)),
  }
}

export function normalizeMenuItems(items?: NavItem[]) {
  return (items ?? []).map((item) => normalizeNavItem(item, 1))
}

const API_URL = process.env.LANDING_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

export async function getGlobalSettings(): Promise<LandingGlobalSetting> {
  try {
    const res = await fetch(`${API_URL}/public/landing-pages/global`, { next: { revalidate: 60 } })
    if (!res.ok) return {}
    const raw = await res.json() as { data?: LandingGlobalSetting } | LandingGlobalSetting
    const data = ('data' in raw ? raw.data : raw) ?? {}
    return { ...data, menuItems: normalizeMenuItems(data.menuItems) }
  } catch {
    return {}
  }
}

export async function getMenuSettings(): Promise<NavItem[]> {
  try {
    const res = await fetch(`${API_URL}/public/landing-pages/menu`, { next: { revalidate: 60 } })
    if (!res.ok) {
      const globalSettings = await getGlobalSettings()
      return normalizeMenuItems(globalSettings.menuItems)
    }
    const raw = await res.json() as { data?: NavItem[] } | NavItem[]
    const data = Array.isArray(raw) ? raw : (raw.data ?? [])
    return normalizeMenuItems(data)
  } catch {
    const globalSettings = await getGlobalSettings()
    return normalizeMenuItems(globalSettings.menuItems)
  }
}

export async function getLandingPage(pathname: string): Promise<LandingPageData | null> {
  const response = await fetch(`${API_URL}/public/landing-pages/resolve?path=${encodeURIComponent(pathname)}`, {
    next: { revalidate: 30 },
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error('Không thể tải landing page')
  }

  const payload = await response.json()
  return payload.data as LandingPageData
}

export function sortBlocks(blocks: LandingBlock[]) {
  return [...blocks].sort((left, right) => {
    if ((left.sectionOrder || 1) !== (right.sectionOrder || 1)) return (left.sectionOrder || 1) - (right.sectionOrder || 1)
    if (left.row !== right.row) return left.row - right.row
    return left.order - right.order
  })
}

export function normalizeSectionWidth(width?: string): LandingSectionWidth {
  return width === 'full' ? 'full' : 'container'
}

export function deriveLandingSections(blocks: LandingBlock[]) {
  const bucket = new Map<string, LandingSection>()
  sortBlocks(blocks).forEach((block) => {
    const sectionId = block.sectionId || 'default-section'
    const current = bucket.get(sectionId) || {
      id: sectionId,
      title: block.sectionTitle || '',
      width: normalizeSectionWidth(block.sectionWidth),
      order: block.sectionOrder || 1,
      blocks: [],
    }
    current.title = current.title || block.sectionTitle || ''
    current.width = normalizeSectionWidth(block.sectionWidth || current.width)
    current.order = Math.min(current.order, block.sectionOrder || current.order || 1)
    current.blocks.push({
      ...block,
      sectionId,
      sectionTitle: block.sectionTitle || current.title,
      sectionWidth: current.width,
      sectionOrder: current.order,
    })
    bucket.set(sectionId, current)
  })

  return [...bucket.values()].sort((left, right) => left.order - right.order)
}

export function isVideoEmbed(url: string) {
  return /youtube\.com|youtu\.be|vimeo\.com/.test(url)
}

export function embedVideoUrl(url: string) {
  if (/youtu\.be/.test(url)) {
    const matched = url.match(/youtu\.be\/([^?]+)/)
    return matched ? `https://www.youtube.com/embed/${matched[1]}` : url
  }

  if (/youtube\.com/.test(url)) {
    const matched = url.match(/[?&]v=([^&]+)/)
    return matched ? `https://www.youtube.com/embed/${matched[1]}` : url
  }

  if (/vimeo\.com/.test(url)) {
    const matched = url.match(/vimeo\.com\/(\d+)/)
    return matched ? `https://player.vimeo.com/video/${matched[1]}` : url
  }

  return url
}
