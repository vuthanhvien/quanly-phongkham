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
  theme: 'dark',
  borderRadius: 14,
  size: 'medium',
  fontFamily: fontFamilyOptions[0].value,
}

export function normalizeAppUiSettings(payload?: Partial<AppUiSettings> | null): AppUiSettings {
  return {
    ...defaultAppUiSettings,
    ...(payload || {}),
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
  document.documentElement.dataset.uiTheme = settings.theme
  document.documentElement.style.setProperty('--app-primary', settings.primaryColor)
  document.documentElement.style.setProperty('--app-font-family', settings.fontFamily)
  document.documentElement.style.setProperty('--app-radius', `${settings.borderRadius}px`)
  document.documentElement.style.setProperty('--app-text', settings.theme === 'light' ? '#22160f' : '#fff7fb')
  document.documentElement.style.setProperty('--app-text-soft', settings.theme === 'light' ? '#6f5849' : '#eab4ca')
  document.documentElement.style.setProperty('--app-line', settings.theme === 'light' ? 'rgba(34, 22, 15, 0.08)' : 'rgba(255, 255, 255, 0.08)')
  document.documentElement.style.setProperty('--app-sider-bg', settings.theme === 'light' ? 'linear-gradient(180deg, rgba(251, 246, 240, 0.98), rgba(242, 234, 223, 0.98))' : 'linear-gradient(180deg, rgba(22, 13, 26, 0.96), rgba(8, 7, 11, 0.98))')
  document.documentElement.style.setProperty('--app-page-bg', settings.theme === 'light' ? '#f6efe6' : '#08070b')
  document.documentElement.style.setProperty('--app-page-overlay', settings.theme === 'light'
    ? 'radial-gradient(circle at 12% 12%, rgba(232, 137, 174, 0.1), transparent 34%), radial-gradient(circle at 82% 6%, rgba(215, 164, 91, 0.1), transparent 30%), linear-gradient(135deg, #fbf6f0 0%, #f3ebe0 46%, #eadccc 100%)'
    : 'radial-gradient(circle at 12% 12%, rgba(232, 137, 174, 0.22), transparent 34%), radial-gradient(circle at 82% 6%, rgba(215, 164, 91, 0.16), transparent 30%), linear-gradient(135deg, #08070b 0%, #110914 46%, #170d16 100%)')

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
