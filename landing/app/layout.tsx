import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { ChatbotWidget } from '../components/ChatbotWidget'
import { SiteFooter } from '../components/SiteFooter'
import { SiteHeader } from '../components/SiteHeader'
import { getGlobalSettings, getMenuSettings } from '../lib/landing-server'
import './globals.css'

const THEME_CSS_URL = `${process.env.NEXT_PUBLIC_API_URL ?? '/api'}/public/landing-theme/style.css`

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getGlobalSettings()
  const brandName = settings.logoAlt?.trim() || 'Landing'

  return {
    title: brandName,
    description: brandName,
    ...(settings.logoUrl ? { icons: { icon: settings.logoUrl } } : {}),
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [globalSettings, menuItems] = await Promise.all([
    getGlobalSettings(),
    getMenuSettings(),
  ])
  const siteSettings = { ...globalSettings, menuItems }

  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={THEME_CSS_URL} />
      </head>
      <body>
        <SiteHeader settings={siteSettings} />
        {children}
        <SiteFooter settings={siteSettings} />
        <ChatbotWidget />
      </body>
    </html>
  )
}
