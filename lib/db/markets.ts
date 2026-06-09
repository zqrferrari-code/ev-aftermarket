import { eq } from 'drizzle-orm'
import { db } from './index'
import { markets } from './schema'

export async function getAllMarkets() {
  return db.select().from(markets).where(eq(markets.active, true))
}

export async function getMarket(marketCode: string) {
  const rows = await db
    .select()
    .from(markets)
    .where(eq(markets.market_code, marketCode))
    .limit(1)
  return rows[0] ?? null
}
