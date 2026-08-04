import type { LandingBlock } from '../lib/landing'
import { MediaItem } from './MediaItem'

export function LandingGalleryBlock({ block }: { block: LandingBlock }) {
  const layout = block.galleryLayout || 'grid'
  const items = block.items || []

  return (
    <section className={`landing-gallery landing-gallery--${layout}`}>
      {block.title ? <div className="landing-block-heading"><h2>{block.title}</h2>{block.description ? <p>{block.description}</p> : null}</div> : null}
      <div className="landing-gallery__grid">
        {items.map((item) => (
          <figure className="landing-gallery__item" key={item.id}>
            <MediaItem alt={block.title || 'Hình ảnh'} item={item} />
            {item.caption ? <figcaption>{item.caption}</figcaption> : null}
          </figure>
        ))}
      </div>
    </section>
  )
}
