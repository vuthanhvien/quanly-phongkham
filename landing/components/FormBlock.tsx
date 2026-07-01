'use client'

import { FormEvent, useState } from 'react'
import type { LandingBlock } from '../lib/landing'

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api'

export function FormBlock({ block, pageSlug }: { block: LandingBlock; pageSlug: string }) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setFeedback(null)

    try {
      const response = await fetch(`${API_URL}/public/landing-pages/${pageSlug}/forms/${block.id}/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.message || 'Gửi form thất bại')
      }

      setValues({})
      setFeedback({ type: 'success', message: block.successMessage || 'Đã gửi thành công' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gửi form thất bại'
      setFeedback({ type: 'error', message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="form-shell" onSubmit={handleSubmit}>
      <div>
        {block.title ? <h3 className="landing-title" style={{ fontSize: '2rem', marginBottom: 8 }}>{block.title}</h3> : null}
        {block.description ? <p>{block.description}</p> : null}
      </div>
      <div className="form-grid">
        {(block.fields || []).map((field) => {
          const span = Math.max(1, Math.min(12, field.span || 12))
          const value = values[field.name] || ''
          const commonProps = {
            name: field.name,
            onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
              setValues((current) => ({ ...current, [field.name]: event.target.value }))
            },
            placeholder: field.placeholder || field.label,
            required: field.required,
            value,
          }

          return (
            <div className="field-shell" key={field.id} style={{ ['--span' as string]: span }}>
              <label htmlFor={field.id}>{field.label}</label>
              {field.type === 'textarea' ? (
                <textarea id={field.id} {...commonProps} />
              ) : (
                <input id={field.id} type={field.type || 'text'} {...commonProps} />
              )}
            </div>
          )
        })}
      </div>
      {feedback ? <div className={`feedback ${feedback.type}`}>{feedback.message}</div> : null}
      <button className="cta-button" disabled={loading} type="submit">
        {loading ? 'Đang gửi...' : block.submitLabel || 'Gửi thông tin'}
      </button>
    </form>
  )
}
