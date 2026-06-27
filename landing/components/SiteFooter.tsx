import type { LandingGlobalSetting } from '../lib/landing'

const SOCIAL_ICONS: Record<string, string> = {
  facebook: 'f',
  instagram: 'in',
  youtube: 'yt',
  tiktok: 'tt',
  zalo: 'z',
  twitter: 'x',
  linkedin: 'li',
}

function socialIcon(platform: string) {
  return SOCIAL_ICONS[platform.toLowerCase()] ?? platform.slice(0, 2).toLowerCase()
}

export function SiteFooter({ settings }: { settings: LandingGlobalSetting }) {
  const { footerColumns = [], footerSocialLinks = [], footerCopyright } = settings

  if (!footerColumns.length && !footerSocialLinks.length && !footerCopyright) return null

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        {footerColumns.length > 0 && (
          <div className="site-footer__columns">
            {footerColumns.map((col) => (
              <div key={col.id} className="site-footer__col">
                <p className="site-footer__col-title">{col.title}</p>
                <ul className="site-footer__links">
                  {col.links.map((link) => (
                    <li key={link.id}>
                      <a href={link.href} className="site-footer__link">{link.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <div className="site-footer__bottom">
          {footerSocialLinks.length > 0 && (
            <div className="site-footer__social">
              {footerSocialLinks.map((s) => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="site-footer__social-link"
                  aria-label={s.platform}
                >
                  {socialIcon(s.platform)}
                </a>
              ))}
            </div>
          )}
          {footerCopyright && (
            <p className="site-footer__copy">{footerCopyright}</p>
          )}
        </div>
      </div>
    </footer>
  )
}
