import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LandingPageView } from '../../components/LandingPageView'
import { getLandingPage } from '../../lib/landing-server'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug?: string[] }> }): Promise<Metadata> {
  const resolvedParams = await params
  const page = await getLandingPage(`/${(resolvedParams.slug || []).join('/')}`)
  if (!page) return {}

  return {
    title: page.seoTitle?.trim() || page.title,
    description: page.seoDescription?.trim() || page.description?.trim(),
  }
}

export default async function DynamicLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>
  searchParams: Promise<Record<string, string>>
}) {
  const resolvedParams = await params
  const resolvedSearch = await searchParams
  const pathname = `/${(resolvedParams.slug || []).join('/')}`
  const page = await getLandingPage(pathname)
  const editMode = resolvedSearch?.cms_edit === '1'

  if (!page) {
    notFound()
  }

  return <LandingPageView page={page} editMode={editMode} />
}
