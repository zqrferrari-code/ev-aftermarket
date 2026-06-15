import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://xerjbccayvqvaxbqrabu.supabase.co',
  process.env.SUPABASE_SERVICE_KEY!
)

async function fix() {
  const { error: e1 } = await sb.from('mf_part_hs_codes')
    .update({ hs_code: '87082991' })
    .eq('hs_code', '87082900')
    .eq('country_code', 'AU')
  console.log('hs_codes update:', e1?.message ?? 'OK')

  const { error: e2 } = await sb.from('mf_tariff_rates')
    .update({
      hs_code: '87082991',
      mfn_rate: '5.00',
      fta_name: 'ChAFTA',
      fta_rate: '0.00',
      fta_conditions: 'Goods must meet ChAFTA Rules of Origin',
      last_verified: '2026-06-15',
      source_url: 'https://www.abf.gov.au/importing-exporting-and-manufacturing/tariff-classification/current-tariff',
    })
    .eq('hs_code', '87082900')
    .eq('country_code', 'AU')
  console.log('tariff_rates update:', e2?.message ?? 'OK')
}

fix().catch(console.error)
