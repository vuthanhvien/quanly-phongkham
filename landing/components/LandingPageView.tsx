'use client'

import { FormBlock } from './FormBlock'
import type { CSSProperties } from 'react'
import { LandingPageData, deriveLandingSections, embedVideoUrl, isVideoEmbed, type LandingBackgroundStyle, type LandingElementStyle, type LandingSpacing } from '../lib/landing'

function headingTag(level?: number) {
  if (level === 1) return 'h1'
  if (level === 3) return 'h3'
  if (level === 4) return 'h4'
  if (level === 5) return 'h5'
  return 'h2'
}

function spacingToCss(value?: LandingSpacing) {
  if (!value) return undefined
  const top = Math.max(0, Number(value.top || 0) || 0)
  const right = Math.max(0, Number(value.right || 0) || 0)
  const bottom = Math.max(0, Number(value.bottom || 0) || 0)
  const left = Math.max(0, Number(value.left || 0) || 0)
  if (![top, right, bottom, left].some((item) => item > 0)) return undefined
  return `${top}px ${right}px ${bottom}px ${left}px`
}

function buildBackgroundStyle(background?: LandingBackgroundStyle): CSSProperties | undefined {
  if (!background || !background.type || background.type === 'none') return undefined
  if (background.type === 'color') {
    return { backgroundColor: background.color || '#ffffff' }
  }
  if (background.type === 'image' && background.imageUrl) {
    return {
      backgroundImage: `url("${background.imageUrl}")`,
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover',
    }
  }
  if (background.type === 'video') {
    return background.color ? { backgroundColor: background.color } : undefined
  }
  return undefined
}

function buildSpacingStyle(style?: LandingElementStyle) {
  return {
    margin: spacingToCss(style?.margin),
    padding: spacingToCss(style?.padding),
  }
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
          Chế độ chỉnh sửa - bấm vào block để chọn trong CMS
        </div>
      )}
      <div className="page-frame" style={editMode ? { marginTop: 26 } : undefined}>
        <section className="hero">
          <div className="hero__content">
            <div className="eyebrow">Landing page Thiện Chánh</div>
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
              style={{ margin: spacingToCss(section.style?.margin) }}
            >
              <div
                className={`landing-section__surface landing-section__surface--${section.width}${section.style?.background?.type && section.style.background.type !== 'none' ? ' landing-section__surface--styled' : ''}`}
                style={{
                  ...buildBackgroundStyle(section.style?.background),
                  padding: spacingToCss(section.style?.padding),
                }}
              >
                {section.style?.background?.type === 'video' && section.style.background.videoUrl ? (
                  <video
                    autoPlay
                    className="landing-bg-video"
                    loop
                    muted
                    playsInline
                    src={section.style.background.videoUrl}
                  />
                ) : null}
                <div className={`landing-section__inner landing-section__inner--${section.width}`}>
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
                            style={{
                              ['--span' as string]: span,
                              cursor: editMode ? 'pointer' : undefined,
                              margin: buildSpacingStyle(block.blockStyle).margin,
                            }}
                            onClick={editMode ? () => selectBlock(block.id) : undefined}
                          >
                            <div
                              className={`landing-block__surface${block.type === 'form' ? ' landing-block__surface--panel' : ''}${block.blockStyle?.background?.type && block.blockStyle.background.type !== 'none' ? ' landing-block__surface--styled' : ''}`}
                              style={{
                                ...buildBackgroundStyle(block.blockStyle?.background),
                                padding: buildSpacingStyle(block.blockStyle).padding,
                              }}
                            >
                              {block.blockStyle?.background?.type === 'video' && block.blockStyle.background.videoUrl ? (
                                <video
                                  autoPlay
                                  className="landing-bg-video"
                                  loop
                                  muted
                                  playsInline
                                  src={block.blockStyle.background.videoUrl}
                                />
                              ) : null}
                              <div className="landing-block__content">
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
                                      <img alt={block.alt || block.title || 'Hình ảnh landing'} src={block.url || ''} />
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
                                          title={block.title || 'Video landing'}
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
                                            <img alt={slide.alt || slide.caption || block.title || 'Ảnh trình chiếu'} src={slide.url || ''} />
                                          </div>
                                          {slide.caption ? <figcaption className="landing-caption">{slide.caption}</figcaption> : null}
                                        </figure>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}

                                {block.type === 'form' ? <FormBlock block={block} pageSlug={page.slug} /> : null}
                              </div>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  </div>
                ))}
                </div>
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}
