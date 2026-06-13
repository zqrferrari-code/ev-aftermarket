/**
 * 创建 mf_nv_purchase_prices 表并填充 AU 市场购车价格数据
 * 运行：SUPABASE_DB_URL=postgresql://... pnpm tsx scripts/seed-purchase-prices.ts
 *
 * 需要直连 PostgreSQL（非 REST API），从 Supabase dashboard > Settings > Database 获取连接字符串
 */

import postgres from 'postgres'

const DB_URL = process.env.SUPABASE_DB_URL
if (!DB_URL) {
  console.error('请设置 SUPABASE_DB_URL 环境变量')
  console.error('从 Supabase Dashboard > Settings > Database > Connection string (URI) 获取')
  process.exit(1)
}

const sql = postgres(DB_URL, { ssl: 'require' })

async function main() {
  // 1. 建表
  await sql`
    CREATE TABLE IF NOT EXISTS mf_nv_purchase_prices (
      id serial PRIMARY KEY,
      model_id varchar(100) NOT NULL REFERENCES mf_nv_models(model_id),
      market_code varchar(10) NOT NULL REFERENCES mf_nv_markets(market_code),
      variant_name varchar(200) NOT NULL,
      price integer NOT NULL,
      currency varchar(10) NOT NULL,
      source_url text,
      last_verified varchar(20),
      UNIQUE (model_id, market_code, variant_name)
    )
  `
  console.log('✓ 表 mf_nv_purchase_prices 已创建（或已存在）')

  // 2. 填充数据
  const rows = [
    // BYD Atto 3 — source: global.autohome.com/zh-au/series/159
    { model_id: 'byd-atto3', market_code: 'au', variant_name: '2024 410km Essential', price: 39990, currency: 'AUD', source_url: 'https://global.autohome.com/zh-au/series/159', last_verified: '2026-06' },
    { model_id: 'byd-atto3', market_code: 'au', variant_name: '2024 480km Premium',   price: 44990, currency: 'AUD', source_url: 'https://global.autohome.com/zh-au/series/159', last_verified: '2026-06' },

    // BYD Dolphin — source: global.autohome.com/zh-au/series/160
    { model_id: 'byd-dolphin', market_code: 'au', variant_name: '2024 410km Essential', price: 29990, currency: 'AUD', source_url: 'https://global.autohome.com/zh-au/series/160', last_verified: '2026-06' },
    { model_id: 'byd-dolphin', market_code: 'au', variant_name: '2024 490km Premium',   price: 36990, currency: 'AUD', source_url: 'https://global.autohome.com/zh-au/series/160', last_verified: '2026-06' },

    // BYD Seal U (sold as Sealion 6 in AU) — source: carsguide.com.au
    { model_id: 'byd-seal-u', market_code: 'au', variant_name: 'Sealion 6 Essential',               price: 39160, currency: 'AUD', source_url: 'https://www.carsguide.com.au/byd/sealion-6/price/2025', last_verified: '2026-06' },
    { model_id: 'byd-seal-u', market_code: 'au', variant_name: 'Sealion 6 Dynamic',                 price: 39600, currency: 'AUD', source_url: 'https://www.carsguide.com.au/byd/sealion-6/price/2025', last_verified: '2026-06' },
    { model_id: 'byd-seal-u', market_code: 'au', variant_name: 'Sealion 6 Premium',                 price: 46200, currency: 'AUD', source_url: 'https://www.carsguide.com.au/byd/sealion-6/price/2025', last_verified: '2026-06' },
    { model_id: 'byd-seal-u', market_code: 'au', variant_name: 'Sealion 6 Premium Extended Range',  price: 49500, currency: 'AUD', source_url: 'https://www.carsguide.com.au/byd/sealion-6/price/2025', last_verified: '2026-06' },

    // BYD Atto 8 (sold as Sealion 8 in AU) — source: carsguide.com.au
    { model_id: 'byd-atto8', market_code: 'au', variant_name: 'Sealion 8 Dynamic FWD',  price: 56990, currency: 'AUD', source_url: 'https://www.carsguide.com.au/byd/sealion-8/price/2026', last_verified: '2026-06' },
    { model_id: 'byd-atto8', market_code: 'au', variant_name: 'Sealion 8 Dynamic AWD',  price: 63990, currency: 'AUD', source_url: 'https://www.carsguide.com.au/byd/sealion-8/price/2026', last_verified: '2026-06' },
    { model_id: 'byd-atto8', market_code: 'au', variant_name: 'Sealion 8 Premium AWD',  price: 70990, currency: 'AUD', source_url: 'https://www.carsguide.com.au/byd/sealion-8/price/2026', last_verified: '2026-06' },

    // MG MG4 — source: global.autohome.com/zh-au/series/146
    { model_id: 'mg-mg4', market_code: 'au', variant_name: '2024 405km RWD Excite',      price: 40160, currency: 'AUD', source_url: 'https://global.autohome.com/zh-au/series/146', last_verified: '2026-06' },
    { model_id: 'mg-mg4', market_code: 'au', variant_name: '2024 535km RWD Excite',      price: 44240, currency: 'AUD', source_url: 'https://global.autohome.com/zh-au/series/146', last_verified: '2026-06' },
    { model_id: 'mg-mg4', market_code: 'au', variant_name: '2024 505km RWD Essence',     price: 47300, currency: 'AUD', source_url: 'https://global.autohome.com/zh-au/series/146', last_verified: '2026-06' },
    { model_id: 'mg-mg4', market_code: 'au', variant_name: '2024 590km RWD Long Range',  price: 53420, currency: 'AUD', source_url: 'https://global.autohome.com/zh-au/series/146', last_verified: '2026-06' },
    { model_id: 'mg-mg4', market_code: 'au', variant_name: '2024 460km 4WD XPower',      price: 58520, currency: 'AUD', source_url: 'https://global.autohome.com/zh-au/series/146', last_verified: '2026-06' },

    // MG ZS EV — source: global.autohome.com/zh-au/series/148
    { model_id: 'mg-zs-ev', market_code: 'au', variant_name: '2024 360km Excite',       price: 34990, currency: 'AUD', source_url: 'https://global.autohome.com/zh-au/series/148', last_verified: '2026-06' },
    { model_id: 'mg-zs-ev', market_code: 'au', variant_name: '2024 360km Essence',      price: 43794, currency: 'AUD', source_url: 'https://global.autohome.com/zh-au/series/148', last_verified: '2026-06' },
    { model_id: 'mg-zs-ev', market_code: 'au', variant_name: '2024 505km Long Range',   price: 48794, currency: 'AUD', source_url: 'https://global.autohome.com/zh-au/series/148', last_verified: '2026-06' },
  ]

  for (const row of rows) {
    await sql`
      INSERT INTO mf_nv_purchase_prices
        (model_id, market_code, variant_name, price, currency, source_url, last_verified)
      VALUES
        (${row.model_id}, ${row.market_code}, ${row.variant_name}, ${row.price}, ${row.currency}, ${row.source_url}, ${row.last_verified})
      ON CONFLICT (model_id, market_code, variant_name) DO UPDATE SET
        price = EXCLUDED.price,
        currency = EXCLUDED.currency,
        source_url = EXCLUDED.source_url,
        last_verified = EXCLUDED.last_verified
    `
    console.log(`✓ ${row.model_id} / ${row.variant_name} = ${row.currency} ${row.price}`)
  }

  console.log(`\n✓ 共写入 ${rows.length} 条记录`)
  await sql.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
