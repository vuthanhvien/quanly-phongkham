import { notFound } from 'next/navigation'
import { LandingPageView } from '../components/LandingPageView'
import { getLandingPage } from '../lib/landing'

export const dynamic = 'force-dynamic'

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const page = await getLandingPage('/')
  const resolvedSearch = await searchParams
  const editMode = resolvedSearch?.cms_edit === '1'

  if (!page) {
    notFound()
  }

  return <LandingPageView page={page} editMode={editMode} />
}
