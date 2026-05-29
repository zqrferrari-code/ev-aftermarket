import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getUpdateByVersion } from '@/lib/db/updates'
import { getModelBySlug } from '@/lib/db/models'
import type { DataConfidence } from '@/lib/types'

interface Props {
  params: Promise<{ market: string; model: string; version: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market, model, version } = await params
  return {
    title: `${model.toUpperCase()} Software Update ${version} — What's New (${market.toUpperCase()})`,
    description: `Details on ${model} firmware version ${version}: what changed, how to install, and whether it's available via OTA or dealer only.`,
  }
}

export default async function UpdateVersionPage({ params }: Props) {
  const { market, model, version } = await params
  const modelData = await getModelBySlug(model)
  if (!modelData) notFound()

  const update = await getUpdateByVersion(modelData.model_id, version)
  if (!update) notFound()

  return (
    <article className="max-w-3xl">
      <nav className="text-sm text-gray-500 mb-6">
        <a href={`/${market}/updates/${model}`} className="hover:text-gray-700">
          ← Back to all updates
        </a>
      </nav>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        {modelData.model_name} Software Update — {version}
      </h1>
      <div className="flex items-center gap-3 text-sm text-gray-500 mb-8">
        {update.release_date && <span>Released: {update.release_date}</span>}
        {update.update_method && (
          <span
            className={`px-2 py-0.5 rounded text-xs ${
              update.update_method === 'OTA'
                ? 'bg-green-100 text-green-800'
                : update.update_method === 'dealer_only'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {update.update_method === 'OTA'
              ? 'OTA Available'
              : update.update_method === 'dealer_only'
              ? 'Dealer Only'
              : update.update_method}
          </span>
        )}
        <span className="bg-gray-100 rounded px-1 text-xs">{update.data_confidence}</span>
      </div>

      {update.changelog_en && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">What&apos;s Changed</h2>
          <div className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">{update.changelog_en}</div>
        </section>
      )}

      <div className="bg-gray-50 border rounded p-4 text-sm text-gray-600">
        <strong>Disclaimer:</strong> Software update information is sourced from community reports. Verify with your
        dealer before attempting any updates.
        {update.source_url && (
          <span>
            {' '}
            Source:{' '}
            <a href={update.source_url} className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">
              original report
            </a>
          </span>
        )}
      </div>
    </article>
  )
}
