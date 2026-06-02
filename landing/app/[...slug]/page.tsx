import { notFound } from 'next/navigation'
import { LandingPageView } from '../../components/LandingPageView'
import { getLandingPage } from '../../lib/landing'

export const dynamic = 'force-dynamic'

export default async function DynamicLandingPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const resolvedParams = await params
  const pathname = `/${(resolvedParams.slug || []).join('/')}`
  const page = await getLandingPage(pathname)

  if (!page) {
    notFound()
  }

  return <LandingPageView page={page} />
}