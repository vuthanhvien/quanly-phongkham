import { notFound } from 'next/navigation'
import { LandingPageView } from '../components/LandingPageView'
import { getLandingPage } from '../lib/landing'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const page = await getLandingPage('/')

  if (!page) {
    notFound()
  }

  return <LandingPageView page={page} />
}