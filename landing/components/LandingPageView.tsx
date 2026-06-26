'use client'

import { FormBlock } from './FormBlock'
import { LandingPageData, embedVideoUrl, isVideoEmbed, sortBlocks } from '../lib/landing'

function headingTag(level?: number) {
  if (level === 1) return 'h1'
  if (level === 3) return 'h3'
  if (level === 4) return 'h4'
  if (level === 5) return 'h5'
  return 'h2'
}

export function LandingPageView({ page, editMode = false }: { page: LandingPageData; editMode?: boolean }) {
  const blocks = sortBlocks(page.blocks || [])

  function selectBlock(blockId: string) {
    if (!editMode) return
    try {
      window.parent.postMessage({ type: 'cms-block-select', blockId }, '*')
    } catch {
      // cross-origin or no parent — ignore
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
          ✏️ Chế độ edit — click vào block để chọn trong CMS
        </div>
      )}
      <div className="page-frame" style={editMode ? { marginTop: 26 } : undefined}>
        <section className="hero">
          <div className="eyebrow">Thiện Chánh clinic landing</div>
          <h1>{page.seoTitle || page.title}</h1>
          {page.description || page.seoDescription ? <p>{page.description || page.seoDescription}</p> : null}
        </section>

        <section className="landing-grid">
          {blocks.map((block) => {
            const Tag = headingTag(block.level)
            const span = Math.max(1, Math.min(12, block.span || 12))

            return (
              <article
                className={`landing-block${editMode ? ' cms-editable' : ''}`}
                key={block.id}
                data-block-id={block.id}
                style={{ ['--span' as string]: span, cursor: editMode ? 'pointer' : undefined }}
                onClick={editMode ? () => selectBlock(block.id) : undefined}
              >
                {block.type === 'title' ? (
                  <Tag className="landing-title" style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', textAlign: block.align || 'left' }}>
                    {block.title}
                  </Tag>
                ) : null}

                {block.type === 'text' ? (
                  <p style={{ textAlign: block.align || 'left', whiteSpace: 'pre-wrap' }}>{block.text}</p>
                ) : null}

                {block.type === 'image' ? (
                  <div>
                    <div className="landing-media">
                      <img alt={block.alt || block.title || 'Landing image'} src={block.url || ''} />
                    </div>
                    {block.caption ? <div className="landing-caption">{block.caption}</div> : null}
                  </div>
                ) : null}

                {block.type === 'video' ? (
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
                ) : null}

                {block.type === 'form' ? <FormBlock block={block} pageSlug={page.slug} /> : null}
              </article>
            )
          })}
        </section>
      </div>
    </main>
  )
}
