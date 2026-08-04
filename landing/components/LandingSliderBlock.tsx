'use client'

import { useState } from 'react'
import type { LandingBlock } from '../lib/landing'

export function LandingSliderBlock({ block }: { block: LandingBlock }) {
  const slides = block.slides || []
  const [activeIndex, setActiveIndex] = useState(0)
  const activeSlide = slides[activeIndex] || slides[0]
  const variant = block.sliderVariant || 'carousel'

  if (!slides.length) return null

  function previous() {
    setActiveIndex((index) => (index - 1 + slides.length) % slides.length)
  }

  function next() {
    setActiveIndex((index) => (index + 1) % slides.length)
  }

  return (
    <section className={`landing-slider landing-slider--${variant}`}>
      {block.title ? <div className="landing-block-heading"><h2>{block.title}</h2></div> : null}
      {variant === 'cards' ? (
        <div className="landing-slider__cards">
          {slides.map((slide, index) => (
            <figure className={`landing-slider__slide${index === activeIndex ? ' is-active' : ''}`} key={slide.id} onClick={() => setActiveIndex(index)}>
              <img alt={slide.alt || slide.caption || block.title || 'Ảnh trình chiếu'} src={slide.url || ''} />
              {slide.caption ? <figcaption>{slide.caption}</figcaption> : null}
            </figure>
          ))}
        </div>
      ) : (
        <figure className="landing-slider__stage">
          <img alt={activeSlide?.alt || activeSlide?.caption || block.title || 'Ảnh trình chiếu'} src={activeSlide?.url || ''} />
          {activeSlide?.caption ? <figcaption>{activeSlide.caption}</figcaption> : null}
        </figure>
      )}
      {slides.length > 1 ? (
        <div className="landing-slider__controls">
          <button aria-label="Slide trước" type="button" onClick={previous}>←</button>
          <div className="landing-slider__dots">
            {slides.map((slide, index) => <button aria-label={`Xem slide ${index + 1}`} className={index === activeIndex ? 'is-active' : ''} key={slide.id} type="button" onClick={() => setActiveIndex(index)} />)}
          </div>
          <button aria-label="Slide tiếp" type="button" onClick={next}>→</button>
        </div>
      ) : null}
    </section>
  )
}
