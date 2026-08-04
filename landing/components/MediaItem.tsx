import type { LandingContentItem } from '../lib/landing'

export function MediaItem({ item, alt }: { item: LandingContentItem; alt: string }) {
  return item.url ? <img alt={item.alt || alt} src={item.url} /> : <div aria-label={item.alt || alt} className="landing-media__placeholder" role="img" />
}
