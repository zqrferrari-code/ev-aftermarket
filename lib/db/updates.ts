import { eq, and, desc, isNotNull } from 'drizzle-orm'
import { db } from './index'
import { softwareUpdates, models } from './schema'

export async function getUpdatesForModel(modelId: string, marketCode?: string) {
  if (marketCode) {
    return db
      .select()
      .from(softwareUpdates)
      .where(
        and(
          eq(softwareUpdates.model_id, modelId),
          eq(softwareUpdates.market_code, marketCode)
        )
      )
      .orderBy(desc(softwareUpdates.release_date))
  }
  return db
    .select()
    .from(softwareUpdates)
    .where(eq(softwareUpdates.model_id, modelId))
    .orderBy(desc(softwareUpdates.release_date))
}

export async function getLatestUpdate(modelId: string, marketCode?: string) {
  const rows = await getUpdatesForModel(modelId, marketCode)
  return rows[0] ?? null
}

// 计划二别名
export const getUpdatesByModel = getUpdatesForModel

export async function getAllUpdateModelVersionPairs(): Promise<{ model_id: string; model_slug: string; version: string; market_code: string | null }[]> {
  const rows = await db
    .select({
      model_id: softwareUpdates.model_id,
      model_slug: models.slug,
      version: softwareUpdates.version,
      market_code: softwareUpdates.market_code,
    })
    .from(softwareUpdates)
    .innerJoin(models, eq(softwareUpdates.model_id, models.model_id))
    .where(isNotNull(softwareUpdates.model_id))
  return rows as { model_id: string; model_slug: string; version: string; market_code: string | null }[]
}

export async function getUpdateByVersion(modelId: string, version: string) {
  const rows = await db
    .select()
    .from(softwareUpdates)
    .where(and(eq(softwareUpdates.model_id, modelId), eq(softwareUpdates.version, version)))
    .limit(1)
  return rows[0] ?? null
}
