import 'server-only'
import { headers } from 'next/headers'
import { normalizeMenuItems, type LandingGlobalSetting, type LandingPageData, type NavItem } from './landing'

const FALLBACK_SERVER_API_URL = process.env.LANDING_API_URL || 'http://127.0.0.1:3001/api'

async function getServerApiUrl() {
  const requestHeaders = await headers()
  const host = (requestHeaders.get('x-forwarded-host') || requestHeaders.get('host') || '').split(',')[0].trim()
  const isLocalHost = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host)
  const protocol = isLocalHost ? 'http' : 'https'

  if (/^[a-zA-Z0-9.:[\]-]+$/.test(host) && (protocol === 'http' || protocol === 'https')) {
    const apiUrl = `${protocol}://${host}/api`
    console.info('[landing] Resolved request API URL', { apiUrl, host, protocol })
    return apiUrl
  }

  console.warn('[landing] Falling back to configured API URL', { host, protocol, apiUrl: FALLBACK_SERVER_API_URL })
  return FALLBACK_SERVER_API_URL
}

export async function getGlobalSettings(): Promise<LandingGlobalSetting> {
  try {
    const apiUrl = await getServerApiUrl()
    const endpoint = `${apiUrl}/public/landing-pages/global`
    console.info('[landing] Fetching global settings', { endpoint })
    const res = await fetch(endpoint, { cache: 'no-store' })
    console.info('[landing] Global settings response', { endpoint, status: res.status })
    if (!res.ok) return {}
    const raw = await res.json() as LandingGlobalSetting & { data?: LandingGlobalSetting }
    const data = raw.data ?? raw
    return { ...data, menuItems: normalizeMenuItems(data.menuItems) }
  } catch (error) {
    console.error('[landing] Failed to load global settings', { error })
    return {}
  }
}

export async function getMenuSettings(): Promise<NavItem[]> {
  try {
    const apiUrl = await getServerApiUrl()
    const endpoint = `${apiUrl}/public/landing-pages/menu`
    console.info('[landing] Fetching menu settings', { endpoint })
    const res = await fetch(endpoint, { cache: 'no-store' })
    console.info('[landing] Menu settings response', { endpoint, status: res.status })
    if (!res.ok) return normalizeMenuItems((await getGlobalSettings()).menuItems)
    const raw = await res.json() as { data?: NavItem[] } | NavItem[]
    return normalizeMenuItems(Array.isArray(raw) ? raw : (raw.data ?? []))
  } catch (error) {
    console.error('[landing] Failed to load menu settings', { error })
    return normalizeMenuItems((await getGlobalSettings()).menuItems)
  }
}

export async function getLandingPage(pathname: string): Promise<LandingPageData | null> {
  if (!pathname || pathname.startsWith('/_')) return null

  try {
    const apiUrl = await getServerApiUrl()
    const endpoint = `${apiUrl}/public/landing-pages/resolve?path=${encodeURIComponent(pathname)}`
    console.info('[landing] Fetching page', { pathname, endpoint })
    const response = await fetch(endpoint, { cache: 'no-store' })
    console.info('[landing] Page response', { pathname, endpoint, status: response.status })
    if (response.status === 404) return null
    if (!response.ok) throw new Error(`Landing API returned ${response.status} for ${pathname}`)

    const payload = await response.json()
    if (!payload.data) throw new Error(`Landing API returned no data for ${pathname}`)
    return payload.data as LandingPageData
  } catch (error) {
    console.error('[landing] Failed to load landing page', { pathname, error })
    throw error
  }
}
