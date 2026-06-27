export type NavItem = {
  id: string
  label: string
  href: string
  target?: '_blank' | '_self'
  children?: NavItem[]
}

export type FooterColumn = {
  id: string
  title: string
  links: Array<{ id: string; label: string; href: string }>
}

export type SocialLink = {
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

export function emptyGlobal(): LandingGlobalSetting {
  return {
    logoUrl: '',
    logoAlt: '',
    logoWidth: 160,
    headerSticky: true,
    headerBgColor: '#ffffff',
    headerCtaLabel: '',
    headerCtaHref: '',
    menuItems: [],
    footerColumns: [],
    footerSocialLinks: [],
    footerCopyright: '',
  }
}

export function createNavItem(label = 'Menu moi'): NavItem {
  return { id: crypto.randomUUID(), label, href: '/', target: '_self', children: [] }
}

export function normalizeNavItem(item: NavItem, depth = 1): NavItem {
  return {
    id: item.id || crypto.randomUUID(),
    label: item.label || '',
    href: item.href || '/',
    target: item.target === '_blank' ? '_blank' : '_self',
    children: depth >= 3 ? [] : (item.children ?? []).map((child) => normalizeNavItem(child, depth + 1)),
  }
}

export function normalizeNavTree(items?: NavItem[]) {
  return (items ?? []).map((item) => normalizeNavItem(item, 1))
}

export function updateNavTree(items: NavItem[], id: string, updater: (item: NavItem) => NavItem): NavItem[] {
  return items.map((item) => {
    if (item.id === id) return updater(item)
    if (!item.children?.length) return item
    return { ...item, children: updateNavTree(item.children, id, updater) }
  })
}

export function removeNavTreeItem(items: NavItem[], id: string): NavItem[] {
  return items
    .filter((item) => item.id !== id)
    .map((item) => ({
      ...item,
      children: item.children?.length ? removeNavTreeItem(item.children, id) : [],
    }))
}
