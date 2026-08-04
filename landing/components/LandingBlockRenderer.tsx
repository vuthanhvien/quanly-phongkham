import { FormBlock } from './FormBlock'
import { LandingContentListBlock } from './LandingContentListBlock'
import { LandingGalleryBlock } from './LandingGalleryBlock'
import { LandingSliderBlock } from './LandingSliderBlock'
import { buildBackgroundStyle, buildSpacingStyle, headingTag } from './landing-view-utils'
import { embedVideoUrl, isVideoEmbed, type LandingBlock } from '../lib/landing'

export function LandingBlockRenderer({ block, pageSlug, heroTitle, editMode, onSelect }: { block: LandingBlock; pageSlug: string; heroTitle: boolean; editMode: boolean; onSelect: () => void }) {
  const Tag = headingTag(block.level)
  const span = Math.max(1, Math.min(12, block.span || 12))
  const className = ['landing-block', `landing-block--${block.type}`, span >= 8 ? 'landing-block--wide' : 'landing-block--narrow', block.type === 'form' ? 'landing-block--panel' : '', editMode ? 'cms-editable' : ''].filter(Boolean).join(' ')

  return (
    <article className={className} data-block-id={block.id} key={block.id} style={{ ['--span' as string]: span, cursor: editMode ? 'pointer' : undefined, margin: buildSpacingStyle(block.blockStyle).margin }} onClick={editMode ? onSelect : undefined}>
      <div className={`landing-block__surface${block.type === 'form' ? ' landing-block__surface--panel' : ''}${block.blockStyle?.background?.type && block.blockStyle.background.type !== 'none' ? ' landing-block__surface--styled' : ''}`} style={{ ...buildBackgroundStyle(block.blockStyle?.background), ...buildSpacingStyle(block.blockStyle) }}>
        {block.blockStyle?.background?.type === 'video' && block.blockStyle.background.videoUrl ? <video autoPlay className="landing-bg-video" loop muted playsInline src={block.blockStyle.background.videoUrl} /> : null}
        <div className="landing-block__content">
          {block.type === 'title' ? <Tag className="landing-title" style={{ fontSize: heroTitle ? 'clamp(2.2rem, 4vw, 4.2rem)' : 'clamp(1.5rem, 3vw, 2.6rem)', textAlign: block.align || 'left' }}>{block.title}</Tag> : null}
          {block.type === 'text' ? <div className="landing-copy"><p style={{ textAlign: block.align || 'left', whiteSpace: 'pre-wrap' }}>{block.text}</p></div> : null}
          {block.type === 'image' ? <div className="landing-visual"><div className="landing-media"><img alt={block.alt || block.title || 'Hình ảnh landing'} src={block.url || ''} /></div>{block.caption ? <div className="landing-caption">{block.caption}</div> : null}</div> : null}
          {block.type === 'video' ? <div className="landing-visual"><div className="landing-media">{isVideoEmbed(block.url || '') ? <iframe allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen src={embedVideoUrl(block.url || '')} title={block.title || 'Video landing'} /> : <video controls src={block.url || ''} />}</div></div> : null}
          {block.type === 'slider' ? <LandingSliderBlock block={block} /> : null}
          {block.type === 'gallery' ? <LandingGalleryBlock block={block} /> : null}
          {block.type === 'posts' || block.type === 'news' ? <LandingContentListBlock block={block} /> : null}
          {block.type === 'form' ? <FormBlock block={block} pageSlug={pageSlug} /> : null}
        </div>
      </div>
    </article>
  )
}
