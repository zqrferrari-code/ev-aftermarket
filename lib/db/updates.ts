import { eq, and, desc } from 'drizzle-orm'
import { db } from './index'
import { softwareUpdates } from './schema'

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

export async function getUpdateByVersion(modelId: string, version: string) {
  const rows = await db
    .select()
    .from(softwareUpdates)
    .where(and(eq(softwareUpdates.model_id, modelId), eq(softwareUpdates.version, version)))
    .limit(1)
  return rows[0] ?? null
}
