import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://xerjbccayvqvaxbqrabu.supabase.co',
  process.env.SUPABASE_SERVICE_KEY!
)

async function fix() {
  // Update hs_codes: 87081000 -> 87081010
  const { error: e1 } = await sb.from('mf_part_hs_codes')
    .update({ hs_code: '87081010' })
    .eq('hs_code', '87081000')
    .eq('country_code', 'AU')
  console.log('hs_codes 87081000->87081010:', e1?.message ?? 'OK')

  // Update tariff_rates: 87081000 -> 87081010
  const { error: e2 } = await sb.from('mf_tariff_rates')
    .update({ hs_code: '87081010' })
    .eq('hs_code', '87081000')
    .eq('country_code', 'AU')
  console.log('tariff_rates 87081000->87081010:', e2?.message ?? 'OK')
}

fix().catch(console.error)
