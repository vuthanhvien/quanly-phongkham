import { createContext, useContext } from 'react'

const APP_UI_STORAGE_KEY = 'clinic-app-ui-settings'

export interface AppUiSettings {
  id?: string
  appKey?: string
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
  buttonPrimaryTextColor: string
  buttonDefaultBgColor: string
  buttonDefaultTextColor: string
  buttonDefaultBorderColor: string
  shadowColor: string
  shadowOpacity: number
  shadowBlur: number
  shadowOffsetY: number
  theme: 'dark' | 'light'
  borderRadius: number
  size: 'small' | 'medium' | 'large'
  fontFamily: string
}

export const fontFamilyOptions = [
  { value: '"Plus Jakarta Sans", Inter, Arial, sans-serif', label: 'Plus Jakarta Sans' },
  { value: '"Be Vietnam Pro", Inter, Arial, sans-serif', label: 'Be Vietnam Pro' },
  { value: '"Manrope", Inter, Arial, sans-serif', label: 'Manrope' },
  { value: '"Space Grotesk", Inter, Arial, sans-serif', label: 'Space Grotesk' },
  { value: '"DM Sans", Inter, Arial, sans-serif', label: 'DM Sans' },
  { value: '"Nunito Sans", Inter, Arial, sans-serif', label: 'Nunito Sans' },
  { value: '"IBM Plex Sans", Inter, Arial, sans-serif', label: 'IBM Plex Sans' },
  { value: '"Public Sans", Inter, Arial, sans-serif', label: 'Public Sans' },
  { value: '"Work Sans", Inter, Arial, sans-serif', label: 'Work Sans' },
  { value: '"Barlow", Inter, Arial, sans-serif', label: 'Barlow' },
] as const

export const defaultAppUiSettings: AppUiSettings = {
  appName: 'Thiện Chánh CMS',
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
  buttonPrimaryTextColor: '#ffffff',
  buttonDefaultBgColor: '#ffffff',
  buttonDefaultTextColor: '#1f2430',
  buttonDefaultBorderColor: '#dbe1ea',
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

export function syncDocumentBranding(settings: AppUiSettings) {
  document.title = settings.appName
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
  document.documentElement.style.setProperty('--app-button-primary-text', settings.buttonPrimaryTextColor)
  document.documentElement.style.setProperty('--app-button-default-bg', settings.buttonDefaultBgColor)
  document.documentElement.style.setProperty('--app-button-default-text', settings.buttonDefaultTextColor)
  document.documentElement.style.setProperty('--app-button-default-border', settings.buttonDefaultBorderColor)
  document.documentElement.style.setProperty('--app-shadow-soft', buildShadowValue(settings, 1))
  document.documentElement.style.setProperty('--app-shadow-strong', buildShadowValue(settings, 1.8))

  let description = document.querySelector('meta[name="description"]')
  if (!description) {
    description = document.createElement('meta')
    description.setAttribute('name', 'description')
    document.head.appendChild(description)
  }
  description.setAttribute('content', settings.appDescription || settings.appName)

  let icon = document.querySelector('link[rel="icon"]')
  if (!icon) {
    icon = document.createElement('link')
    icon.setAttribute('rel', 'icon')
    document.head.appendChild(icon)
  }
  if (settings.appIconUrl) {
    icon.setAttribute('href', settings.appIconUrl)
  } else {
    icon.removeAttribute('href')
  }
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
