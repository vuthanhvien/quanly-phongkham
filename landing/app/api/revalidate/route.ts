import { revalidatePath, revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

const LANDING_CACHE_TAG = 'landing-content'

export async function POST(request: Request) {
  const secret = process.env.LANDING_REVALIDATE_SECRET || process.env.JWT_SECRET
  const authorization = request.headers.get('authorization')

  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  revalidateTag(LANDING_CACHE_TAG)
  revalidatePath('/', 'layout')

  return NextResponse.json({ revalidated: true })
}
