'use server'

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const TO = 'zqrferrari@gmail.com'

export type FeedbackType = 'error' | 'case' | 'missing'

export interface FeedbackPayload {
  type: FeedbackType
  message: string
  email?: string
  context?: string // e.g. "DTC P0A0F — BYD Atto 3 — AU"
}

const LABELS: Record<FeedbackType, string> = {
  error: 'Error Report',
  case: 'Owner Case Submission',
  missing: 'Missing Content Request',
}

export async function submitFeedback(payload: FeedbackPayload): Promise<{ ok: boolean; error?: string }> {
  const { type, message, email, context } = payload

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
