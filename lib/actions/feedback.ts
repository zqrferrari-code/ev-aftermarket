'use server'

import { Resend } from 'resend'
import { headers } from 'next/headers'

const resend = new Resend(process.env.RESEND_API_KEY)
const TO = 'zqrferrari@gmail.com'

// In-memory rate limit: ip -> timestamps
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT = 5      // max submissions
const RATE_WINDOW = 60 * 60 * 1000  // per hour

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const timestamps = (rateLimitMap.get(ip) ?? []).filter(t => now - t < RATE_WINDOW)
  if (timestamps.length >= RATE_LIMIT) return true
  rateLimitMap.set(ip, [...timestamps, now])
  return false
}

export type FeedbackType = 'error' | 'case' | 'missing'

export interface FeedbackPayload {
  type: FeedbackType
  message: string
  email?: string
  context?: string
  _hp?: string  // honeypot field — must be empty
}

const LABELS: Record<FeedbackType, string> = {
  error: 'Error Report',
  case: 'Owner Case Submission',
  missing: 'Missing Content Request',
}

export async function submitFeedback(payload: FeedbackPayload): Promise<{ ok: boolean; error?: string }> {
  const { type, message, email, context, _hp } = payload

  // Honeypot check — bots fill this, humans don't
  if (_hp && _hp.trim().length > 0) {
    return { ok: true }  // silently succeed to not tip off bots
  }

  // Rate limit by IP
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(ip)) {
    return { ok: false, error: 'Too many submissions. Please try again later.' }
  }

  if (!message || message.trim().length < 5) {
    return { ok: false, error: 'Message too short.' }
  }

  const subject = `[EVAftermarket] ${LABELS[type]}${context ? ` — ${context}` : ''}`

  const body = [
    `Type: ${LABELS[type]}`,
    context ? `Page: ${context}` : null,
    email ? `From: ${email}` : 'From: Anonymous',
    '',
    message.trim(),
  ]
    .filter((l) => l !== null)
    .join('\n')

  try {
    await resend.emails.send({
      from: 'EVAftermarket <onboarding@resend.dev>',
      to: TO,
      subject,
      text: body,
    })
    return { ok: true }
  } catch (err) {
    console.error('Feedback send failed:', err)
    return { ok: false, error: 'Failed to send. Please try again.' }
  }
}
