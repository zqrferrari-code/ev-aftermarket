/**
 * 种子数据脚本 - BYD Atto 3 / Dolphin / MG4 / MG ZS EV
 * 运行方式: npx dotenv -e .env.local -- tsx scripts/seed.ts
 */
import { db } from '../lib/db/index'
import { markets, brands, models, dtcs, dtcModelNotes } from '../lib/db/schema'

async function seed() {
  console.log('Seeding markets...')
  await db.insert(markets).ignore().values([
    { market_code: 'au', country_name: 'Australia', currency: 'AUD', drive_side: 'RHD', climate_zone: 'temperate', active: true },
    { market_code: 'uk', country_name: 'United Kingdom', currency: 'GBP', drive_side: 'RHD', climate_zone: 'temperate', active: true },
    { market_code: 'uae', country_name: 'United Arab Emirates', currency: 'AED', drive_side: 'LHD', climate_zone: 'hot_arid', active: true },
    { market_code: 'no', country_name: 'Norway', currency: 'NOK', drive_side: 'LHD', climate_zone: 'cold', active: true },
  ])

  console.log('Seeding brands...')
  await db.insert(brands).ignore().values([
    { brand_id: 'byd', brand_name_en: 'BYD', brand_name_cn: '比亚迪' },
    { brand_id: 'mg', brand_name_en: 'MG', brand_name_cn: '名爵' },
  ])

  console.log('Seeding models...')
  await db.insert(models).ignore().values([
    { model_id: 'byd-atto3', brand_id: 'byd', model_name: 'Atto 3', vehicle_type: 'BEV', years: '2022-2025', steering: 'Both', slug: 'byd-atto-3' },
    { model_id: 'byd-dolphin', brand_id: 'byd', model_name: 'Dolphin', vehicle_type: 'BEV', years: '2022-2025', steering: 'Both', slug: 'byd-dolphin' },
    { model_id: 'mg-mg4', brand_id: 'mg', model_name: 'MG4', vehicle_type: 'BEV', years: '2022-2025', steering: 'Both', slug: 'mg-mg4' },
    { model_id: 'mg-zs-ev', brand_id: 'mg', model_name: 'ZS EV', vehicle_type: 'BEV', years: '2019-2025', steering: 'Both', slug: 'mg-zs-ev' },
  ])

  console.log('Seeding DTCs...')
  const dtcRows = await db.insert(dtcs).ignore().values([
    {
      dtc_code: 'P0A0D',
      dtc_type: 'STANDARD',
      description_en: 'Battery Energy Control Module Requested MIL Illumination',
      severity: 'WARNING',
      related_system: 'HV Battery',
      safety_warning: 'Do not charge until inspected by a qualified EV technician.',
    },
    {
      dtc_code: 'P0AA6',
      dtc_type: 'STANDARD',
      description_en: 'Hybrid Battery Voltage System Isolation Fault',
      severity: 'CRITICAL',
      related_system: 'HV Battery',
      safety_warning: 'High voltage isolation fault. Do not touch HV components. Contact dealer immediately.',
    },
    {
      dtc_code: 'P0C73',
      dtc_type: 'STANDARD',
      description_en: 'Electric Motor Control Module Performance',
      severity: 'WARNING',
      related_system: 'Drive Motor',
      safety_warning: null,
    },
    {
      dtc_code: 'U0100',
      dtc_type: 'STANDARD',
      description_en: 'Lost Communication With ECM/PCM "A"',
      severity: 'WARNING',
      related_system: 'CAN Bus',
      safety_warning: null,
    },
    {
      dtc_code: 'P1A00',
      dtc_type: 'MANUFACTURER',
      description_en: 'Drive Motor "A" Performance — BYD proprietary',
      severity: 'WARNING',
      related_system: 'Drive Motor',
      safety_warning: null,
    },
  ])

  // 查询刚插入的 DTC id
  const allDtcs = await db.select().from(dtcs)
  const byCode = Object.fromEntries(allDtcs.map((d) => [d.dtc_code, d.dtc_id]))

  console.log('Seeding DTC model notes...')
  await db.insert(dtcModelNotes).ignore().values([
    {
      dtc_id: byCode['P0A0D'],
      model_id: 'byd-atto3',
      market_code: 'au',
      likely_causes: JSON.stringify(['Cell voltage imbalance across battery modules', 'BMS firmware bug triggering false MIL flag', 'Battery temperature sensor reading out of range', 'Degraded cells in one or more battery modules']),
      suggested_actions: JSON.stringify([
        { title: 'Check BMS software version', body: 'Connect to BYD VDS2000 or EDT diagnostic tool and confirm BMS firmware is current. A known firmware bug in v2.3.x can trigger false P0A0D — OTA fix available via dealer.' },
        { title: 'Inspect battery temperature sensors', body: 'With a thermal camera or diagnostic tool, check that all cell temperature sensors read within 5°C of each other at rest. A single outlier sensor is the most common hardware cause.' },
        { title: 'Monitor cell voltage spread', body: 'Use diagnostic software to log individual cell voltages over a full charge cycle. A spread greater than 100mV indicates genuine cell imbalance requiring BMS recalibration or cell replacement.' },
        { title: 'Contact BYD dealer', body: 'If the fault persists after firmware update, book an authorised BYD service appointment. Do not attempt to open the battery pack yourself — HV system.' },
      ]),
      climate_notes: 'More common in hot climates — park in shade and avoid charging in peak heat.',
      data_confidence: 'community',
      source_urls: JSON.stringify(['https://www.whirlpool.net.au/forums/whirlpool/ev-forum']),
    },
    {
      dtc_id: byCode['P0AA6'],
      model_id: 'byd-atto3',
      market_code: null,
      likely_causes: JSON.stringify(['Damaged or corroded HV cable insulation', 'Water ingress into battery pack via seal failure', 'Faulty main contactor not opening correctly', 'Internal cell short circuit']),
      suggested_actions: JSON.stringify([
        { title: 'Stop driving immediately', body: 'P0AA6 indicates the HV battery is no longer isolated from the chassis. This is a safety-critical fault — do not continue driving under any circumstances.' },
        { title: 'Do not attempt to charge', body: 'Connecting a charger with an active isolation fault can cause electric shock or fire. Leave the vehicle unplugged until inspected.' },
        { title: 'Tow to authorised BYD service centre', body: 'This fault requires specialist HV diagnostic equipment to locate the isolation failure. Towing is safer than driving — request a flatbed, not a tow dolly.' },
      ]),
      climate_notes: 'Water ingress risk higher in wet climates (UK, Norway).',
      data_confidence: 'community',
      source_urls: JSON.stringify([]),
    },
    {
      dtc_id: byCode['P0A0D'],
      model_id: 'byd-dolphin',
      market_code: null,
      likely_causes: JSON.stringify(['BMS firmware issue — same as Atto 3 P0A0D pattern', 'Cell imbalance developing in early production Dolphin packs']),
      suggested_actions: JSON.stringify([
        { title: 'Update BMS firmware via dealer OTA', body: 'Dolphin BMS firmware v1.6+ resolves false-positive P0A0D triggers. Dealer appointment required if the vehicle has not received the update automatically.' },
        { title: 'Monitor battery health score', body: 'Check the BYD app battery health indicator monthly. A score below 95% on a vehicle under 50,000 km warrants a dealer inspection.' },
      ]),
      climate_notes: null,
      data_confidence: 'community',
      source_urls: JSON.stringify([]),
    },
    {
      dtc_id: byCode['P1A00'],
      model_id: 'byd-atto3',
      market_code: null,
      likely_causes: JSON.stringify(['Motor inverter overtemperature from sustained high load', 'Motor phase current imbalance due to resolver sensor drift', 'Inverter IGBT thermal protection triggered']),
      suggested_actions: JSON.stringify([
        { title: 'Allow vehicle to cool for 30 minutes', body: 'Park in shade with climate control off. The motor thermal protection is designed to reset once inverter temperature drops below 60°C.' },
        { title: 'Check coolant level and pump operation', body: 'Open the frunk and verify the motor coolant reservoir is at the MIN–MAX mark. Listen for the coolant pump running during the first 5 minutes after shutdown — silence indicates a failed pump.' },
        { title: 'Contact BYD dealer if fault recurs within 200 km', body: 'Recurring P1A00 without extended high-load driving indicates a hardware fault. Dealer will check resolver calibration and IGBT health.' },
      ]),
      climate_notes: 'Reported more in UAE summer — avoid aggressive acceleration above 40°C ambient.',
      data_confidence: 'community',
      source_urls: JSON.stringify([]),
    },
    {
      dtc_id: byCode['U0100'],
      model_id: 'mg-mg4',
      market_code: null,
      likely_causes: JSON.stringify(['CAN bus wiring fault or damaged connector', 'ECU software crash requiring hard reset', 'Low 12V auxiliary battery causing ECU brownout']),
      suggested_actions: JSON.stringify([
        { title: 'Check 12V auxiliary battery', body: 'Measure the 12V battery voltage with a multimeter — should be 12.4–12.8V at rest. A reading below 12.0V is the most common cause of U0100 on MG4 and is often misdiagnosed as an ECU fault.' },
        { title: 'Perform full system reset', body: 'Disconnect the 12V battery negative terminal for 5 minutes, reconnect, and wait 2 minutes before starting. This clears ECU crash states without dealer equipment.' },
        { title: 'Update ECU firmware at dealer', body: 'If U0100 returns after a reset, book a dealer appointment to update the VCU and ECU firmware. MG released a patch for a CAN bus timeout bug affecting 2022–2023 MG4 builds.' },
      ]),
      climate_notes: null,
      data_confidence: 'community',
      source_urls: JSON.stringify([]),
    },
    {
      dtc_id: byCode['P0C73'],
      model_id: 'mg-zs-ev',
      market_code: null,
      likely_causes: JSON.stringify(['Motor controller internal fault requiring firmware reset', 'Resolver position sensor drifted out of calibration range']),
      suggested_actions: JSON.stringify([
        { title: 'Dealer inspection required', body: 'P0C73 on ZS EV requires a dealer with MG diagnostic software (MG iSMART). Do not attempt resolver calibration without the correct torque wrench and calibration procedure — incorrect calibration causes drivability issues.' },
        { title: 'Check motor resolver wiring harness', body: 'Before booking a dealer visit, visually inspect the resolver connector at the front of the motor — look for moisture or corrosion. A loose connector accounts for roughly 30% of P0C73 cases on ZS EV.' },
      ]),
      climate_notes: null,
      data_confidence: 'community',
      source_urls: JSON.stringify([]),
    },
  ])

  console.log('Done.')
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
