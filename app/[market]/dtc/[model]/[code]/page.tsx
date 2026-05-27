import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getDTCByCode, getDTCModelNote, getCasesForDTC } from '@/lib/db/dtcs'
import { getModelBySlug } from '@/lib/db/models'
import { SeverityBadge } from '@/components/SeverityBadge'
import { DisclaimerBox } from '@/components/DisclaimerBox'
import { RealWorldCases } from '@/components/RealWorldCases'
import { JsonLd } from '@/components/JsonLd'
import type { Severity, DataConfidence, Case } from '@/lib/types'

export const revalidate = 86400

interface Props {
  params: Promise<{ market: string; model: string; code: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market, model, code } = await params
  const dtcCode = code.toUpperCase()
  const [modelData, dtc] = await Promise.all([getModelBySlug(model), getDTCByCode(dtcCode)])
  if (!modelData || !dtc) return {}

  return {
    title: `${modelData.model_name} ${dtcCode} Fault Code — Meaning, Causes & What To Do`,
    description: `${dtcCode} on ${modelData.model_name}: ${dtc.description_en}. See severity level, likely causes, and what steps to take next.`,
  }
}

export default async function DtcCodePage({ params }: Props) {
  const { market, model, code } = await params
  const dtcCode = code.toUpperCase()

  const [modelData, dtc] = await Promise.all([getModelBySlug(model), getDTCByCode(dtcCode)])
  if (!modelData || !dtc) notFound()

  const [note, casesRaw] = await Promise.all([
    getDTCModelNote(Number(dtc.dtc_id), modelData.model_id, market),
    getCasesForDTC(Number(dtc.dtc_id)),
  ])

  const parsedCauses: string[] = note?.likely_causes
    ? typeof note.likely_causes === 'string'
      ? JSON.parse(note.likely_causes)
      : (note.likely_causes as string[])
    : []

  const parsedActions: string[] = note?.suggested_actions
    ? typeof note.suggested_actions === 'string'
      ? JSON.parse(note.suggested_actions)
      : (note.suggested_actions as string[])
    : []

  const parsedSourceUrls: string[] = note?.source_urls
    ? typeof note.source_urls === 'string'
      ? JSON.parse(note.source_urls)
      : (note.source_urls as string[])
    : []

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://yourdomain.com'

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

  return (
    <article className="max-w-3xl">
      <JsonLd schema={faqSchema} />
      <JsonLd schema={breadcrumbSchema} />
      <nav className="text-sm text-gray-500 mb-6">
        <a href={`/${market}/dtc/${model}`} className="hover:text-gray-700">
          ← {modelData.model_name} fault codes
        </a>
      </nav>

      {dtc.severity === 'CRITICAL' && dtc.safety_warning && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded p-4 mb-6">
          <p className="font-semibold text-red-800">⚠ Safety Warning</p>
          <p className="text-red-700 mt-1">{dtc.safety_warning}</p>
        </div>
      )}

      <div className="flex items-center gap-3 mb-2">
        <code className="text-4xl font-mono font-bold text-gray-900">{dtcCode}</code>
        {dtc.severity && <SeverityBadge severity={dtc.severity as Severity} />}
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-2">
        {modelData.model_name} {dtcCode}: {dtc.description_en}
      </h1>

      {dtc.related_system && (
        <p className="text-sm text-gray-500 mb-8">System: {dtc.related_system}</p>
      )}

      {dtc.severity === 'WARNING' && (
        <section className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-8">
          <h2 className="font-semibold text-yellow-900 mb-1">Can I still drive?</h2>
          <p className="text-yellow-800 text-sm">
            In most cases, yes — but schedule a service appointment soon. Monitor the warning closely.
            If additional symptoms appear (loss of power, unusual noises), pull over safely and contact your dealer.
          </p>
        </section>
      )}

      {note && (
        <>
          {parsedCauses.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">Likely Causes ({modelData.model_name})</h2>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                {parsedCauses.map((cause, i) => (
                  <li key={i} className="text-sm">{cause}</li>
                ))}
              </ul>
            </section>
          )}

          {parsedActions.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">What To Do</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                {parsedActions.map((action, i) => (
                  <li key={i} className="text-sm">{action}</li>
                ))}
              </ol>
            </section>
          )}

          {note.climate_notes && (
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">Climate & Environment Notes</h2>
              <div className="bg-orange-50 border border-orange-200 rounded p-4 text-sm text-gray-700">
                {note.climate_notes}
              </div>
            </section>
          )}
        </>
      )}

      <RealWorldCases cases={casesRaw as unknown as Case[]} />

      <DisclaimerBox
        confidence={(note?.data_confidence ?? 'community') as DataConfidence}
        sourceUrls={parsedSourceUrls}
      />
    </article>
  )
}
