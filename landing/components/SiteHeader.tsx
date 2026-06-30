'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { LandingGlobalSetting, NavItem } from '../lib/landing'

function hasChildren(item: NavItem) {
  return Boolean(item.children && item.children.length > 0)
}

function DesktopMenuItem({ item, depth = 1 }: { item: NavItem; depth?: number }) {
  const childItems = item.children ?? []

  return (
    <div className={`site-header__nav-item site-header__nav-item--depth-${depth}`}>
      <a
        href={item.href}
        target={item.target}
        rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
        className="site-header__nav-link"
      >
        <span>{item.label}</span>
        {hasChildren(item) && <span className="site-header__nav-caret">▾</span>}
      </a>

      {childItems.length > 0 && (
        <div className={`site-header__submenu site-header__submenu--depth-${depth + 1}`}>
          {childItems.map((child) => (
            <DesktopMenuItem key={child.id} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

function MobileMenuItem({
  item,
  depth = 1,
  onNavigate,
}: {
  item: NavItem
  depth?: number
  onNavigate: () => void
}) {
  const [open, setOpen] = useState(false)
  const childItems = item.children ?? []

  return (
    <div className={`site-header__mobile-item site-header__mobile-item--depth-${depth}`}>
      <div className="site-header__mobile-row">
        <a
          href={item.href}
          target={item.target}
          rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
          className="site-header__mobile-link"
          onClick={onNavigate}
        >
          {item.label}
        </a>
        {childItems.length > 0 && (
          <button
            type="button"
            className={`site-header__mobile-toggle${open ? ' is-open' : ''}`}
            aria-label={open ? 'Đóng menu con' : 'Mở menu con'}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            ▾
          </button>
        )}
      </div>

      {open && childItems.length > 0 && (
        <div className="site-header__mobile-children">
          {childItems.map((child) => (
            <MobileMenuItem key={child.id} item={child} depth={depth + 1} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  )
}

export function SiteHeader({ settings }: { settings: LandingGlobalSetting }) {
  const [menuOpen, setMenuOpen] = useState(false)

  const {
    logoUrl,
    logoAlt,
    logoWidth = 160,
    headerSticky = true,
    headerBgColor = '#ffffff',
    headerCtaLabel,
    headerCtaHref,
    menuItems = [],
  } = settings

  return (
    <header
      className={`site-header${headerSticky ? ' site-header--sticky' : ''}`}
      style={{ '--header-bg': headerBgColor } as CSSProperties}
    >
      <div className="site-header__inner">
        <a href="/" className="site-header__logo">
          {logoUrl ? (
            <img src={logoUrl} alt={logoAlt || 'Logo'} style={{ width: logoWidth, height: 'auto' }} />
          ) : (
            <span className="site-header__logo-text">{logoAlt || 'Logo'}</span>
          )}
        </a>

        {menuItems.length > 0 && (
          <nav className="site-header__nav" aria-label="Menu chính">
            {menuItems.map((item) => (
              <DesktopMenuItem key={item.id} item={item} />
            ))}
          </nav>
        )}

        <div className="site-header__right">
          {headerCtaLabel && headerCtaHref && (
            <a href={headerCtaHref} className="site-header__cta cta-button">
              {headerCtaLabel}
            </a>
          )}

          {menuItems.length > 0 && (
            <button
              type="button"
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

      {menuOpen && menuItems.length > 0 && (
        <nav className="site-header__mobile-nav" aria-label="Menu mobile">
          {menuItems.map((item) => (
            <MobileMenuItem key={item.id} item={item} onNavigate={() => setMenuOpen(false)} />
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
