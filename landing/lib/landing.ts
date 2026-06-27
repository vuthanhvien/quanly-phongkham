export type LandingBlockType = 'title' | 'text' | 'image' | 'video' | 'form'

export interface LandingFormField {
  id: string
  name: string
  label: string
  type: 'text' | 'textarea' | 'email' | 'tel' | 'number'
  placeholder?: string
  required: boolean
  span: number
}

export interface LandingBlock {
  id: string
  type: LandingBlockType
  row: number
  span: number
  order: number
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

export interface NavItem {
  id: string
  label: string
  href: string
  target?: '_blank' | '_self'
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

const API_URL = process.env.LANDING_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

export async function getGlobalSettings(): Promise<LandingGlobalSetting> {
  try {
    const res = await fetch(`${API_URL}/public/landing-pages/global`, { next: { revalidate: 60 } })
    if (!res.ok) return {}
    return await res.json() as LandingGlobalSetting
  } catch {
    return {}
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
    if (left.row !== right.row) return left.row - right.row
    return left.order - right.order
  })
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