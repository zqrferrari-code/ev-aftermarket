import 'dotenv/config'
import { db } from '../lib/db/index'
import { softwareUpdates, models } from '../lib/db/schema'
import { eq, and } from 'drizzle-orm'

async function main() {
  // Look up the model_id for byd-atto-3
  const rows = await db
    .select({ model_id: models.model_id })
    .from(models)
    .where(eq(models.slug, 'byd-atto-3'))
    .limit(1)

  const modelRow = rows[0]
  if (!modelRow) {
    console.error('Model byd-atto-3 not found in DB. Run seed.ts first.')
    process.exit(1)
  }

  const model_id = modelRow.model_id
  const market_code = 'au'

  // Check if already seeded
  const existing = await db
    .select({ update_id: softwareUpdates.update_id })
    .from(softwareUpdates)
    .where(and(eq(softwareUpdates.model_id, model_id), eq(softwareUpdates.market_code, market_code)))
    .limit(1)

  if (existing.length > 0) {
    console.log('Updates already seeded for byd-atto-3. Skipping.')
    process.exit(0)
  }

  await db.insert(softwareUpdates).values([
    {
      model_id,
      market_code,
      version: '3.0.1.156',
      release_date: '2024-11',
      update_method: 'OTA',
      changelog_en:
        'Fixes CarPlay disconnection under cellular load. Improves AC charging curve in hot climates. TPMS sensitivity adjustment.',
      source_url: null,
      data_confidence: 'community',
    },
    {
      model_id,
      market_code,
      version: '3.0.1.140',
      release_date: '2024-07',
      update_method: 'OTA',
      changelog_en:
        'Battery management recalibration. Improved range estimation accuracy at low SoC. Regenerative braking torque smoothing.',
      source_url: null,
      data_confidence: 'community',
    },
    {
      model_id,
      market_code,
      version: '3.0.0.128',
      release_date: '2024-01',
      update_method: 'dealer_only',
      changelog_en:
        'ADAS calibration update. Steering torque feedback correction. Applied during scheduled servicing at BYD dealers.',
      source_url: null,
      data_confidence: 'community',
    },
    {
      model_id,
      market_code,
      version: '2.0.0.104',
      release_date: '2023-05',
      update_method: 'OTA',
      changelog_en:
        'Initial production firmware for AU-spec Atto 3. Base for all subsequent OTA updates.',
      source_url: null,
      data_confidence: 'community',
    },
  ])

  console.log('✓ Seeded 4 software updates for byd-atto-3 (AU)')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
