import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { ChatbotWidget } from '../components/ChatbotWidget'
import { SiteFooter } from '../components/SiteFooter'
import { SiteHeader } from '../components/SiteHeader'
import { getGlobalSettings, getMenuSettings } from '../lib/landing'
import './globals.css'

export const metadata: Metadata = {
  title: 'Thiện Chánh Landing',
  description: 'Landing pages rendered from CMS blocks',
}

const THEME_CSS_URL = `${process.env.NEXT_PUBLIC_API_URL ?? '/api'}/public/landing-theme/style.css`

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
