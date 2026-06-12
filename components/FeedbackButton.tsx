'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { submitFeedback, type FeedbackType } from '@/lib/actions/feedback'
import { useRouter } from 'next/navigation'

interface Props {
  context?: string
  defaultType?: FeedbackType
}

const TYPES: { value: FeedbackType; label: string; placeholder: string }[] = [
  {
    value: 'error',
    label: 'Report an error',
    placeholder: "What's incorrect? (e.g. wrong cause, bad translation, incorrect severity)",
  },
  {
    value: 'case',
    label: 'Share your experience',
    placeholder: 'Describe what happened — symptoms, what you tried, how it was resolved, cost if known.',
  },
  {
    value: 'missing',
    label: 'Request missing content',
    placeholder: 'What data is missing? (e.g. a vehicle model, a fault code, a market)',
  },
]

export function FeedbackButton({ context, defaultType = 'error' }: Props) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<FeedbackType>(defaultType)
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [hp, setHp] = useState('')  // honeypot
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handle(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await submitFeedback({ type, message, email: email || undefined, context, _hp: hp })
    setLoading(false)
    if (result.ok) {
      router.push('/feedback/thanks')
    } else {
      setError(result.error ?? 'Something went wrong.')
    }
  }

  const placeholder = TYPES.find((t) => t.value === type)?.placeholder ?? ''

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          fontFamily: 'var(--font-cond)',
          fontWeight: 700,
          letterSpacing: '0.06em',
          color: 'var(--green)',
          background: '#bbf7d0',
          border: '1px solid #86efac',
          borderRadius: '4px',
          padding: '7px 14px',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <span>✏</span> Suggest an edit
      </button>

      {open && createPortal(
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          overflowY: 'auto',
        }}>
          <div
            ref={dialogRef}
            style={{
              background: 'var(--bg-card, #fff)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '480px',
              overflow: 'hidden',
              margin: 'auto',
              flexShrink: 0,
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-base)' }}>
                Send Feedback
              </div>
              {context && (
                <div style={{
                  fontSize: '11px',
                  color: 'var(--text-faint)',
                  fontFamily: 'var(--font-mono)',
                  background: 'var(--bg-subtle)',
                  padding: '3px 8px',
                  borderRadius: '3px',
                  maxWidth: '200px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {context}
                </div>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-faint)',
                  cursor: 'pointer',
                  fontSize: '18px',
                  lineHeight: 1,
                  padding: '0 4px',
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
              {/* Type selector */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    style={{
                      flex: 1,
                      fontSize: '11px',
                      fontFamily: 'var(--font-cond)',
                      fontWeight: 600,
                      padding: '6px 4px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: type === t.value ? 'var(--green)' : 'var(--border-soft)',
                      background: type === t.value ? 'color-mix(in srgb, var(--green) 10%, transparent)' : 'transparent',
                      color: type === t.value ? 'var(--green)' : 'var(--text-muted)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Message */}
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={placeholder}
                required
                rows={4}
                style={{
                  width: '100%',
                  fontSize: '13px',
                  color: 'var(--text-base)',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-soft)',
                  borderRadius: '4px',
                  padding: '10px 12px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  lineHeight: 1.55,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />

              {/* Email */}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email (optional)"
                style={{
                  width: '100%',
                  marginTop: '8px',
                  fontSize: '13px',
                  color: 'var(--text-base)',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-soft)',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />

              {/* Honeypot — hidden from real users, bots will fill it */}
              <input
                type="text"
                value={hp}
                onChange={(e) => setHp(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0 }}
              />

              {error && (
                <div style={{ fontSize: '12px', color: '#e05', marginTop: '8px' }}>{error}</div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: '14px',
                  width: '100%',
                  padding: '10px',
                  background: 'var(--green)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  fontFamily: 'var(--font-cond)',
                  letterSpacing: '0.04em',
                }}
              >
                {loading ? 'Sending…' : 'Send Feedback'}
              </button>
            </form>
          </div>
      </div>, document.body)}
    </>
  )
}
