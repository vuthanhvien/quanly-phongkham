import { LandingBlockRenderer } from './LandingBlockRenderer'
import { buildBackgroundStyle, spacingToCss } from './landing-view-utils'
import type { LandingSection } from '../lib/landing'

export function LandingSectionView({ section, sectionIndex, pageSlug, editMode, onSelect }: { section: LandingSection; sectionIndex: number; pageSlug: string; editMode: boolean; onSelect: (blockId: string) => void }) {
  const rows = Array.from(section.blocks.reduce((map, block) => {
    const list = map.get(String(block.row || 0)) || []
    list.push(block)
    map.set(String(block.row || 0), list)
    return map
  }, new Map<string, typeof section.blocks>()))

  return (
    <section className={`landing-section landing-section--${section.width}`} style={{ margin: spacingToCss(section.style?.margin) }}>
      <div className={`landing-section__surface landing-section__surface--${section.width}${section.style?.background?.type && section.style.background.type !== 'none' ? ' landing-section__surface--styled' : ''}`} style={{ ...buildBackgroundStyle(section.style?.background), border: section.style?.border, borderRadius: section.style?.borderRadius, padding: spacingToCss(section.style?.padding) }}>
        {section.style?.background?.type === 'video' && section.style.background.videoUrl ? <video autoPlay className="landing-bg-video" loop muted playsInline src={section.style.background.videoUrl} /> : null}
        <div className={`landing-section__inner landing-section__inner--${section.width}`}>
          {rows.map(([rowKey, blocks], rowIndex) => <div className="landing-row" key={`${section.id}-${rowKey}`}><div className="landing-grid">{blocks.map((block) => <LandingBlockRenderer block={block} editMode={editMode} heroTitle={sectionIndex === 0 && rowIndex === 0} key={block.id} pageSlug={pageSlug} onSelect={() => onSelect(block.id)} />)}</div></div>)}
        </div>
      </div>
    </section>
  )
}
