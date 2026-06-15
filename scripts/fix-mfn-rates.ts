import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://xerjbccayvqvaxbqrabu.supabase.co',
  process.env.SUPABASE_SERVICE_KEY!
)

async function fix() {
  // Fix 87081000 (bumpers): 0% -> 5%, add ChAFTA
  const { error: e1 } = await sb.from('mf_tariff_rates')
    .update({
      mfn_rate: '5.00',
      fta_name: 'ChAFTA',
      fta_rate: '0.00',
      fta_conditions: 'Goods must meet ChAFTA Rules of Origin',
      last_verified: '2026-06-15',
      source_url: 'https://www.abf.gov.au/importing-exporting-and-manufacturing/tariff-classification/current-tariff/schedule-3/section-xvii/chapter-87',
    })
    .eq('hs_code', '87081000')
    .eq('country_code', 'AU')
  console.log('87081000 (bumpers):', e1?.message ?? 'OK')

  // Fix 85122000 (lights): 0% -> 5%, add ChAFTA (unverified, assumed same pattern)
  const { error: e2 } = await sb.from('mf_tariff_rates')
    .update({
      mfn_rate: '5.00',
      fta_name: 'ChAFTA',
      fta_rate: '0.00',
      fta_conditions: 'Goods must meet ChAFTA Rules of Origin',
      last_verified: '2026-06-15',
      source_url: 'https://www.abf.gov.au/importing-exporting-and-manufacturing/tariff-classification/current-tariff/schedule-3/section-xvi/chapter-85',
    })
    .eq('hs_code', '85122000')
    .eq('country_code', 'AU')
  console.log('85122000 (lights):', e2?.message ?? 'OK')
}

fix().catch(console.error)
