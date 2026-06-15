/**
 * 从 MySQL 导出数据为 PostgreSQL INSERT SQL，拆分为多个小文件
 * 运行：DATABASE_URL=mysql://... pnpm tsx scripts/export-to-sql.ts
 */

import mysql from 'mysql2/promise'
import { writeFileSync, mkdirSync } from 'fs'

const MYSQL_URL = process.env.DATABASE_URL!
const pool = mysql.createPool({ uri: MYSQL_URL, waitForConnections: true, connectionLimit: 5 })

function escape(val: any): string {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
  if (typeof val === 'number') return String(val)
  if (val instanceof Date) return `'${val.toISOString().replace('T', ' ').replace('Z', '')}'`
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`
  return `'${String(val).replace(/'/g, "''")}'`
}

async function readTable(table: string) {
  const [rows] = await pool.execute(`SELECT * FROM \`${table}\``)
  return rows as any[]
}

function genInserts(table: string, rows: any[]): string {
  if (rows.length === 0) return `-- ${table}: 0 rows\n`
  const cols = Object.keys(rows[0]).map(c => `"${c}"`).join(', ')
  const batches: string[] = []
  for (let i = 0; i < rows.length; i += 200) {
    const lines = rows.slice(i, i + 200).map(row => {
      const vals = Object.values(row).map(escape).join(', ')
      return `(${vals})`
    })
    batches.push(`INSERT INTO ${table} (${cols}) VALUES\n${lines.join(',\n')}\nON CONFLICT DO NOTHING;`)
  }
  return batches.join('\n') + '\n'
}

function write(path: string, content: string) {
  writeFileSync(path, content, 'utf8')
  const kb = Math.round(Buffer.byteLength(content, 'utf8') / 1024)
  console.log(`  ${path.split('/').pop()} — ${kb} KB`)
}

const DDL = `-- EVAftermarket — Supabase schema
-- 执行顺序：01 → 02 → 03a/b/c → 04a/b/c/d → 05a/b → 06 → 07

CREATE TABLE IF NOT EXISTS mf_nv_markets (
  market_code VARCHAR(10) PRIMARY KEY,
  country_name VARCHAR(100) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  drive_side VARCHAR(5),
  climate_zone VARCHAR(20),
  active BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS mf_nv_brands (
  brand_id VARCHAR(50) PRIMARY KEY,
  brand_name_en VARCHAR(100) NOT NULL,
  brand_name_cn VARCHAR(100),
  logo_url TEXT
);

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
);

CREATE TABLE IF NOT EXISTS mf_nv_dtcs (
  dtc_id SERIAL PRIMARY KEY,
  dtc_code VARCHAR(20) NOT NULL,
  dtc_type VARCHAR(20) DEFAULT 'STANDARD',
  description_en TEXT NOT NULL,
  severity VARCHAR(10),
  related_system VARCHAR(100),
  safety_warning TEXT
);
CREATE INDEX IF NOT EXISTS idx_mf_nv_dtcs_code ON mf_nv_dtcs(dtc_code);

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
);
CREATE INDEX IF NOT EXISTS idx_mf_nv_dmn_dtc_id ON mf_nv_dtc_model_notes(dtc_id);
CREATE INDEX IF NOT EXISTS idx_mf_nv_dmn_model_id ON mf_nv_dtc_model_notes(model_id);

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
);
CREATE INDEX IF NOT EXISTS idx_mf_nv_su_model_id ON mf_nv_software_updates(model_id);

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
);

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
);
CREATE INDEX IF NOT EXISTS idx_mf_nv_dealers_brand_market ON mf_nv_dealers(brand_id, market_code);

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
);
CREATE INDEX IF NOT EXISTS idx_mf_nv_cases_model_id ON mf_nv_cases(model_id);
CREATE INDEX IF NOT EXISTS idx_mf_nv_cases_content_type ON mf_nv_cases(content_type);

CREATE TABLE IF NOT EXISTS mf_nv_case_dtc_links (
  case_id INTEGER REFERENCES mf_nv_cases(case_id) NOT NULL,
  dtc_id INTEGER REFERENCES mf_nv_dtcs(dtc_id) NOT NULL,
  PRIMARY KEY (case_id, dtc_id)
);

CREATE TABLE IF NOT EXISTS mf_nv_case_media (
  media_id SERIAL PRIMARY KEY,
  case_id INTEGER REFERENCES mf_nv_cases(case_id),
  media_type VARCHAR(20) NOT NULL,
  media_url TEXT NOT NULL,
  caption TEXT,
  source_attribution TEXT,
  display_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS mf_nv_pending_cases (
  id SERIAL PRIMARY KEY,
  raw_content TEXT NOT NULL,
  source_platform VARCHAR(100) NOT NULL,
  source_url TEXT,
  ai_extracted JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mf_nv_pending_software_updates (
  id SERIAL PRIMARY KEY,
  raw_content TEXT NOT NULL,
  source_platform VARCHAR(100) NOT NULL,
  source_url TEXT,
  ai_extracted JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

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
);

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
);
CREATE INDEX IF NOT EXISTS idx_mf_nv_wl_brand_id ON mf_nv_warning_lights(brand_id);
CREATE INDEX IF NOT EXISTS idx_mf_nv_wl_model_id ON mf_nv_warning_lights(model_id);

CREATE TABLE IF NOT EXISTS mf_nv_warning_light_dtc_links (
  warning_light_id INTEGER REFERENCES mf_nv_warning_lights(id) NOT NULL,
  dtc_id INTEGER REFERENCES mf_nv_dtcs(dtc_id) NOT NULL,
  PRIMARY KEY (warning_light_id, dtc_id)
);
`

async function main() {
  mkdirSync('scripts/supabase-parts', { recursive: true })
  console.log('读取 MySQL 数据...')

  const data: Record<string, any[]> = {}
  const tables = [
    'mf_nv_markets','mf_nv_brands','mf_nv_models','mf_nv_dtcs',
    'mf_nv_dtc_model_notes','mf_nv_software_updates','mf_nv_service_costs',
    'mf_nv_dealers','mf_nv_cases','mf_nv_case_dtc_links','mf_nv_case_media',
    'mf_nv_pending_cases','mf_nv_pending_software_updates','mf_nv_pending_service_costs',
    'mf_nv_warning_lights','mf_nv_warning_light_dtc_links',
  ]
  for (const t of tables) {
    data[t] = await readTable(t)
    console.log(`  ${t}: ${data[t].length} 行`)
  }

  console.log('\n写入 supabase-parts/...')

  // 01 schema
  write('scripts/supabase-parts/01-schema.sql', DDL)

  // 02 小表
  const small = ['mf_nv_markets','mf_nv_brands','mf_nv_models','mf_nv_dtcs',
    'mf_nv_software_updates','mf_nv_service_costs','mf_nv_dealers',
    'mf_nv_case_media','mf_nv_pending_software_updates','mf_nv_pending_service_costs',
    'mf_nv_warning_lights','mf_nv_warning_light_dtc_links']
  write('scripts/supabase-parts/02-small-tables.sql',
    '-- 小表数据\n' + small.map(t => `-- ${t}\n` + genInserts(t, data[t])).join('\n'))

  // 03 dtc_model_notes 拆 3 份
  const dmn = data['mf_nv_dtc_model_notes']
  const dmnChunk = Math.ceil(dmn.length / 3)
  for (let i = 0; i < 3; i++) {
    write(`scripts/supabase-parts/03-dtc-notes-p${i+1}.sql`,
      genInserts('mf_nv_dtc_model_notes', dmn.slice(i * dmnChunk, (i+1) * dmnChunk)))
  }

  // 04 cases 拆 4 份
  const cs = data['mf_nv_cases']
  const csChunk = Math.ceil(cs.length / 4)
  for (let i = 0; i < 4; i++) {
    write(`scripts/supabase-parts/04-cases-p${i+1}.sql`,
      genInserts('mf_nv_cases', cs.slice(i * csChunk, (i+1) * csChunk)))
  }

  // 05 case_dtc_links 拆 2 份
  const cdl = data['mf_nv_case_dtc_links']
  const cdlChunk = Math.ceil(cdl.length / 2)
  for (let i = 0; i < 2; i++) {
    write(`scripts/supabase-parts/05-case-links-p${i+1}.sql`,
      genInserts('mf_nv_case_dtc_links', cdl.slice(i * cdlChunk, (i+1) * cdlChunk)))
  }

  // 06 pending_cases
  write('scripts/supabase-parts/06-pending-cases.sql',
    genInserts('mf_nv_pending_cases', data['mf_nv_pending_cases']))

  // 07 reset sequences
  write('scripts/supabase-parts/07-reset-sequences.sql', `-- reset sequences
SELECT setval('mf_nv_dtcs_dtc_id_seq', (SELECT MAX(dtc_id) FROM mf_nv_dtcs));
SELECT setval('mf_nv_dtc_model_notes_id_seq', (SELECT MAX(id) FROM mf_nv_dtc_model_notes));
SELECT setval('mf_nv_software_updates_update_id_seq', GREATEST(1, (SELECT MAX(update_id) FROM mf_nv_software_updates)));
SELECT setval('mf_nv_cases_case_id_seq', (SELECT MAX(case_id) FROM mf_nv_cases));
SELECT setval('mf_nv_pending_cases_id_seq', GREATEST(1, (SELECT MAX(id) FROM mf_nv_pending_cases)));
SELECT setval('mf_nv_warning_lights_id_seq', (SELECT MAX(id) FROM mf_nv_warning_lights));
`)

  console.log('\n完成！按顺序在 Supabase SQL Editor 执行 01→02→03→04→05→06→07')
  await pool.end()
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
