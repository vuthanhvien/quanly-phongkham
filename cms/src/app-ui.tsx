import { createContext, useContext } from 'react'

const APP_UI_STORAGE_KEY = 'clinic-app-ui-settings'

export interface AppUiSettings {
  id?: string
  appKey?: string
  appName: string
  appDescription?: string
  appIconUrl?: string
  primaryColor: string
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
  appDescription: 'CMS vận hành viện thẩm mỹ',
  appIconUrl: '',
  primaryColor: '#e889ae',
  theme: 'light',
  borderRadius: 14,
  size: 'medium',
  fontFamily: fontFamilyOptions[0].value,
}

export function normalizeAppUiSettings(payload?: Partial<AppUiSettings> | null): AppUiSettings {
  return {
    ...defaultAppUiSettings,
    ...(payload || {}),
    theme: 'light',
  }
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
