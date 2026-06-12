import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getDTCByCode, getDTCModelNote, getCasesForDTC, getCasesCountForDTC, getRelatedDTCs } from '@/lib/db/dtcs'
import { getModelBySlug } from '@/lib/db/models'
import { SeverityBadge } from '@/components/SeverityBadge'
import { DisclaimerBox } from '@/components/DisclaimerBox'
import { RealWorldCases } from '@/components/RealWorldCases'
import { JsonLd } from '@/components/JsonLd'
import type { Severity, DataConfidence, Case, ActionStep } from '@/lib/types'
import { BASE_URL } from '@/lib/config'
import { getActiveMarketCodes, getAllDtcModelCodePairs } from '@/lib/db/static-params'
import { FeedbackButton } from '@/components/FeedbackButton'



export async function generateStaticParams() {
  if (process.env.NODE_ENV === 'development') return []
  const [markets, pairs] = await Promise.all([getActiveMarketCodes(), getAllDtcModelCodePairs()])
  return markets.flatMap((market) =>
    pairs.map((p) => ({
      market,
      model: p.slug,
      code: p.code.toLowerCase(),
    }))
  )
}

interface Props {
  params: Promise<{ market: string; model: string; code: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market, model, code } = await params
  const dtcCode = code.toUpperCase()
  const [modelData, dtc] = await Promise.all([getModelBySlug(model), getDTCByCode(dtcCode)])
  if (!modelData || !dtc) return {}

  const [note, casesCount] = await Promise.all([
    getDTCModelNote(Number(dtc.dtc_id), modelData.model_id, market),
    getCasesCountForDTC(Number(dtc.dtc_id)),
  ])

  const parsedCauses: string[] = note?.likely_causes
    ? typeof note.likely_causes === 'string'
      ? JSON.parse(note.likely_causes)
      : (note.likely_causes as string[])
    : []

  const parsedActions = note?.suggested_actions
    ? typeof note.suggested_actions === 'string'
      ? JSON.parse(note.suggested_actions)
      : note.suggested_actions
    : []

  const hasContent =
    parsedCauses.length > 0 ||
    (Array.isArray(parsedActions) && parsedActions.length > 0)

  const title = `${dtcCode} ${modelData.model_name} — Cause, Fix & Cost | EVAftermarket`
  const description = `${dtcCode} on ${modelData.model_name}: ${dtc.description_en?.slice(0, 100) ?? 'fault code details'}. Severity: ${dtc.severity}. See real owner repair cases and estimated costs.`
  const url = `${BASE_URL}/${market}/dtc/${model}/${code.toLowerCase()}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'EVAftermarket',
      locale: 'en_AU',
      type: 'article',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    ...(!hasContent && casesCount === 0
      ? { robots: { index: false, follow: true } }
      : {}),
  }
}

export default async function DtcCodePage({ params }: Props) {
  const { market, model, code } = await params
  const dtcCode = code.toUpperCase()

  const [modelData, dtc] = await Promise.all([getModelBySlug(model), getDTCByCode(dtcCode)])
  if (!modelData || !dtc) notFound()

  const [note, casesRaw, relatedDtcs] = await Promise.all([
    getDTCModelNote(Number(dtc.dtc_id), modelData.model_id, market),
    getCasesForDTC(Number(dtc.dtc_id)),
    getRelatedDTCs(modelData.model_id, Number(dtc.dtc_id)),
  ])

  const parsedCauses: string[] = note?.likely_causes
    ? typeof note.likely_causes === 'string'
      ? JSON.parse(note.likely_causes)
      : (note.likely_causes as string[])
    : []

  const parsedActions: ActionStep[] = (() => {
    if (!note?.suggested_actions) return []
    const raw: unknown = typeof note.suggested_actions === 'string'
      ? JSON.parse(note.suggested_actions)
      : note.suggested_actions
    if (!Array.isArray(raw) || raw.length === 0) return []
    // Backwards-compat: old format was string[], new format is {title, body}[]
    if (typeof raw[0] === 'string') {
      return (raw as string[]).map((s) => ({ title: s, body: '' }))
    }
    return raw as ActionStep[]
  })()

  const parsedSourceUrls: string[] = note?.source_urls
    ? typeof note.source_urls === 'string'
      ? JSON.parse(note.source_urls)
      : (note.source_urls as string[])
    : []

  const baseUrl = BASE_URL

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `What does ${dtcCode} mean on a ${modelData.model_name}?`,
        acceptedAnswer: { '@type': 'Answer', text: dtc.description_en },
      },
      {
        '@type': 'Question',
        name: `Is ${dtcCode} serious on a ${modelData.model_name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            dtc.severity === 'CRITICAL'
              ? `Yes — ${dtcCode} is a critical fault. Stop driving and contact a dealer immediately.`
              : dtc.severity === 'WARNING'
              ? `${dtcCode} is a moderate severity fault. Schedule a service appointment soon.`
              : `${dtcCode} is a low severity fault. Monitor and schedule service at your next opportunity.`,
        },
      },
      {
        '@type': 'Question',
        name: `Can I drive with ${dtcCode} on my ${modelData.model_name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            dtc.severity === 'CRITICAL'
              ? 'No. Pull over safely and do not drive until inspected by a qualified technician.'
              : 'In most cases yes, but monitor closely. If you notice loss of power or unusual noises, stop and contact your dealer.',
        },
      },
    ],
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: market.toUpperCase(), item: `${baseUrl}/${market}` },
      { '@type': 'ListItem', position: 2, name: `${modelData.model_name} Fault Codes`, item: `${baseUrl}/${market}/dtc/${model}` },
      { '@type': 'ListItem', position: 3, name: dtcCode, item: `${baseUrl}/${market}/dtc/${model}/${code.toLowerCase()}` },
    ],
  }

  const isCritical = dtc.severity === 'CRITICAL'
  const isWarning = dtc.severity === 'WARNING'

  return (
    <>
      <JsonLd schema={faqSchema} />
      <JsonLd schema={breadcrumbSchema} />
      <div className="page-wrapper">
        <article className="dtc-card">

          {/* Breadcrumb */}
          <nav className="breadcrumb">
            <a href={`/${market}`}>{market.toUpperCase()}</a>
            <span className="sep">›</span>
            <a href={`/${market}/dtc/${model}`}>{modelData.model_name} Fault Codes</a>
            <span className="sep">›</span>
            <span style={{ fontWeight: 600, color: 'var(--text-base)' }}>{dtcCode}</span>
          </nav>

          {/* Safety banner (Critical only) */}
          {isCritical && dtc.safety_warning && (
            <div className="safety-banner">
              <div className="safety-icon">!</div>
              <div className="safety-text">
                <strong>Safety Warning</strong>
                <p>{dtc.safety_warning}</p>
              </div>
            </div>
          )}

          {/* Hero */}
          <div className="detail-hero">
            <div className="code-row">
              <span className="big-code">{dtcCode}</span>
              {dtc.severity && <SeverityBadge severity={dtc.severity as Severity} />}
            </div>
            <h1 className="detail-h1">
              {dtc.description_en
                ? `${dtc.description_en.split(/[.。]/)[0]} — ${modelData.model_name}`
                : `${modelData.model_name} ${dtcCode}`}
            </h1>
            {dtc.related_system && (
              <div className="detail-system">{dtc.related_system}</div>
            )}
            {dtc.description_en && (
              <div className="detail-description">
                {dtc.description_en.split(/(?<=\.)\s+(?=[A-Z])/).map((para: string, i: number) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            )}

            {/* Meta stats */}
            {(casesRaw.length > 0 || parsedCauses.length > 0) && (
              <div className="detail-meta-row">
                {casesRaw.length > 0 && (
                  <>
                    <div className="detail-meta-item">
                      <div className="detail-meta-n">{casesRaw.length}</div>
                      <div className="detail-meta-l">Cases Logged</div>
                    </div>
                    <div className="detail-meta-div" />
                  </>
                )}
                {parsedCauses.length > 0 && (
                  <div className="detail-meta-item">
                    <div className="detail-meta-n">{parsedCauses.length}</div>
                    <div className="detail-meta-l">Causes</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Drive advisory (Warning or Critical) */}
          {(isCritical || isWarning) && (
            <div className={`drive-box${isCritical ? ' critical' : ''}`} style={{ margin: '28px 28px 0' }}>
              <div className="drive-box-accent" />
              <div className="drive-box-inner">
                <h2>Can I still drive?</h2>
                {isCritical ? (
                  <p>
                    The vehicle has a critical fault that may affect safety. Avoid driving until this is
                    repaired. Book a dealer appointment today.
                  </p>
                ) : (
                  <p>
                    In most cases, yes — but schedule a service appointment soon. Monitor the warning
                    closely. If additional symptoms appear (loss of power, unusual noises), pull over safely
                    and contact your dealer.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Body sections */}
          <div className="detail-body" style={{ paddingTop: '4px' }}>

            {/* Likely Causes */}
            {parsedCauses.length > 0 && (
              <div className="section">
                <span className="section-label">Likely Causes — {modelData.model_name}</span>
                <ul className="causes">
                  {parsedCauses.map((cause, i) => (
                    <li key={i} className="cause-item">
                      <span className="cause-n">{i + 1}</span>
                      <span className="cause-text">{cause}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* What To Do */}
            {parsedActions.length > 0 && (
              <div className="section">
                <span className="section-label">What To Do</span>
                <ul className="actions">
                  {parsedActions.map((action, i) => (
                    <li key={i} className="action-item">
                      <div className="action-n">{i + 1}</div>
                      <div className="action-content">
                        <span className="action-title">{action.title}</span>
                        {action.body && (
                          <span className="action-body">{action.body}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Climate notes */}
            {note?.climate_notes && (
              <div className="section">
                <span className="section-label">Climate &amp; Environment Notes</span>
                <p className="climate-note">{note.climate_notes}</p>
              </div>
            )}

            {/* Real-world cases */}
            {casesRaw.length > 0 && (
              <RealWorldCases cases={casesRaw as unknown as Case[]} />
            )}

          </div>

          {/* Related codes */}
          {relatedDtcs.length > 0 && (
            <div className="related-section">
              <span className="section-label" style={{ fontSize: '13px', fontFamily: 'var(--font-cond)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
                Other {modelData.model_name} Fault Codes
              </span>
              <div className="related-grid">
                {relatedDtcs.map((related) => (
                  <a
                    key={related.dtc_id}
                    href={`/${market}/dtc/${model}/${related.dtc_code?.toLowerCase()}`}
                    className="related-chip"
                  >
                    <code>{related.dtc_code}</code>
                    <span>{related.description_en}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <DisclaimerBox
            confidence={(note?.data_confidence ?? 'community') as DataConfidence}
            sourceUrls={parsedSourceUrls}
          />

          <div style={{ padding: '16px 28px 24px', display: 'flex', justifyContent: 'flex-end' }}>
            <FeedbackButton context={`${dtcCode} — ${modelData.model_name} — ${market.toUpperCase()}`} />
          </div>
        </article>
      </div>
    </>
  )
}
