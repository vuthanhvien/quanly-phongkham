'use client'

import { LandingSectionView } from './LandingSectionView'
import { deriveLandingSections, type LandingPageData } from '../lib/landing'

export function LandingPageView({ page, editMode = false }: { page: LandingPageData; editMode?: boolean }) {
  const sections = deriveLandingSections(page.blocks || [])
  const selectBlock = (blockId: string) => {
    if (!editMode) return
    window.parent.postMessage({ type: 'cms-block-select', blockId }, '*')
  }

  return <main className="shell"><div className="page-frame" style={editMode ? { marginTop: 26 } : undefined}>{sections.map((section, index) => <LandingSectionView editMode={editMode} key={section.id} pageSlug={page.slug} section={section} sectionIndex={index} onSelect={selectBlock} />)}</div></main>
}
