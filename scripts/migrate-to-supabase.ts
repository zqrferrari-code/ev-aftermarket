/**
 * 从 MySQL (Aliyun RDS) 迁移数据到 Supabase (PostgreSQL)
 * 运行：DATABASE_URL=mysql://... SUPABASE_URL=postgresql://... pnpm tsx scripts/migrate-to-supabase.ts
 */

import { drizzle as drizzleMysql } from 'drizzle-orm/mysql2'
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js'
import mysql from 'mysql2/promise'
import postgres from 'postgres'
import { sql } from 'drizzle-orm'
import * as pgSchema from '../lib/db/schema.pg'

const MYSQL_URL = process.env.DATABASE_URL!
const PG_URL = process.env.SUPABASE_URL!

if (!MYSQL_URL || !PG_URL) {
  console.error('需要设置 DATABASE_URL 和 SUPABASE_URL 环境变量')
  process.exit(1)
}

const mysqlPool = mysql.createPool({ uri: MYSQL_URL, waitForConnections: true, connectionLimit: 5 })
const mysqlDb = drizzleMysql(mysqlPool, { mode: 'default' })

const pgClient = postgres(PG_URL, { ssl: 'require', max: 5 })
const pgDb = drizzlePg(pgClient, { schema: pgSchema })

async function readMysql(table: string) {
  const [rows] = await mysqlPool.execute(`SELECT * FROM \`${table}\``)
  return rows as any[]
}

async function createTables() {
  console.log('建表...')
  await pgDb.execute(sql`
    CREATE TABLE IF NOT EXISTS mf_nv_markets (
      market_code VARCHAR(10) PRIMARY KEY,
      country_name VARCHAR(100) NOT NULL,
      currency VARCHAR(10) NOT NULL,
      drive_side VARCHAR(5),
      climate_zone VARCHAR(20),
      active BOOLEAN DEFAULT FALSE
    )
  `)
  await pgDb.execute(sql`
    CREATE TABLE IF NOT EXISTS mf_nv_brands (
      brand_id VARCHAR(50) PRIMARY KEY,
      brand_name_en VARCHAR(100) NOT NULL,
      brand_name_cn VARCHAR(100),
      logo_url TEXT
    )
  `)
  await pgDb.execute(sql`
    CREATE TABLE IF NOT EXISTS mf_nv_models (
      model_id VARCHAR(100) PRIMARY KEY,
      brand_id VARCHAR(50) REFERENCES mf_nv_brands(brand_id),
      model_name VARCHAR(100) NOT NULL,
      vehicle_type VARCHAR(10),
      years VARCHAR(20),
      steering VARCHAR(5),
      slug VARCHAR(100) UNIQUE NOT NULL,
      range_km INTEGER,
      battery_kwh DECIMAL(5,1),
      acceleration_0_100 DECIMAL(4,1),
      charge_ac_kw DECIMAL(4,1),
      charge_dc_kw DECIMAL(4,1),
      cargo_l INTEGER
    )
  `)
  await pgDb.execute(sql`
    CREATE TABLE IF NOT EXISTS mf_nv_dtcs (
      dtc_id SERIAL PRIMARY KEY,
      dtc_code VARCHAR(20) NOT NULL,
      dtc_type VARCHAR(20) DEFAULT 'STANDARD',
      description_en TEXT NOT NULL,
      severity VARCHAR(10),
      related_system VARCHAR(100),
      safety_warning TEXT
    )
  `)
  await pgDb.execute(sql`CREATE INDEX IF NOT EXISTS idx_mf_nv_dtcs_code ON mf_nv_dtcs(dtc_code)`)
  await pgDb.execute(sql`
    CREATE TABLE IF NOT EXISTS mf_nv_dtc_model_notes (
      id SERIAL PRIMARY KEY,
      dtc_id INTEGER REFERENCES mf_nv_dtcs(dtc_id),
      model_id VARCHAR(100) REFERENCES mf_nv_models(model_id),
      market_code VARCHAR(10) REFERENCES mf_nv_markets(market_code),
      likely_causes JSONB,
      suggested_actions JSONB,
      climate_notes TEXT,
      data_confidence VARCHAR(20) DEFAULT 'community',
      source_urls JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `)
  await pgDb.execute(sql`CREATE INDEX IF NOT EXISTS idx_mf_nv_dmn_dtc_id ON mf_nv_dtc_model_notes(dtc_id)`)
  await pgDb.execute(sql`CREATE INDEX IF NOT EXISTS idx_mf_nv_dmn_model_id ON mf_nv_dtc_model_notes(model_id)`)
  await pgDb.execute(sql`
    CREATE TABLE IF NOT EXISTS mf_nv_software_updates (
      update_id SERIAL PRIMARY KEY,
      model_id VARCHAR(100) REFERENCES mf_nv_models(model_id),
      market_code VARCHAR(10) REFERENCES mf_nv_markets(market_code),
      version VARCHAR(50) NOT NULL,
      release_date VARCHAR(30),
      update_method VARCHAR(20),
      changelog_en TEXT,
      source_url TEXT,
      data_confidence VARCHAR(20) DEFAULT 'community',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)
  await pgDb.execute(sql`CREATE INDEX IF NOT EXISTS idx_mf_nv_su_model_id ON mf_nv_software_updates(model_id)`)
  await pgDb.execute(sql`
    CREATE TABLE IF NOT EXISTS mf_nv_service_costs (
      cost_id SERIAL PRIMARY KEY,
      model_id VARCHAR(100) REFERENCES mf_nv_models(model_id),
      market_code VARCHAR(10) REFERENCES mf_nv_markets(market_code),
      service_type VARCHAR(100) NOT NULL,
      cost_min INTEGER,
      cost_max INTEGER,
      currency VARCHAR(10),
      is_dealer_only BOOLEAN DEFAULT FALSE,
      notes TEXT,
      source_url TEXT,
      data_confidence VARCHAR(20) DEFAULT 'community',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)
  await pgDb.execute(sql`
    CREATE TABLE IF NOT EXISTS mf_nv_dealers (
      dealer_id SERIAL PRIMARY KEY,
      brand_id VARCHAR(50) REFERENCES mf_nv_brands(brand_id),
      market_code VARCHAR(10) REFERENCES mf_nv_markets(market_code),
      city VARCHAR(100),
      state_province VARCHAR(100),
      name VARCHAR(200) NOT NULL,
      address TEXT,
      phone VARCHAR(50),
      hours VARCHAR(200),
      is_authorised BOOLEAN DEFAULT TRUE,
      last_verified VARCHAR(20),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)
  await pgDb.execute(sql`CREATE INDEX IF NOT EXISTS idx_mf_nv_dealers_brand_market ON mf_nv_dealers(brand_id, market_code)`)
  await pgDb.execute(sql`
    CREATE TABLE IF NOT EXISTS mf_nv_cases (
      case_id SERIAL PRIMARY KEY,
      model_id VARCHAR(100) REFERENCES mf_nv_models(model_id),
      market_code VARCHAR(10) REFERENCES mf_nv_markets(market_code),
      content_type VARCHAR(30) DEFAULT 'dtc',
      source_type VARCHAR(50) NOT NULL,
      source_name VARCHAR(100) NOT NULL,
      source_url TEXT,
      source_language VARCHAR(10) DEFAULT 'en',
      location VARCHAR(100),
      report_date VARCHAR(20),
      vehicle_desc TEXT,
      symptom_summary TEXT NOT NULL,
      resolution TEXT,
      cost_info TEXT,
      confidence VARCHAR(20) DEFAULT 'community',
      translated_by VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)
  await pgDb.execute(sql`CREATE INDEX IF NOT EXISTS idx_mf_nv_cases_model_id ON mf_nv_cases(model_id)`)
  await pgDb.execute(sql`CREATE INDEX IF NOT EXISTS idx_mf_nv_cases_content_type ON mf_nv_cases(content_type)`)
  await pgDb.execute(sql`
    CREATE TABLE IF NOT EXISTS mf_nv_case_dtc_links (
      case_id INTEGER REFERENCES mf_nv_cases(case_id) NOT NULL,
      dtc_id INTEGER REFERENCES mf_nv_dtcs(dtc_id) NOT NULL,
      PRIMARY KEY (case_id, dtc_id)
    )
  `)
  await pgDb.execute(sql`
    CREATE TABLE IF NOT EXISTS mf_nv_case_media (
      media_id SERIAL PRIMARY KEY,
      case_id INTEGER REFERENCES mf_nv_cases(case_id),
      media_type VARCHAR(20) NOT NULL,
      media_url TEXT NOT NULL,
      caption TEXT,
      source_attribution TEXT,
      display_order INTEGER DEFAULT 0
    )
  `)
  await pgDb.execute(sql`
    CREATE TABLE IF NOT EXISTS mf_nv_pending_cases (
      id SERIAL PRIMARY KEY,
      raw_content TEXT NOT NULL,
      source_platform VARCHAR(100) NOT NULL,
      source_url TEXT,
      ai_extracted JSONB,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)
  await pgDb.execute(sql`
    CREATE TABLE IF NOT EXISTS mf_nv_pending_software_updates (
      id SERIAL PRIMARY KEY,
      raw_content TEXT NOT NULL,
      source_platform VARCHAR(100) NOT NULL,
      source_url TEXT,
      ai_extracted JSONB,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)
  await pgDb.execute(sql`
    CREATE TABLE IF NOT EXISTS mf_nv_pending_service_costs (
      id SERIAL PRIMARY KEY,
      model_slug VARCHAR(100),
      market_code VARCHAR(10),
      service_type VARCHAR(100),
      cost_min INTEGER,
      cost_max INTEGER,
      currency VARCHAR(10),
      city VARCHAR(100),
      is_dealer_only BOOLEAN,
      submitter_email VARCHAR(200),
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)
  await pgDb.execute(sql`
    CREATE TABLE IF NOT EXISTS mf_nv_warning_lights (
      id SERIAL PRIMARY KEY,
      brand_id VARCHAR(50) REFERENCES mf_nv_brands(brand_id) NOT NULL,
      model_id VARCHAR(100) REFERENCES mf_nv_models(model_id),
      slug VARCHAR(100) UNIQUE,
      code VARCHAR(30),
      category VARCHAR(50) NOT NULL,
      name_en VARCHAR(200) NOT NULL,
      name_cn VARCHAR(200),
      severity VARCHAR(10),
      description_en TEXT,
      causes JSONB,
      can_drive VARCHAR(20),
      action_en TEXT
    )
  `)
  await pgDb.execute(sql`CREATE INDEX IF NOT EXISTS idx_mf_nv_wl_brand_id ON mf_nv_warning_lights(brand_id)`)
  await pgDb.execute(sql`CREATE INDEX IF NOT EXISTS idx_mf_nv_wl_model_id ON mf_nv_warning_lights(model_id)`)
  await pgDb.execute(sql`
    CREATE TABLE IF NOT EXISTS mf_nv_warning_light_dtc_links (
      warning_light_id INTEGER REFERENCES mf_nv_warning_lights(id) NOT NULL,
      dtc_id INTEGER REFERENCES mf_nv_dtcs(dtc_id) NOT NULL,
      PRIMARY KEY (warning_light_id, dtc_id)
    )
  `)
  console.log('建表完成')
}

async function insertBatch(pgTable: string, rows: any[], transform?: (r: any) => any) {
  if (rows.length === 0) return
  const BATCH = 500
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH).map(transform ?? ((r) => r))
    const cols = Object.keys(batch[0])
    const placeholders = batch.map(
      (_, ri) => `(${cols.map((_, ci) => `$${ri * cols.length + ci + 1}`).join(', ')})`
    ).join(', ')
    const values = batch.flatMap((r) => cols.map((c) => r[c]))
    const colList = cols.map((c) => `"${c}"`).join(', ')
    await pgClient.unsafe(
      `INSERT INTO ${pgTable} (${colList}) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
      values
    )
  }
}

function fixJson(val: any) {
  if (val === null || val === undefined) return null
  if (typeof val === 'string') {
    try { return JSON.parse(val) } catch { return null }
  }
  return val
}

async function migrateData() {
  console.log('\n迁移数据...')

  const markets = await readMysql('mf_nv_markets')
  await insertBatch('mf_nv_markets', markets)
  console.log(`  markets: ${markets.length} 行`)

  const brands = await readMysql('mf_nv_brands')
  await insertBatch('mf_nv_brands', brands)
  console.log(`  brands: ${brands.length} 行`)

  const models = await readMysql('mf_nv_models')
  await insertBatch('mf_nv_models', models, (r) => ({
    ...r,
    battery_kwh: r.battery_kwh?.toString() ?? null,
    acceleration_0_100: r.acceleration_0_100?.toString() ?? null,
    charge_ac_kw: r.charge_ac_kw?.toString() ?? null,
    charge_dc_kw: r.charge_dc_kw?.toString() ?? null,
  }))
  console.log(`  models: ${models.length} 行`)

  const dtcs = await readMysql('mf_nv_dtcs')
  await insertBatch('mf_nv_dtcs', dtcs)
  // 重置 serial sequence
  await pgDb.execute(sql`SELECT setval('mf_nv_dtcs_dtc_id_seq', (SELECT MAX(dtc_id) FROM mf_nv_dtcs))`)
  console.log(`  dtcs: ${dtcs.length} 行`)

  const dtcModelNotes = await readMysql('mf_nv_dtc_model_notes')
  await insertBatch('mf_nv_dtc_model_notes', dtcModelNotes, (r) => ({
    ...r,
    likely_causes: fixJson(r.likely_causes),
    suggested_actions: fixJson(r.suggested_actions),
    source_urls: fixJson(r.source_urls),
    created_at: r.created_at ?? new Date(),
    updated_at: r.updated_at ?? new Date(),
  }))
  await pgDb.execute(sql`SELECT setval('mf_nv_dtc_model_notes_id_seq', (SELECT MAX(id) FROM mf_nv_dtc_model_notes))`)
  console.log(`  dtc_model_notes: ${dtcModelNotes.length} 行`)

  const updates = await readMysql('mf_nv_software_updates')
  await insertBatch('mf_nv_software_updates', updates)
  await pgDb.execute(sql`SELECT setval('mf_nv_software_updates_update_id_seq', GREATEST(1, (SELECT MAX(update_id) FROM mf_nv_software_updates)))`)
  console.log(`  software_updates: ${updates.length} 行`)

  const serviceCosts = await readMysql('mf_nv_service_costs')
  await insertBatch('mf_nv_service_costs', serviceCosts)
  console.log(`  service_costs: ${serviceCosts.length} 行`)

  const dealers = await readMysql('mf_nv_dealers')
  await insertBatch('mf_nv_dealers', dealers)
  console.log(`  dealers: ${dealers.length} 行`)

  const cases = await readMysql('mf_nv_cases')
  await insertBatch('mf_nv_cases', cases)
  await pgDb.execute(sql`SELECT setval('mf_nv_cases_case_id_seq', (SELECT MAX(case_id) FROM mf_nv_cases))`)
  console.log(`  cases: ${cases.length} 行`)

  const caseDtcLinks = await readMysql('mf_nv_case_dtc_links')
  await insertBatch('mf_nv_case_dtc_links', caseDtcLinks)
  console.log(`  case_dtc_links: ${caseDtcLinks.length} 行`)

  const caseMedia = await readMysql('mf_nv_case_media')
  await insertBatch('mf_nv_case_media', caseMedia)
  console.log(`  case_media: ${caseMedia.length} 行`)

  const pendingCases = await readMysql('mf_nv_pending_cases')
  await insertBatch('mf_nv_pending_cases', pendingCases, (r) => ({
    ...r,
    ai_extracted: fixJson(r.ai_extracted),
  }))
  await pgDb.execute(sql`SELECT setval('mf_nv_pending_cases_id_seq', GREATEST(1, (SELECT MAX(id) FROM mf_nv_pending_cases)))`)
  console.log(`  pending_cases: ${pendingCases.length} 行`)

  const pendingUpdates = await readMysql('mf_nv_pending_software_updates')
  await insertBatch('mf_nv_pending_software_updates', pendingUpdates, (r) => ({
    ...r,
    ai_extracted: fixJson(r.ai_extracted),
  }))
  console.log(`  pending_software_updates: ${pendingUpdates.length} 行`)

  const pendingService = await readMysql('mf_nv_pending_service_costs')
  await insertBatch('mf_nv_pending_service_costs', pendingService)
  console.log(`  pending_service_costs: ${pendingService.length} 行`)

  const warningLights = await readMysql('mf_nv_warning_lights')
  await insertBatch('mf_nv_warning_lights', warningLights, (r) => ({
    ...r,
    causes: fixJson(r.causes),
  }))
  await pgDb.execute(sql`SELECT setval('mf_nv_warning_lights_id_seq', (SELECT MAX(id) FROM mf_nv_warning_lights))`)
  console.log(`  warning_lights: ${warningLights.length} 行`)

  const wlDtcLinks = await readMysql('mf_nv_warning_light_dtc_links')
  await insertBatch('mf_nv_warning_light_dtc_links', wlDtcLinks)
  console.log(`  warning_light_dtc_links: ${wlDtcLinks.length} 行`)

  console.log('\n迁移完成！')
}

async function main() {
  try {
    await createTables()
    await migrateData()
  } finally {
    await mysqlPool.end()
    await pgClient.end()
  }
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
