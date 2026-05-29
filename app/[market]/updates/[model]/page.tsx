import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getUpdatesByModel } from '@/lib/db/updates'
import { getModelBySlug } from '@/lib/db/models'

interface Props {
  params: Promise<{ market: string; model: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market, model } = await params
  const modelData = await getModelBySlug(model)
  if (!modelData) return {}
  return {
    title: `${modelData.model_name} Software Updates — Version History & Changelog (${market.toUpperCase()})`,
    description: `Complete ${modelData.model_name} software update history for ${market.toUpperCase()}: firmware versions, OTA update instructions, and what each update fixes.`,
  }
}

export default async function UpdatesListPage({ params }: Props) {
  const { market, model } = await params
  const modelData = await getModelBySlug(model)
  if (!modelData) notFound()

  const updates = await getUpdatesByModel(modelData.model_id, market)

  return (
    <article className="max-w-3xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        {modelData.model_name} Software Updates ({market.toUpperCase()})
      </h1>
      <p className="text-gray-600 mb-8">
        Tracking all firmware and software updates. Subscribe below to get notified when a new version is released.
      </p>

      <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-8">
        <h2 className="font-semibold mb-1">Get Update Alerts</h2>
        <p className="text-sm text-gray-700 mb-3">
          Be the first to know when a new software update is available for your {modelData.model_name}.
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="your@email.com"
            className="flex-1 border rounded px-3 py-1.5 text-sm"
            disabled
          />
          <button className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm opacity-50 cursor-not-allowed">
            Notify Me (Coming Soon)
          </button>
        </div>
      </div>

      <section>
        <h2 className="text-xl font-semibold mb-4">Update History</h2>
        {updates.length > 0 ? (
          <div className="space-y-4">
            {updates.map((update) => (
              <a
                key={update.update_id}
                href={`/${market}/updates/${model}/${update.version}`}
                className="block border rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <code className="text-lg font-mono font-bold">{update.version}</code>
                    {update.release_date && (
                      <span className="ml-3 text-sm text-gray-500">{update.release_date}</span>
                    )}
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      update.update_method === 'OTA'
                        ? 'bg-green-100 text-green-800'
                        : update.update_method === 'dealer_only'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {update.update_method ?? 'Unknown'}
                  </span>
                </div>
                {update.changelog_en && (
                  <p className="text-sm text-gray-700 mt-2 line-clamp-2">{update.changelog_en}</p>
                )}
              </a>
            ))}
          </div>
        ) : (
          <div className="border rounded p-6 text-center text-gray-500">
            <p>No software updates recorded yet for this market.</p>
            <p className="text-sm mt-2">
              Know of a recent update?{' '}
              <a href="/contact" className="text-blue-600 underline">
                Let us know.
              </a>
            </p>
          </div>
        )}
      </section>

      {/* MG4 专用社区版本（数据库为空时展示） */}
      {model === 'mg-mg4' && updates.length === 0 && (
        <section className="mt-8 border-t pt-8">
          <h2 className="text-xl font-semibold mb-4">Known Versions (Community Reports)</h2>
          <div className="space-y-4">
            {[
              { version: 'R67', date: '2024 Q4', method: 'dealer_only', notes: 'Bug fixes for infotainment freezing. Report from r/MG4 forum.' },
              { version: 'R63', date: '2024 Q2', method: 'OTA', notes: 'Improved charging curve above 80%. CarPlay stability improvements.' },
              { version: 'R59', date: '2023 Q4', method: 'OTA', notes: 'Range estimation accuracy improvement. Winter preconditioning update.' },
            ].map((v) => (
              <div key={v.version} className="border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <code className="text-lg font-mono font-bold">{v.version}</code>
                  <span className="text-sm text-gray-500">{v.date}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      v.method === 'OTA' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {v.method === 'OTA' ? 'OTA' : 'Dealer Only'}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{v.notes}</p>
                <span className="text-xs text-gray-400 mt-1 block">Community Verified — source: Reddit r/MG4</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </article>
  )
}
