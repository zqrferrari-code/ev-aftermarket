/**
 * 从 MySQL 读取数据，通过 supabase-js REST API 写入 Supabase
 * 运行：DATABASE_URL=mysql://... pnpm tsx scripts/import-to-supabase.ts
 */

import mysql from 'mysql2/promise'
import { createClient } from '@supabase/supabase-js'

const MYSQL_URL = process.env.DATABASE_URL!
const SUPABASE_URL = 'https://xerjbccayvqvaxbqrabu.supabase.co'
const SUPABASE_KEY = 'process.env.SUPABASE_SERVICE_KEY!'

const pool = mysql.createPool({ uri: MYSQL_URL, waitForConnections: true, connectionLimit: 5 })
const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

async function readTable(table: string) {
  const [rows] = await pool.execute(`SELECT * FROM \`${table}\``)
  return rows as any[]
}

function fixJson(val: any) {
  if (val === null || val === undefined) return null
  if (typeof val === 'string') {
    try { return JSON.parse(val) } catch { return null }
  }
  return val
}

// 只保留 schema 里定义的列，丢弃 MySQL 多余的列
const COLUMNS: Record<string, string[]> = {
  mf_nv_markets: ['market_code','country_name','currency','drive_side','climate_zone','active'],
  mf_nv_brands: ['brand_id','brand_name_en','brand_name_cn','logo_url'],
  mf_nv_models: ['model_id','brand_id','model_name','vehicle_type','years','steering','slug','range_km','battery_kwh','acceleration_0_100','charge_ac_kw','charge_dc_kw','cargo_l'],
  mf_nv_dtcs: ['dtc_id','dtc_code','dtc_type','description_en','severity','related_system','safety_warning'],
  mf_nv_dtc_model_notes: ['id','dtc_id','model_id','market_code','likely_causes','suggested_actions','climate_notes','data_confidence','source_urls','created_at','updated_at'],
  mf_nv_software_updates: ['update_id','model_id','market_code','version','release_date','update_method','changelog_en','source_url','data_confidence','created_at'],
  mf_nv_service_costs: ['cost_id','model_id','market_code','service_type','cost_min','cost_max','currency','is_dealer_only','notes','source_url','data_confidence','created_at'],
  mf_nv_dealers: ['dealer_id','brand_id','market_code','city','state_province','name','address','phone','hours','is_authorised','last_verified','created_at'],
  mf_nv_cases: ['case_id','model_id','market_code','content_type','source_type','source_name','source_url','source_language','location','report_date','vehicle_desc','symptom_summary','resolution','cost_info','confidence','translated_by','created_at'],
  mf_nv_case_dtc_links: ['case_id','dtc_id'],
  mf_nv_case_media: ['media_id','case_id','media_type','media_url','caption','source_attribution','display_order'],
  mf_nv_pending_cases: ['id','raw_content','source_platform','source_url','ai_extracted','status','created_at'],
  mf_nv_pending_software_updates: ['id','raw_content','source_platform','source_url','ai_extracted','status','created_at'],
  mf_nv_pending_service_costs: ['id','model_slug','market_code','service_type','cost_min','cost_max','currency','city','is_dealer_only','submitter_email','status','created_at'],
  mf_nv_warning_lights: ['id','brand_id','model_id','slug','code','category','name_en','name_cn','severity','description_en','causes','can_drive','action_en'],
  mf_nv_warning_light_dtc_links: ['warning_light_id','dtc_id'],
}

function pick(table: string, rows: any[]): any[] {
  const cols = COLUMNS[table]
  if (!cols) return rows
  return rows.map(r => Object.fromEntries(cols.map(c => [c, r[c] ?? null])))
}

async function upsert(table: string, rows: any[], chunkSize = 200) {
  if (rows.length === 0) { console.log(`  ${table}: 0 行，跳过`); return }
  const cleaned = pick(table, rows)
  let inserted = 0
  for (let i = 0; i < cleaned.length; i += chunkSize) {
    const chunk = cleaned.slice(i, i + chunkSize)
    const { error } = await sb.from(table).upsert(chunk, { ignoreDuplicates: true })
    if (error) throw new Error(`${table} chunk ${i}: ${error.message}`)
    inserted += chunk.length
  }
  console.log(`  ${table}: ${inserted} 行 ✓`)
}

async function main() {
  console.log('读取 MySQL 数据...')

  const markets = await readTable('mf_nv_markets')
  const brands = await readTable('mf_nv_brands')
  const models = await readTable('mf_nv_models')
  const dtcs = await readTable('mf_nv_dtcs')
  const dtcNotes = await readTable('mf_nv_dtc_model_notes')
  const updates = await readTable('mf_nv_software_updates')
  const serviceCosts = await readTable('mf_nv_service_costs')
  const dealers = await readTable('mf_nv_dealers')
  const cases = await readTable('mf_nv_cases')
  const caseDtcLinks = await readTable('mf_nv_case_dtc_links')
  const caseMedia = await readTable('mf_nv_case_media')
  const pendingCases = await readTable('mf_nv_pending_cases')
  const pendingUpdates = await readTable('mf_nv_pending_software_updates')
  const pendingService = await readTable('mf_nv_pending_service_costs')
  const warningLights = await readTable('mf_nv_warning_lights')
  const wlDtcLinks = await readTable('mf_nv_warning_light_dtc_links')

  console.log('\n写入 Supabase...')

  await upsert('mf_nv_markets', markets)
  await upsert('mf_nv_brands', brands)
  await upsert('mf_nv_models', models.map(r => ({
    ...r,
    battery_kwh: r.battery_kwh?.toString() ?? null,
    acceleration_0_100: r.acceleration_0_100?.toString() ?? null,
    charge_ac_kw: r.charge_ac_kw?.toString() ?? null,
    charge_dc_kw: r.charge_dc_kw?.toString() ?? null,
  })))
  await upsert('mf_nv_dtcs', dtcs)
  await upsert('mf_nv_dtc_model_notes', dtcNotes.map(r => ({
    ...r,
    likely_causes: fixJson(r.likely_causes),
    suggested_actions: fixJson(r.suggested_actions),
    source_urls: fixJson(r.source_urls),
  })), 100)
  await upsert('mf_nv_software_updates', updates)
  await upsert('mf_nv_service_costs', serviceCosts)
  await upsert('mf_nv_dealers', dealers)
  await upsert('mf_nv_cases', cases, 100)
  await upsert('mf_nv_case_dtc_links', caseDtcLinks)
  await upsert('mf_nv_case_media', caseMedia)
  await upsert('mf_nv_pending_cases', pendingCases.map(r => ({
    ...r,
    ai_extracted: fixJson(r.ai_extracted),
  })))
  await upsert('mf_nv_pending_software_updates', pendingUpdates.map(r => ({
    ...r,
    ai_extracted: fixJson(r.ai_extracted),
  })))
  await upsert('mf_nv_pending_service_costs', pendingService)
  await upsert('mf_nv_warning_lights', warningLights.map(r => ({
    ...r,
    causes: fixJson(r.causes),
  })))
  await upsert('mf_nv_warning_light_dtc_links', wlDtcLinks)

  console.log('\n全部完成！')
  await pool.end()
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
