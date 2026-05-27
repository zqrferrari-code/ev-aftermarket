import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getModelBySlug } from '@/lib/db/models'
import { getDTCsByModel } from '@/lib/db/dtcs'
import { SeverityBadge } from '@/components/SeverityBadge'
import type { Severity } from '@/lib/types'

export const revalidate = 3600

interface Props {
  params: Promise<{ market: string; model: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market, model } = await params
  const modelData = await getModelBySlug(model)
  if (!modelData) return {}

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://yourdomain.com'
  const dtcs = await getDTCsByModel(modelData.model_id)

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${modelData.model_name} Fault Codes`,
    itemListElement: dtcs.map((dtc, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `${dtc.dtc_code} — ${dtc.description_en}`,
      url: `${baseUrl}/${market}/dtc/${model}/${dtc.dtc_code?.toLowerCase()}`,
    })),
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: market.toUpperCase(),
        item: `${baseUrl}/${market}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: `${modelData.model_name} Fault Codes`,
        item: `${baseUrl}/${market}/dtc/${model}`,
      },
    ],
  }

  return {
    title: `${modelData.model_name} Fault Codes — Complete List (${market.toUpperCase()})`,
    description: `All known fault codes for the ${modelData.model_name} in ${market.toUpperCase()}: meanings, severity levels, and what to do when you see each warning light.`,
    other: {
      'script:ld+json:itemlist': JSON.stringify(itemListSchema),
      'script:ld+json:breadcrumb': JSON.stringify(breadcrumbSchema),
    },
  }
}

export default async function DtcModelPage({ params }: Props) {
  const { market, model } = await params
  const modelData = await getModelBySlug(model)
  if (!modelData) notFound()

  const dtcs = await getDTCsByModel(modelData.model_id)

  return (
    <article className="max-w-3xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        {modelData.model_name} Fault Codes ({market.toUpperCase()})
      </h1>
      <p className="text-gray-600 mb-8">
        {dtcs.length > 0
          ? `${dtcs.length} fault codes documented. Click any code for detailed information.`
          : 'Building fault code database. Check back soon.'}
      </p>

      {dtcs.length > 0 && (
        <div className="space-y-2">
          {dtcs.map((dtc) => (
            <a
              key={dtc.dtc_id}
              href={`/${market}/dtc/${model}/${dtc.dtc_code?.toLowerCase()}`}
              className="flex items-center gap-4 border rounded p-3 hover:bg-gray-50"
            >
              <code className="font-mono font-bold text-sm w-20">{dtc.dtc_code}</code>
              {dtc.severity && <SeverityBadge severity={dtc.severity as Severity} />}
              <span className="text-sm text-gray-700 flex-1">{dtc.description_en}</span>
              <span className="text-blue-600 text-sm">→</span>
            </a>
          ))}
        </div>
      )}
    </article>
  )
}
