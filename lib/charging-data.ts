/**
 * 充电网络、充电桩（EVSE）等静态数据
 * 用于 charging 页面的丰富内容
 */

export interface ChargingNetwork {
  name: string
  type: 'DC' | 'AC' | 'Both'
  maxSpeed: string
  connectors: string[]
  pricingUrl: string    // link to official pricing page
  pricingNote?: string  // brief note about pricing structure
  membershipRequired: boolean
  appRequired: boolean
  paymentOptions: string[]
  stationCount: string  // approximate, may be outdated
  coverage: string
  website: string
  ok: boolean
  note: string
}

export interface EVSEProduct {
  name: string
  brand: string
  type: '7.2kW' | '11kW' | '22kW' | '3.6kW'
  price: string          // AUD inc GST
  features: string[]
  compatible: boolean    // compatible with most Chinese EVs
  note?: string
}

export interface EVSEInstaller {
  type: string
  description: string
  costRange: string
  notes: string[]
}

// Pricing changes frequently — link to official pages instead of showing static numbers
export const AU_CHARGING_NETWORKS: ChargingNetwork[] = [
  {
    name: 'Chargefox',
    type: 'Both',
    maxSpeed: '350 kW DC',
    connectors: ['CCS2', 'CHAdeMO', 'Type 2 AC'],
    pricingUrl: 'https://www.chargefox.com/pricing',
    pricingNote: 'Annual membership available; tap-to-pay at all stations',
    membershipRequired: false,
    appRequired: false,
    paymentOptions: ['Tap & pay (Visa/MC)', 'App', 'RFID card'],
    stationCount: '~1,400+ stations',
    coverage: 'Nationwide — metro + interstate corridors',
    website: 'chargefox.com',
    ok: true,
    note: "Australia's largest network. Ultra-rapid 350 kW stations on major highways; standard 22–50 kW in car parks.",
  },
  {
    name: 'Evie Networks',
    type: 'DC',
    maxSpeed: '350 kW DC',
    connectors: ['CCS2', 'CHAdeMO'],
    pricingUrl: 'https://www.evie.com.au/pricing',
    pricingNote: 'No membership required; tap-to-pay everywhere',
    membershipRequired: false,
    appRequired: false,
    paymentOptions: ['Tap & pay (Visa/MC)', 'App'],
    stationCount: '~450+ stations',
    coverage: 'Metro + regional highways',
    website: 'evie.com.au',
    ok: true,
    note: 'Premium 350 kW hardware at most sites. Tap-to-pay everywhere — no app needed. Growing fast outside capital cities.',
  },
  {
    name: 'NRMA EV',
    type: 'DC',
    maxSpeed: '150 kW DC',
    connectors: ['CCS2', 'CHAdeMO'],
    pricingUrl: 'https://www.mynrma.com.au/electric-vehicles/ev-charging',
    pricingNote: 'NRMA members may receive discounts',
    membershipRequired: false,
    appRequired: false,
    paymentOptions: ['Tap & pay (Visa/MC)', 'App', 'NRMA membership card'],
    stationCount: '~300+ stations',
    coverage: 'NSW, ACT, QLD — highway focus',
    website: 'mynrma.com.au/electric-vehicles/ev-charging',
    ok: true,
    note: 'Dense coverage along NSW coastal corridors and inland routes. 150 kW standard with some 350 kW sites.',
  },
  {
    name: 'BP Pulse',
    type: 'Both',
    maxSpeed: '150 kW DC',
    connectors: ['CCS2', 'Type 2 AC'],
    pricingUrl: 'https://www.bp.com/en_au/australia/home/ev-charging.html',
    pricingNote: 'BPme Rewards integration',
    membershipRequired: false,
    appRequired: false,
    paymentOptions: ['Tap & pay', 'BPme app'],
    stationCount: '~200+ stations',
    coverage: 'Metro areas, major BP service stations',
    website: 'bp.com/en_au/australia/home/ev-charging.html',
    ok: true,
    note: 'Convenient at existing BP service stations. Mix of 50 kW and 150 kW DC plus 22 kW AC.',
  },
  {
    name: 'Tesla Supercharger',
    type: 'DC',
    maxSpeed: '250 kW DC',
    connectors: ['CCS2 (V3+)', 'Tesla proprietary (older V2)'],
    pricingUrl: 'https://www.tesla.com/en_AU/support/supercharging',
    pricingNote: 'Requires Tesla app account even for non-Tesla vehicles',
    membershipRequired: false,
    appRequired: true,
    paymentOptions: ['Tesla app (credit card)'],
    stationCount: '~120+ stations',
    coverage: 'Capital cities + some highway corridors',
    website: 'tesla.com/en_AU/findus/list/superchargers/Australia',
    ok: false,
    note: 'V3 Superchargers support CCS2 for non-Tesla EVs. Requires Tesla app setup. V2 stations (older, black pillar) are Tesla-only.',
  },
  {
    name: 'Jolt',
    type: 'AC',
    maxSpeed: '7 kW AC',
    connectors: ['Type 2 AC'],
    pricingUrl: 'https://www.jolt.com.au/pricing',
    pricingNote: 'Some free daily allowance; check app for current rates',
    membershipRequired: false,
    appRequired: true,
    paymentOptions: ['Jolt app'],
    stationCount: '~600+ bays',
    coverage: 'Metro areas — shopping centres, offices',
    website: 'jolt.com.au',
    ok: true,
    note: 'Slow AC charging — best for top-ups while shopping. Free daily allowance available via app.',
  },
]

export const UK_CHARGING_NETWORKS: ChargingNetwork[] = [
  {
    name: 'Pod Point',
    type: 'Both',
    maxSpeed: '150 kW DC',
    connectors: ['CCS2', 'Type 2 AC'],
    pricingUrl: 'https://pod-point.com/guides/driver/ev-charging-costs',
    pricingNote: 'Prices vary by site; some free at supermarkets (Tesco, Lidl)',
    membershipRequired: false,
    appRequired: false,
    paymentOptions: ['Tap & pay', 'App'],
    stationCount: '~10,000+ points',
    coverage: 'Nationwide — supermarkets, car parks, workplaces',
    website: 'pod-point.com',
    ok: true,
    note: 'Ubiquitous at Tesco and Lidl stores — often free while shopping. Reliable 7–22 kW AC at most sites.',
  },
  {
    name: 'Osprey',
    type: 'DC',
    maxSpeed: '150 kW DC',
    connectors: ['CCS2', 'CHAdeMO'],
    pricingUrl: 'https://ospreycharging.co.uk/pricing',
    membershipRequired: false,
    appRequired: false,
    paymentOptions: ['Tap & pay', 'App', 'RFID'],
    stationCount: '~350+ stations',
    coverage: 'England and Wales — motorway services + retail',
    website: 'ospreycharging.co.uk',
    ok: true,
    note: '150 kW rapid chargers at motorway service areas. Contactless payment everywhere.',
  },
  {
    name: 'Gridserve',
    type: 'Both',
    maxSpeed: '350 kW DC',
    connectors: ['CCS2', 'CHAdeMO', 'Type 2 AC'],
    pricingUrl: 'https://gridserve.com/electric-highway/pricing',
    pricingNote: 'Shell Recharge partnership at many sites',
    membershipRequired: false,
    appRequired: false,
    paymentOptions: ['Tap & pay', 'App'],
    stationCount: '~100+ Electric Highway locations',
    coverage: 'Motorways nationwide (former Ecotricity network)',
    website: 'gridserve.com',
    ok: true,
    note: 'Premium hubs at motorway services. Replaced Ecotricity on UK motorways — much better hardware and reliability.',
  },
  {
    name: 'Tesla Supercharger',
    type: 'DC',
    maxSpeed: '250 kW DC',
    connectors: ['CCS2 (V3+)', 'Tesla proprietary'],
    pricingUrl: 'https://www.tesla.com/en_GB/support/supercharging',
    pricingNote: 'Requires Tesla app even for non-Tesla',
    membershipRequired: false,
    appRequired: true,
    paymentOptions: ['Tesla app'],
    stationCount: '~150+ stations',
    coverage: 'Major cities + motorway corridors',
    website: 'tesla.com/en_GB/findus/list/superchargers/United+Kingdom',
    ok: false,
    note: 'CCS2 access available on V3+ sites. App setup required. Premium speed but restricted hardware at older sites.',
  },
]

// Prices are approximate and may have changed. Verify with retailer before purchasing.
// Data last reviewed: May 2025
export const HOME_CHARGER_DATA_NOTE = 'Prices are approximate (AUD inc. GST) and may vary by retailer. Verify before purchasing.'

export const HOME_CHARGER_MODELS: EVSEProduct[] = [
  {
    name: 'Wallbox Pulsar Plus',
    brand: 'Wallbox',
    type: '7.2kW',
    price: 'approx. A$800–$1,100',
    features: [
      'Bluetooth + WiFi app control',
      'Scheduled charging',
      'Load balancing capable',
      'Compact form factor',
      'OCPP compatible',
    ],
    compatible: true,
    note: 'Widely available in AU. Compact, reliable app. Single-phase 7.4 kW suits most Chinese EVs.',
  },
  {
    name: 'Zappi v2',
    brand: 'myenergi',
    type: '7.2kW',
    price: 'approx. A$1,200–$1,600',
    features: [
      'Solar-smart charging',
      'Diverts excess solar to car',
      'Eco / Eco+ / Fast modes',
      'CT clamp solar integration',
      'No hub required for basic use',
    ],
    compatible: true,
    note: 'Best choice if you have rooftop solar. Charges automatically from surplus solar generation.',
  },
  {
    name: 'EVNEX E2',
    brand: 'EVNEX',
    type: '7.2kW',
    price: 'approx. A$700–$950',
    features: [
      'Australian & NZ market focus',
      'App control + scheduling',
      'Smart load management',
      'IP66 weatherproof',
      'Local support & warranty',
    ],
    compatible: true,
    note: 'EVNEX is a NZ-founded brand with strong AU presence. Good option for straightforward home install with local after-sales support.',
  },
  {
    name: 'Charge Amps Aura',
    brand: 'Charge Amps',
    type: '11kW',
    price: 'approx. A$1,100–$1,400',
    features: [
      '3-phase 11 kW (BYD Seal U, MG4 Pro)',
      'RFID card included',
      'Smart load balancing',
      'Built-in Type 2 cable',
      'Slim wall-mount design',
    ],
    compatible: true,
    note: 'Worth considering if your vehicle supports 11 kW AC (BYD Seal U, MG4 Pro). Reduces full-charge time by ~30% vs 7.4 kW.',
  },
]

export interface HomeChargerFAQ {
  q: string
  a: string
}

export const HOME_CHARGER_FAQ: HomeChargerFAQ[] = [
  {
    q: 'Do I need a Level 2 home charger, or can I use the cable that came with my car?',
    a: 'The included "granny cable" (Mode 2, 10A/2.4 kW) works fine for overnight charging if you drive under ~80 km/day. A dedicated Level 2 wallbox (7.4 kW) charges 3× faster and is recommended if you regularly need a full charge overnight or drive more than 100 km/day.',
  },
  {
    q: 'What does installation cost in Australia?',
    a: 'A straightforward install (meter board within 5–10 m, single-phase, no switchboard upgrade) runs A$400–$700 including materials. Longer cable runs, 3-phase, or switchboard upgrades add $200–$800. Total installed cost is typically A$1,200–$2,000 for a quality wallbox + installation.',
  },
  {
    q: 'Do I need a licensed electrician?',
    a: 'Yes — Australian law (AS/NZS 3000 wiring rules) requires a licensed electrician for all EV charger installations. Do not use an unlicensed installer; it voids the product warranty and your home insurance.',
  },
  {
    q: 'Can I charge from solar panels?',
    a: 'Yes. A solar-smart charger like the Zappi can detect your solar generation and charge only from excess energy, effectively giving you near-free charging during the day. Your solar inverter needs to support this, or you can use a current transformer (CT) clamp.',
  },
  {
    q: 'Is a 3-phase charger worth it?',
    a: 'Only if your vehicle supports 3-phase AC charging. The BYD Seal U and MG4 Pro accept 11 kW (3-phase), cutting charge time to ~8 hrs for a full charge. The BYD Atto 3 and Dolphin are single-phase only (7.4 kW max), so a 3-phase wallbox gives no benefit.',
  },
]

export const HOME_CHARGER_INSTALL_STEPS = [
  {
    step: 1,
    title: 'Check your switchboard',
    body: 'Confirm you have a spare 32A circuit breaker slot (single-phase) or 16A per phase (3-phase). If your switchboard is old or full, budget for an upgrade (~$300–$600 extra).',
  },
  {
    step: 2,
    title: 'Choose your charger',
    body: 'Match the charger type to your vehicle\'s on-board charger capacity. Most Chinese EVs accept 7.4 kW max AC. BYD Seal U and MG4 Pro accept 11 kW.',
  },
  {
    step: 3,
    title: 'Get 2–3 quotes',
    body: 'Use a Clean Energy Council (CEC) accredited electrician. Check NECA, Master Electricians, or ask your EV dealer for a recommended installer. Quotes should include charger hardware, installation labour, and any switchboard work.',
  },
  {
    step: 4,
    title: 'Check government rebates',
    body: 'Some states offer EV charger rebates: Victoria (up to $600 via Solar Victoria), ACT, NSW CESS. Check before purchasing — some require specific approved charger models.',
  },
  {
    step: 5,
    title: 'Installation day',
    body: 'Typically takes 2–4 hours. The electrician runs dedicated cable from your switchboard, installs the wallbox (usually garage wall), and tests the circuit. You\'ll receive a Certificate of Compliance.',
  },
]
