import { FormBlock } from './FormBlock'
import { LandingPageData, embedVideoUrl, isVideoEmbed, sortBlocks } from '../lib/landing'

function headingTag(level?: number) {
  if (level === 1) return 'h1'
  if (level === 3) return 'h3'
  if (level === 4) return 'h4'
  if (level === 5) return 'h5'
  return 'h2'
}

export function LandingPageView({ page }: { page: LandingPageData }) {
  const blocks = sortBlocks(page.blocks || [])

  return (
    <main className="shell">
      <div className="page-frame">
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
              <article className="landing-block" key={block.id} style={{ ['--span' as string]: span }}>
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