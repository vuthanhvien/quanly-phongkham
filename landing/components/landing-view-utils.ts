import type { CSSProperties } from 'react'
import type { LandingBackgroundStyle, LandingElementStyle, LandingSpacing } from '../lib/landing'

export function headingTag(level?: number) {
  if (level === 1) return 'h1'
  if (level === 3) return 'h3'
  if (level === 4) return 'h4'
  if (level === 5) return 'h5'
  return 'h2'
}

function spacingToCss(value?: LandingSpacing) {
  if (!value) return undefined
  const values = [value.top, value.right, value.bottom, value.left].map((item) => Math.max(0, Number(item || 0) || 0))
  return values.some((item) => item > 0) ? `${values[0]}px ${values[1]}px ${values[2]}px ${values[3]}px` : undefined
}

export function buildBackgroundStyle(background?: LandingBackgroundStyle): CSSProperties | undefined {
  if (!background || !background.type || background.type === 'none') return undefined
  if (background.type === 'color') return { backgroundColor: background.color || '#ffffff' }
  if (background.type === 'image' && background.imageUrl) return { backgroundImage: `url("${background.imageUrl}")`, backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundSize: 'cover' }
  return background.color ? { backgroundColor: background.color } : undefined
}

export function buildSpacingStyle(style?: LandingElementStyle) {
  return { margin: spacingToCss(style?.margin), padding: spacingToCss(style?.padding), border: style?.border, borderRadius: style?.borderRadius }
}

export { spacingToCss }
