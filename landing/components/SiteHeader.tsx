'use client'

import { useState } from 'react'
import type { LandingGlobalSetting } from '../lib/landing'

export function SiteHeader({ settings }: { settings: LandingGlobalSetting }) {
  const [menuOpen, setMenuOpen] = useState(false)

  const { logoUrl, logoAlt, logoWidth = 160, headerSticky = true, headerBgColor = '#ffffff', headerCtaLabel, headerCtaHref, menuItems = [] } = settings

  return (
    <header
      className={`site-header${headerSticky ? ' site-header--sticky' : ''}`}
      style={{ '--header-bg': headerBgColor } as React.CSSProperties}
    >
      <div className="site-header__inner">
        {/* Logo */}
        <a href="/" className="site-header__logo">
          {logoUrl ? (
            <img src={logoUrl} alt={logoAlt || 'Logo'} style={{ width: logoWidth, height: 'auto' }} />
          ) : (
            <span className="site-header__logo-text">{logoAlt || 'Logo'}</span>
          )}
        </a>

        {/* Nav — desktop */}
        {menuItems.length > 0 && (
          <nav className="site-header__nav" aria-label="Menu chính">
            {menuItems.map((item) => (
              <a
                key={item.id}
                href={item.href}
                target={item.target}
                rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
                className="site-header__nav-link"
              >
                {item.label}
              </a>
            ))}
          </nav>
        )}

        <div className="site-header__right">
          {headerCtaLabel && headerCtaHref && (
            <a href={headerCtaHref} className="site-header__cta cta-button">
              {headerCtaLabel}
            </a>
          )}

          {/* Hamburger — mobile */}
          {menuItems.length > 0 && (
            <button
              className="site-header__hamburger"
              aria-label="Mở menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span /><span /><span />
            </button>
          )}
        </div>
      </div>

      {/* Mobile nav drawer */}
      {menuOpen && menuItems.length > 0 && (
        <nav className="site-header__mobile-nav" aria-label="Menu mobile">
          {menuItems.map((item) => (
            <a
              key={item.id}
              href={item.href}
              target={item.target}
              rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
              className="site-header__mobile-link"
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </a>
          ))}
          {headerCtaLabel && headerCtaHref && (
            <a href={headerCtaHref} className="site-header__cta cta-button" style={{ marginTop: 8 }}>
              {headerCtaLabel}
            </a>
          )}
        </nav>
      )}
    </header>
  )
}
