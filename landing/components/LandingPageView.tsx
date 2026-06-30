'use client'

import { FormBlock } from './FormBlock'
import { LandingPageData, deriveLandingSections, embedVideoUrl, isVideoEmbed } from '../lib/landing'

function headingTag(level?: number) {
  if (level === 1) return 'h1'
  if (level === 3) return 'h3'
  if (level === 4) return 'h4'
  if (level === 5) return 'h5'
  return 'h2'
}

export function LandingPageView({ page, editMode = false }: { page: LandingPageData; editMode?: boolean }) {
  const sections = deriveLandingSections(page.blocks || [])

  function selectBlock(blockId: string) {
    if (!editMode) return
    try {
      window.parent.postMessage({ type: 'cms-block-select', blockId }, '*')
    } catch {
      // cross-origin or no parent - ignore
    }
  }

  return (
    <main className="shell">
      {editMode && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            background: '#1677ff',
            color: '#fff',
            textAlign: 'center',
            padding: '4px 0',
            fontSize: 12,
            fontFamily: 'system-ui,sans-serif',
            pointerEvents: 'none',
          }}
        >
          Edit mode - click block to select in CMS
        </div>
      )}
      <div className="page-frame" style={editMode ? { marginTop: 26 } : undefined}>
        <section className="hero">
          <div className="hero__content">
            <div className="eyebrow">Thien Chanh clinic landing</div>
            <h1>{page.seoTitle || page.title}</h1>
            {page.description || page.seoDescription ? <p>{page.description || page.seoDescription}</p> : null}
          </div>
          <div className="hero__ambient" aria-hidden="true">
            <div className="hero__orb hero__orb--one" />
            <div className="hero__orb hero__orb--two" />
          </div>
        </section>

        {sections.map((section, sectionIndex) => {
          const rows = Array.from(
            section.blocks.reduce((map, block) => {
              const key = String(block.row || 0)
              const list = map.get(key) || []
              list.push(block)
              map.set(key, list)
              return map
            }, new Map<string, typeof section.blocks>()),
          )

          return (
            <section
              className={`landing-section landing-section--${section.width}`}
              key={section.id}
            >
              <div className="landing-section__inner">
                {rows.map(([rowKey, rowBlocks], rowIndex) => (
                  <div className="landing-row" key={`${section.id}-${rowKey}`}>
                    <div className="landing-grid">
                      {rowBlocks.map((block) => {
                        const Tag = headingTag(block.level)
                        const span = Math.max(1, Math.min(12, block.span || 12))
                        const blockClass = [
                          'landing-block',
                          `landing-block--${block.type}`,
                          span >= 8 ? 'landing-block--wide' : 'landing-block--narrow',
                          block.type === 'form' ? 'landing-block--panel' : '',
                          editMode ? 'cms-editable' : '',
                        ].filter(Boolean).join(' ')

                        return (
                          <article
                            className={blockClass}
                            key={block.id}
                            data-block-id={block.id}
                            style={{ ['--span' as string]: span, cursor: editMode ? 'pointer' : undefined }}
                            onClick={editMode ? () => selectBlock(block.id) : undefined}
                          >
                            {block.type === 'title' ? (
                              <Tag
                                className="landing-title"
                                style={{
                                  fontSize: sectionIndex === 0 && rowIndex === 0 ? 'clamp(2.2rem, 4vw, 4.2rem)' : 'clamp(1.5rem, 3vw, 2.6rem)',
                                  textAlign: block.align || 'left',
                                }}
                              >
                                {block.title}
                              </Tag>
                            ) : null}

                            {block.type === 'text' ? (
                              <div className="landing-copy">
                                <p style={{ textAlign: block.align || 'left', whiteSpace: 'pre-wrap' }}>{block.text}</p>
                              </div>
                            ) : null}

                            {block.type === 'image' ? (
                              <div className="landing-visual">
                                <div className="landing-media">
                                  <img alt={block.alt || block.title || 'Landing image'} src={block.url || ''} />
                                </div>
                                {block.caption ? <div className="landing-caption">{block.caption}</div> : null}
                              </div>
                            ) : null}

                            {block.type === 'video' ? (
                              <div className="landing-visual">
                                <div className="landing-media">
                                  {isVideoEmbed(block.url || '') ? (
                                    <iframe
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                      src={embedVideoUrl(block.url || '')}
                                      title={block.title || 'Landing video'}
                                    />
                                  ) : (
                                    <video controls src={block.url || ''} />
                                  )}
                                </div>
                              </div>
                            ) : null}

                            {block.type === 'slider' ? (
                              <div className="landing-slider">
                                {block.title ? <h3 className="landing-slider__title">{block.title}</h3> : null}
                                <div className="landing-slider__track">
                                  {(block.slides || []).map((slide) => (
                                    <figure className="landing-slider__slide" key={slide.id}>
                                      <div className="landing-media">
                                        <img alt={slide.alt || slide.caption || block.title || 'Slider image'} src={slide.url || ''} />
                                      </div>
                                      {slide.caption ? <figcaption className="landing-caption">{slide.caption}</figcaption> : null}
                                    </figure>
                                  ))}
                                </div>
                              </div>
                            ) : null}

                            {block.type === 'form' ? <FormBlock block={block} pageSlug={page.slug} /> : null}
                          </article>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}
