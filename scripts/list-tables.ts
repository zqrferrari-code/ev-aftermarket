import { db } from '@/lib/db/index'
import { sql } from 'drizzle-orm'

async function main() {
  const rows = await (db as any).execute(sql`SHOW TABLES LIKE 'mf_nv_%'`)
  for (const row of rows[0] as any[]) {
    const tableName = Object.values(row)[0] as string
    const countResult = await (db as any).execute(sql.raw(`SELECT COUNT(*) as cnt FROM \`${tableName}\``))
    console.log(`${tableName}: ${(countResult[0] as any[])[0].cnt}`)
  }
  process.exit(0)
}
main()
