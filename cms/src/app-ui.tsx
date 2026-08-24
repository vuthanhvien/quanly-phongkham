import { createContext, useContext } from 'react'

const APP_UI_STORAGE_KEY = 'clinic-app-ui-settings'

export interface AppUiSettings {
  id?: string
  appKey?: string
  companyType: 'clinic' | 'retail' | 'cafe' | 'agriculture' | 'general'
  enabledModules: string[]
  hasCustomModuleSelection: boolean
  appName: string
  appDescription?: string
  appIconUrl?: string
  primaryColor: string
  pageBgColor: string
  surfaceColor: string
  surfaceBorderColor: string
  headerBgColor: string
  headerBorderColor: string
  headerTextColor: string
  menuBgColor: string
  menuTextColor: string
  menuGroupTextColor: string
  menuHoverBgColor: string
  menuActiveBgColor: string
  menuActiveTextColor: string
  textColor: string
  textMutedColor: string
  titleColor: string
  buttonPrimaryBgColor: string
  buttonPrimaryTextColor: string
  buttonPrimaryBorderColor: string
  buttonDefaultBgColor: string
  buttonDefaultTextColor: string
  buttonDefaultBorderColor: string
  buttonSecondaryBgColor: string
  buttonSecondaryTextColor: string
  buttonSecondaryBorderColor: string
  buttonSuccessBgColor: string
  buttonSuccessTextColor: string
  buttonSuccessBorderColor: string
  buttonInfoBgColor: string
  buttonInfoTextColor: string
  buttonInfoBorderColor: string
  buttonWarningBgColor: string
  buttonWarningTextColor: string
  buttonWarningBorderColor: string
  buttonErrorBgColor: string
  buttonErrorTextColor: string
  buttonErrorBorderColor: string
  shadowColor: string
  shadowOpacity: number
  shadowBlur: number
  shadowOffsetY: number
  theme: 'dark' | 'light'
  borderRadius: number
  size: 'small' | 'medium' | 'large'
  fontFamily: string
}

export const companyTypeOptions = [
  { value: 'clinic', label: 'Phòng khám / Clinic' },
  { value: 'retail', label: 'Bán hàng / Retail' },
  { value: 'cafe', label: 'Quán cafe / F&B nhỏ' },
  { value: 'agriculture', label: 'Nông nghiệp / Trang trại' },
  { value: 'general', label: 'Doanh nghiệp chung' },
] as const

export const fontFamilyOptions = [
  { value: '"Plus Jakarta Sans", Inter, Arial, sans-serif', label: 'Plus Jakarta Sans' },
  { value: '"Be Vietnam Pro", Inter, Arial, sans-serif', label: 'Be Vietnam Pro' },
  { value: '"Figtree", Inter, Arial, sans-serif', label: 'Figtree' },
  { value: '"Source Sans 3", Arial, sans-serif', label: 'Source Sans 3' },
  { value: '"Roboto Flex", Roboto, Arial, sans-serif', label: 'Roboto Flex' },
  { value: 'Rubik, Arial, sans-serif', label: 'Rubik' },
  { value: 'Karla, Arial, sans-serif', label: 'Karla' },
  { value: 'Sora, Arial, sans-serif', label: 'Sora' },
  { value: '"Manrope", Inter, Arial, sans-serif', label: 'Manrope' },
  { value: '"Space Grotesk", Inter, Arial, sans-serif', label: 'Space Grotesk' },
  { value: '"DM Sans", Inter, Arial, sans-serif', label: 'DM Sans' },
  { value: '"Nunito Sans", Inter, Arial, sans-serif', label: 'Nunito Sans' },
  { value: '"IBM Plex Sans", Inter, Arial, sans-serif', label: 'IBM Plex Sans' },
  { value: '"Public Sans", Inter, Arial, sans-serif', label: 'Public Sans' },
  { value: '"Work Sans", Inter, Arial, sans-serif', label: 'Work Sans' },
  { value: '"Barlow", Inter, Arial, sans-serif', label: 'Barlow' },
  { value: 'Inter, Arial, sans-serif', label: 'Inter' },
  { value: 'Roboto, Arial, sans-serif', label: 'Roboto' },
  { value: '"Noto Sans", Arial, sans-serif', label: 'Noto Sans' },
  { value: '"Open Sans", Arial, sans-serif', label: 'Open Sans' },
  { value: 'Lato, Arial, sans-serif', label: 'Lato' },
  { value: 'Montserrat, Arial, sans-serif', label: 'Montserrat' },
  { value: 'Mulish, Arial, sans-serif', label: 'Mulish' },
  { value: 'Lexend, Arial, sans-serif', label: 'Lexend' },
  { value: 'Quicksand, Arial, sans-serif', label: 'Quicksand' },
  { value: 'Arsenal, Arial, sans-serif', label: 'Arsenal' },
  { value: 'Signika, Arial, sans-serif', label: 'Signika' },
] as const

export const defaultAppUiSettings: AppUiSettings = {
  companyType: 'clinic',
  enabledModules: [],
  hasCustomModuleSelection: false,
  appName: 'Clinic CMS',
  appIconUrl: '',
  primaryColor: '#e889ae',
  pageBgColor: '#f5f6fa',
  surfaceColor: '#ffffff',
  surfaceBorderColor: '#dbe1ea',
  headerBgColor: '#ffffff',
  headerBorderColor: '#dbe1ea',
  headerTextColor: '#1f2430',
  menuBgColor: '#ffffff',
  menuTextColor: '#4b5563',
  menuGroupTextColor: '#1f2430',
  menuHoverBgColor: '#f6d6e2',
  menuActiveBgColor: '#f3c6d7',
  menuActiveTextColor: '#c2517d',
  textColor: '#1f2430',
  textMutedColor: '#6b7280',
  titleColor: '#111827',
  buttonPrimaryBgColor: '#e889ae',
  buttonPrimaryTextColor: '#ffffff',
  buttonPrimaryBorderColor: '#e889ae',
  buttonDefaultBgColor: '#ffffff',
  buttonDefaultTextColor: '#1f2430',
  buttonDefaultBorderColor: '#dbe1ea',
  buttonSecondaryBgColor: '#f3f4f6',
  buttonSecondaryTextColor: '#374151',
  buttonSecondaryBorderColor: '#d1d5db',
  buttonSuccessBgColor: '#16a34a',
  buttonSuccessTextColor: '#ffffff',
  buttonSuccessBorderColor: '#16a34a',
  buttonInfoBgColor: '#0ea5e9',
  buttonInfoTextColor: '#ffffff',
  buttonInfoBorderColor: '#0ea5e9',
  buttonWarningBgColor: '#f59e0b',
  buttonWarningTextColor: '#111827',
  buttonWarningBorderColor: '#f59e0b',
  buttonErrorBgColor: '#ef4444',
  buttonErrorTextColor: '#ffffff',
  buttonErrorBorderColor: '#ef4444',
  shadowColor: '#0f172a',
  shadowOpacity: 8,
  shadowBlur: 18,
  shadowOffsetY: 1,
  theme: 'light',
  borderRadius: 14,
  size: 'medium',
  fontFamily: fontFamilyOptions[0].value,
}

export function normalizeAppUiSettings(payload?: Partial<AppUiSettings> | null): AppUiSettings {
  const normalized: AppUiSettings = {
    ...defaultAppUiSettings,
    ...(payload || {}),
    theme: 'light',
  }

  if (!companyTypeOptions.some((option) => option.value === normalized.companyType)) {
    normalized.companyType = defaultAppUiSettings.companyType
  }
  normalized.enabledModules = Array.isArray(normalized.enabledModules)
    ? Array.from(new Set(normalized.enabledModules.map((item) => String(item || "").trim()).filter(Boolean)))
    : []
  normalized.hasCustomModuleSelection = normalized.hasCustomModuleSelection === true

  normalized.appDescription = normalized.appDescription?.trim() || undefined
  normalized.appIconUrl = normalized.appIconUrl?.trim() || undefined

  return normalized
}

export function loadCachedAppUiSettings(): AppUiSettings {
  if (typeof window === 'undefined') return defaultAppUiSettings
  try {
    const raw = localStorage.getItem(APP_UI_STORAGE_KEY)
    if (!raw) return defaultAppUiSettings
    return normalizeAppUiSettings(JSON.parse(raw) as Partial<AppUiSettings>)
  } catch {
    return defaultAppUiSettings
  }
}

export function persistAppUiSettings(settings: AppUiSettings) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(APP_UI_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // ignore storage errors
  }
}

export function controlHeightBySize(size: AppUiSettings['size']) {
  if (size === 'small') return 34
  if (size === 'large') return 44
  return 38
}

export function cardPaddingBySize(size: AppUiSettings['size']) {
  if (size === 'small') return 14
  if (size === 'large') return 22
  return 18
}

export function tablePaddingBySize(size: AppUiSettings['size']) {
  if (size === 'small') {
    return { block: 8, inline: 10 }
  }
  if (size === 'large') {
    return { block: 12, inline: 14 }
  }
  return { block: 10, inline: 12 }
}

export function layoutMetricsBySize(size: AppUiSettings['size']) {
  if (size === 'small') {
    return { spaceXS: 4, spaceSM: 8, spaceMD: 12, spaceLG: 16, spaceXL: 20, cardPadding: 12, contentPadding: 14 }
  }
  if (size === 'large') {
    return { spaceXS: 8, spaceSM: 12, spaceMD: 18, spaceLG: 24, spaceXL: 32, cardPadding: 22, contentPadding: 26 }
  }
  return { spaceXS: 6, spaceSM: 10, spaceMD: 16, spaceLG: 20, spaceXL: 26, cardPadding: 16, contentPadding: 20 }
}

export function syncDocumentBranding(settings: AppUiSettings) {
  const metrics = layoutMetricsBySize(settings.size)
  const appName = String(settings.appName || defaultAppUiSettings.appName).trim() || defaultAppUiSettings.appName
  document.title = appName
  document.documentElement.dataset.uiTheme = 'light'
  document.documentElement.style.setProperty('--app-primary', settings.primaryColor)
  document.documentElement.style.setProperty('--app-font-family', settings.fontFamily)
  document.documentElement.style.setProperty('--app-radius', `${settings.borderRadius}px`)
  document.documentElement.style.setProperty('--app-page-bg', settings.pageBgColor)
  document.documentElement.style.setProperty('--app-surface', settings.surfaceColor)
  document.documentElement.style.setProperty('--app-line', settings.surfaceBorderColor)
  document.documentElement.style.setProperty('--app-header-bg', settings.headerBgColor)
  document.documentElement.style.setProperty('--app-header-border', settings.headerBorderColor)
  document.documentElement.style.setProperty('--app-header-text', settings.headerTextColor)
  document.documentElement.style.setProperty('--app-sider-bg', settings.menuBgColor)
  document.documentElement.style.setProperty('--app-menu-text', settings.menuTextColor)
  document.documentElement.style.setProperty('--app-menu-group-text', settings.menuGroupTextColor)
  document.documentElement.style.setProperty('--app-menu-hover-bg', settings.menuHoverBgColor)
  document.documentElement.style.setProperty('--app-menu-active-bg', settings.menuActiveBgColor)
  document.documentElement.style.setProperty('--app-menu-active-text', settings.menuActiveTextColor)
  document.documentElement.style.setProperty('--app-text', settings.textColor)
  document.documentElement.style.setProperty('--app-text-soft', settings.textMutedColor)
  document.documentElement.style.setProperty('--app-title', settings.titleColor)
  document.documentElement.style.setProperty('--app-button-primary-bg', settings.buttonPrimaryBgColor)
  document.documentElement.style.setProperty('--app-button-primary-text', settings.buttonPrimaryTextColor)
  document.documentElement.style.setProperty('--app-button-primary-border', settings.buttonPrimaryBorderColor)
  document.documentElement.style.setProperty('--app-button-default-bg', settings.buttonDefaultBgColor)
  document.documentElement.style.setProperty('--app-button-default-text', settings.buttonDefaultTextColor)
  document.documentElement.style.setProperty('--app-button-default-border', settings.buttonDefaultBorderColor)
  document.documentElement.style.setProperty('--app-button-secondary-bg', settings.buttonSecondaryBgColor)
  document.documentElement.style.setProperty('--app-button-secondary-text', settings.buttonSecondaryTextColor)
  document.documentElement.style.setProperty('--app-button-secondary-border', settings.buttonSecondaryBorderColor)
  document.documentElement.style.setProperty('--app-button-success-bg', settings.buttonSuccessBgColor)
  document.documentElement.style.setProperty('--app-button-success-text', settings.buttonSuccessTextColor)
  document.documentElement.style.setProperty('--app-button-success-border', settings.buttonSuccessBorderColor)
  document.documentElement.style.setProperty('--app-button-info-bg', settings.buttonInfoBgColor)
  document.documentElement.style.setProperty('--app-button-info-text', settings.buttonInfoTextColor)
  document.documentElement.style.setProperty('--app-button-info-border', settings.buttonInfoBorderColor)
  document.documentElement.style.setProperty('--app-button-warning-bg', settings.buttonWarningBgColor)
  document.documentElement.style.setProperty('--app-button-warning-text', settings.buttonWarningTextColor)
  document.documentElement.style.setProperty('--app-button-warning-border', settings.buttonWarningBorderColor)
  document.documentElement.style.setProperty('--app-button-error-bg', settings.buttonErrorBgColor)
  document.documentElement.style.setProperty('--app-button-error-text', settings.buttonErrorTextColor)
  document.documentElement.style.setProperty('--app-button-error-border', settings.buttonErrorBorderColor)
  document.documentElement.style.setProperty('--app-shadow-soft', buildShadowValue(settings, 1))
  document.documentElement.style.setProperty('--app-shadow-strong', buildShadowValue(settings, 1.8))
  document.documentElement.style.setProperty('--app-space-xs', `${metrics.spaceXS}px`)
  document.documentElement.style.setProperty('--app-space-sm', `${metrics.spaceSM}px`)
  document.documentElement.style.setProperty('--app-space-md', `${metrics.spaceMD}px`)
  document.documentElement.style.setProperty('--app-space-lg', `${metrics.spaceLG}px`)
  document.documentElement.style.setProperty('--app-space-xl', `${metrics.spaceXL}px`)
  document.documentElement.style.setProperty('--app-card-padding', `${metrics.cardPadding}px`)
  document.documentElement.style.setProperty('--app-content-padding', `${metrics.contentPadding}px`)

  let description = document.querySelector('meta[name="description"]')
  if (!description) {
    description = document.createElement('meta')
    description.setAttribute('name', 'description')
    document.head.appendChild(description)
  }
  description.setAttribute('content', settings.appDescription || appName)

  syncBrandFavicon(settings.appIconUrl?.trim() || '')
}

const DEFAULT_FAVICON_URL = `${import.meta.env.BASE_URL}favicon.svg`

function toAbsoluteUrl(href: string) {
  try {
    return new URL(href, window.location.href).href
  } catch {
    return ''
  }
}

// Only bumped so a stale probe cannot overwrite a newer icon choice.
let faviconProbeId = 0

function syncBrandFavicon(iconUrl: string) {
  const probeId = ++faviconProbeId
  if (!iconUrl) {
    applyFavicon(DEFAULT_FAVICON_URL)
    return
  }

  const current = document.getElementById('app-favicon') as HTMLLinkElement | null
  const target = toAbsoluteUrl(iconUrl)
  if (!target) {
    applyFavicon(DEFAULT_FAVICON_URL)
    return
  }
  if (current?.href === target) return

  // The icon URL comes from settings and can easily be dead: the file was
  // removed, or its absolute host was recorded from a different origin than the
  // one the browser is on. Pointing <link> at a 404 leaves the tab with no icon
  // at all, so only swap once the image really decodes.
  const probe = new Image()
  probe.onload = () => {
    if (probeId === faviconProbeId) applyFavicon(iconUrl)
  }
  probe.onerror = () => {
    if (probeId === faviconProbeId) applyFavicon(DEFAULT_FAVICON_URL)
  }
  probe.src = iconUrl
}

function applyFavicon(href: string) {
  syncFavicon('app-favicon', 'icon', href)
  syncFavicon('app-shortcut-icon', 'shortcut icon', href)
}

function syncFavicon(id: string, rel: string, href: string) {
  const previous = document.getElementById(id) as HTMLLinkElement | null
  const type = faviconMimeType(href)
  if (previous?.href === toAbsoluteUrl(href) && previous.type === type) return

  // Replacing the element prompts browsers to reload a newly selected icon.
  const icon = document.createElement('link')
  icon.id = id
  icon.rel = rel
  icon.href = href
  if (type) icon.type = type
  previous?.replaceWith(icon)
  if (!previous) document.head.appendChild(icon)
}

function faviconMimeType(href: string) {
  if (/\.svg(?:$|[?#])/i.test(href)) return 'image/svg+xml'
  if (/\.ico(?:$|[?#])/i.test(href)) return 'image/x-icon'
  if (/\.png(?:$|[?#])/i.test(href)) return 'image/png'
  if (/\.webp(?:$|[?#])/i.test(href)) return 'image/webp'
  if (/\.gif(?:$|[?#])/i.test(href)) return 'image/gif'
  return ''
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '')
  const value = Number.parseInt(normalized, 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return `${r}, ${g}, ${b}`
}

export function buildShadowValue(settings: Pick<AppUiSettings, 'shadowColor' | 'shadowOpacity' | 'shadowBlur' | 'shadowOffsetY'>, multiplier = 1) {
  const alpha = Math.max(0, Math.min(1, (settings.shadowOpacity / 100) * multiplier))
  const blur = Math.max(0, Math.round(settings.shadowBlur * multiplier))
  const offsetY = Math.max(0, Math.round(settings.shadowOffsetY * multiplier))
  return `0 ${offsetY}px ${blur}px rgba(${hexToRgb(settings.shadowColor)}, ${alpha.toFixed(3)})`
}

export interface AppUiContextValue {
  settings: AppUiSettings
  loading: boolean
  refresh: () => Promise<void>
  save: (payload: Partial<AppUiSettings>) => Promise<AppUiSettings>
}

export const AppUiContext = createContext<AppUiContextValue | null>(null)

export function useAppUi() {
  const context = useContext(AppUiContext)
  if (!context) {
    throw new Error('useAppUi must be used within AppUiContext')
  }
  return context
}
