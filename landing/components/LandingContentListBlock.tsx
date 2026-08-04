import type { LandingBlock } from '../lib/landing'
import { MediaItem } from './MediaItem'

export function LandingContentListBlock({ block }: { block: LandingBlock }) {
  const isNews = block.type === 'news'
  const items = block.items || []

  return (
    <section className={`landing-content-list landing-content-list--${isNews ? 'news' : 'posts'}`}>
      <div className="landing-block-heading">
        {block.title ? <h2>{block.title}</h2> : null}
        {block.description ? <p>{block.description}</p> : null}
      </div>
      <div className="landing-content-list__items">
        {items.map((item) => {
          const content = <>
            <div className="landing-content-list__image"><MediaItem alt={item.title || block.title || 'Nội dung'} item={item} /></div>
            <div className="landing-content-list__copy">
              <div className="landing-content-list__meta">{[item.label, item.date].filter(Boolean).join(' · ')}</div>
              {item.title ? <h3>{item.title}</h3> : null}
              {item.description ? <p>{item.description}</p> : null}
            </div>
          </>
          return item.href ? <a className="landing-content-list__item" href={item.href} key={item.id}>{content}</a> : <article className="landing-content-list__item" key={item.id}>{content}</article>
        })}
      </div>
    </section>
  )
}
