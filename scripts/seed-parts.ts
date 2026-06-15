import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const sb = createClient(
  'https://xerjbccayvqvaxbqrabu.supabase.co',
  process.env.SUPABASE_SERVICE_KEY!
)

// ─── 配件基础数据 ──────────────────────────────────────────

const PARTS = [
  { slug: 'front-bumper', name_en: 'Front Bumper Assembly',  name_cn: '前保险杠总成', category: 'exterior', material: 'PP Plastic' },
  { slug: 'rear-bumper',  name_en: 'Rear Bumper Assembly',   name_cn: '后保险杠总成', category: 'exterior', material: 'PP Plastic' },
  { slug: 'headlights',   name_en: 'Headlight Assembly',     name_cn: '大灯总成',     category: 'lighting', material: 'Polycarbonate' },
  { slug: 'tail-lights',  name_en: 'Tail Light Assembly',    name_cn: '尾灯总成',     category: 'lighting', material: 'Polycarbonate' },
  { slug: 'front-fender', name_en: 'Front Fender',           name_cn: '前翼子板',     category: 'exterior', material: 'Steel' },
  { slug: 'side-mirror',  name_en: 'Side Mirror Assembly',   name_cn: '后视镜总成',   category: 'exterior', material: 'ABS Plastic' },
]

// ─── 车型适配关系 ──────────────────────────────────────────
// model_id 来自 mf_nv_models 表的实际值

const MODEL_COMPATIBILITY: Record<string, { model_id: string; years: string }[]> = {
  'front-bumper': [
    { model_id: 'byd-dolphin',   years: '2021-2025' },
    { model_id: 'byd-atto3',     years: '2021-2025' },
    { model_id: 'byd-seal-6-ev', years: '2022-2025' },
  ],
  'rear-bumper': [
    { model_id: 'byd-dolphin',   years: '2021-2025' },
    { model_id: 'byd-atto3',     years: '2021-2025' },
    { model_id: 'byd-seal-6-ev', years: '2022-2025' },
  ],
  'headlights': [
    { model_id: 'byd-dolphin',   years: '2021-2025' },
    { model_id: 'byd-atto3',     years: '2021-2025' },
    { model_id: 'byd-seal-6-ev', years: '2022-2025' },
  ],
  'tail-lights': [
    { model_id: 'byd-dolphin',   years: '2021-2025' },
    { model_id: 'byd-atto3',     years: '2021-2025' },
    { model_id: 'byd-seal-6-ev', years: '2022-2025' },
  ],
  'front-fender': [
    { model_id: 'byd-dolphin',   years: '2021-2025' },
    { model_id: 'byd-atto3',     years: '2021-2025' },
    { model_id: 'byd-seal-6-ev', years: '2022-2025' },
  ],
  'side-mirror': [
    { model_id: 'byd-dolphin',   years: '2021-2025' },
    { model_id: 'byd-atto3',     years: '2021-2025' },
    { model_id: 'byd-seal-6-ev', years: '2022-2025' },
  ],
}

// ─── HS 编码数据 ───────────────────────────────────────────
// CN 出口编码（10位）来源：中国海关总署
// AU 进口编码（8位）来源：ABF Working Tariff
// 注：翼子板和后视镜的 AU 8 位子目待核实，暂用 87082900

const HS_CODES: Record<string, { cn: string; au: string }> = {
  'front-bumper': { cn: '8708101000', au: '87081010' },
  'rear-bumper':  { cn: '8708101000', au: '87081010' },
  'headlights':   { cn: '8512201000', au: '85122000' },
  'tail-lights':  { cn: '8512209000', au: '85122000' },
  'front-fender': { cn: '8708299090', au: '87082991' },
  'side-mirror':  { cn: '8708291000', au: '87082991' },
}

// ─── 澳洲关税数据 ──────────────────────────────────────────
// 来源：ABF Current Tariff（已核实）
// 澳洲对上述所有配件 MFN 关税为 5%，ChAFTA（中澳自贸协定）税率为 0%
// 需提供原产地证明方可享受 ChAFTA 优惠税率

const AU_TARIFF_RATES = [
  {
    country_code: 'AU',
    hs_code: '87081010', // Bumpers — of a kind used as components in passenger motor vehicles
    mfn_rate: '5.00',
    fta_name: 'ChAFTA',
    fta_rate: '0.00',
    fta_conditions: 'Goods must meet ChAFTA Rules of Origin',
    vat_rate: '10.00',
    last_verified: '2026-06-15',
    source_url: 'https://www.abf.gov.au/importing-exporting-and-manufacturing/tariff-classification/current-tariff/schedule-3/section-xvii/chapter-87',
  },
  {
    country_code: 'AU',
    hs_code: '85122000', // Lighting equipment for motor vehicles
    mfn_rate: '5.00',
    fta_name: 'ChAFTA',
    fta_rate: '0.00',
    fta_conditions: 'Goods must meet ChAFTA Rules of Origin',
    vat_rate: '10.00',
    last_verified: '2026-06-15',
    source_url: 'https://www.abf.gov.au/importing-exporting-and-manufacturing/tariff-classification/current-tariff/schedule-3/section-xvi/chapter-85',
  },
  {
    country_code: 'AU',
    hs_code: '87082991', // Other body parts — of a kind used as components in passenger motor vehicles
    mfn_rate: '5.00',
    fta_name: 'ChAFTA',
    fta_rate: '0.00',
    fta_conditions: 'Goods must meet ChAFTA Rules of Origin',
    vat_rate: '10.00',
    last_verified: '2026-06-15',
    source_url: 'https://www.abf.gov.au/importing-exporting-and-manufacturing/tariff-classification/current-tariff/schedule-3/section-xvii/chapter-87',
  },
]

async function seed() {
  console.log('Seeding parts data...')

  // 1. 插入 parts
  const { data: insertedParts, error: partsError } = await sb
    .from('mf_parts')
    .insert(PARTS)
    .select('id, slug')

  if (partsError) throw new Error(`Parts insert failed: ${partsError.message}`)
  console.log(`✓ Inserted ${insertedParts!.length} parts`)

  const partIdBySlug = Object.fromEntries(insertedParts!.map((p: any) => [p.slug, p.id]))

  // 2. 插入 part_model_compatibility
  const compatRows = Object.entries(MODEL_COMPATIBILITY).flatMap(([slug, models]) =>
    models.map(m => ({ part_id: partIdBySlug[slug], model_id: m.model_id, years: m.years }))
  )
  const { error: compatError } = await sb.from('mf_part_model_compatibility').insert(compatRows)
  if (compatError) throw new Error(`Compatibility insert failed: ${compatError.message}`)
  console.log(`✓ Inserted ${compatRows.length} compatibility rows`)

  // 3. 插入 part_hs_codes（CN 出口 + AU 进口各一条）
  const hsRows = Object.entries(HS_CODES).flatMap(([slug, codes]) => [
    {
      part_id: partIdBySlug[slug],
      country_code: 'CN',
      hs_code: codes.cn,
      hs_code_type: 'export',
      description_en: null,
      last_verified: '2026-06-15',
    },
    {
      part_id: partIdBySlug[slug],
      country_code: 'AU',
      hs_code: codes.au,
      hs_code_type: 'import',
      description_en: null,
      last_verified: '2026-06-15',
    },
  ])
  const { error: hsError } = await sb.from('mf_part_hs_codes').insert(hsRows)
  if (hsError) throw new Error(`HS codes insert failed: ${hsError.message}`)
  console.log(`✓ Inserted ${hsRows.length} HS code rows`)

  // 4. 插入 tariff_rates（澳洲）
  const { error: tariffError } = await sb.from('mf_tariff_rates').insert(AU_TARIFF_RATES)
  if (tariffError) throw new Error(`Tariff rates insert failed: ${tariffError.message}`)
  console.log(`✓ Inserted ${AU_TARIFF_RATES.length} tariff rate rows`)

  console.log('Seeding complete!')
}

seed().catch(console.error)
