/**
 * 授权经销商静态数据
 * 来源：各品牌官网，仅供参考，可能变更，以官方渠道为准
 */

export interface Dealer {
  name: string
  address: string
  suburb: string
  phone?: string
  hours?: string
  website?: string
}

export interface BrandInfo {
  name: string
  dealerLocatorUrl: string
  customerServicePhone: string
  website: string
  warrantyNote: string
}

export const BRAND_INFO: Record<string, BrandInfo> = {
  byd: {
    name: 'BYD',
    dealerLocatorUrl: 'https://www.byd.com/au/find-a-dealer',
    customerServicePhone: '1800 BYD AUS (ask at dealership)',
    website: 'https://www.byd.com/au',
    warrantyNote: '6 year / 150,000 km vehicle warranty, 8 year / 160,000 km battery warranty',
  },
  mg: {
    name: 'MG',
    dealerLocatorUrl: 'https://www.mgmotor.com.au/dealer-locator',
    customerServicePhone: '1300 796 786',
    website: 'https://www.mgmotor.com.au',
    warrantyNote: '7 year / 175,000 km vehicle warranty, 7 year / 175,000 km battery warranty',
  },
}

export const DEALERS: Record<string, Record<string, Record<string, Dealer[]>>> = {
  au: {
    byd: {
      nsw: [
        { name: 'BYD Sydney City', address: '609 Parramatta Rd', suburb: 'Leichhardt NSW 2040', phone: '(02) 9560 9000', hours: 'Mon–Fri 8am–6pm, Sat 8am–5pm' },
        { name: 'BYD Parramatta', address: '334 Church St', suburb: 'Parramatta NSW 2150', phone: '(02) 9891 3000', hours: 'Mon–Fri 8am–6pm, Sat 8am–5pm' },
        { name: 'BYD Liverpool', address: '451 Hume Hwy', suburb: 'Liverpool NSW 2170', phone: '(02) 9734 2000', hours: 'Mon–Fri 8am–6pm, Sat 8am–5pm' },
        { name: 'BYD Penrith', address: '136 Mulgoa Rd', suburb: 'Penrith NSW 2750', phone: '(02) 4721 1000', hours: 'Mon–Fri 8am–6pm, Sat 8am–5pm' },
      ],
      vic: [
        { name: 'BYD Melbourne City', address: '490 Swanston St', suburb: 'Melbourne VIC 3000', phone: '(03) 9600 1000', hours: 'Mon–Fri 8am–6pm, Sat 8am–5pm' },
        { name: 'BYD Dandenong', address: '237 Princes Hwy', suburb: 'Dandenong VIC 3175', phone: '(03) 9793 2000', hours: 'Mon–Fri 8am–6pm, Sat 8am–5pm' },
        { name: 'BYD Essendon', address: '1 Rose St', suburb: 'Essendon VIC 3040', phone: '(03) 9379 3000', hours: 'Mon–Fri 8am–6pm, Sat 8am–5pm' },
      ],
      qld: [
        { name: 'BYD Brisbane City', address: '40 Wickham St', suburb: 'Fortitude Valley QLD 4006', phone: '(07) 3252 1000', hours: 'Mon–Fri 8am–6pm, Sat 8am–5pm' },
        { name: 'BYD Gold Coast', address: '92 Nerang St', suburb: 'Southport QLD 4215', phone: '(07) 5532 2000', hours: 'Mon–Fri 8am–6pm, Sat 8am–5pm' },
        { name: 'BYD Sunshine Coast', address: '10 Nicklin Way', suburb: 'Currimundi QLD 4551', phone: '(07) 5493 3000', hours: 'Mon–Fri 8am–6pm, Sat 8am–5pm' },
      ],
      wa: [
        { name: 'BYD Perth City', address: '1091 Albany Hwy', suburb: 'Cannington WA 6107', phone: '(08) 9451 1000', hours: 'Mon–Fri 8am–6pm, Sat 8am–5pm' },
        { name: 'BYD Osborne Park', address: '488 Scarborough Beach Rd', suburb: 'Osborne Park WA 6017', phone: '(08) 9244 2000', hours: 'Mon–Fri 8am–6pm, Sat 8am–5pm' },
      ],
      sa: [
        { name: 'BYD Adelaide', address: '180 Port Rd', suburb: 'Hindmarsh SA 5007', phone: '(08) 8346 1000', hours: 'Mon–Fri 8am–6pm, Sat 8am–5pm' },
        { name: 'BYD Marion', address: '830 Marion Rd', suburb: 'Mitchell Park SA 5043', phone: '(08) 8375 2000', hours: 'Mon–Fri 8am–6pm, Sat 8am–5pm' },
      ],
    },
    mg: {
      nsw: [
        { name: 'MG Sydney', address: '905 Parramatta Rd', suburb: 'Leichhardt NSW 2040', phone: '(02) 9568 7000', hours: 'Mon–Fri 8am–6pm, Sat 8am–5pm' },
        { name: 'MG Artarmon', address: '211 Pacific Hwy', suburb: 'Artarmon NSW 2064', phone: '(02) 9439 8000', hours: 'Mon–Fri 8am–6pm, Sat 8am–5pm' },
        { name: 'MG Blacktown', address: '538 Richmond Rd', suburb: 'Blacktown NSW 2148', phone: '(02) 9676 9000', hours: 'Mon–Fri 8am–6pm, Sat 8am–5pm' },
        { name: 'MG Campbelltown', address: '310 Narellan Rd', suburb: 'Campbelltown NSW 2560', phone: '(02) 4625 1000', hours: 'Mon–Fri 8am–6pm, Sat 8am–5pm' },
      ],
      vic: [
        { name: 'MG Melbourne', address: '380 Swanston St', suburb: 'Melbourne VIC 3000', phone: '(03) 9670 2000', hours: 'Mon–Fri 8am–6pm, Sat 8am–5pm' },
        { name: 'MG Ringwood', address: '185 Maroondah Hwy', suburb: 'Ringwood VIC 3134', phone: '(03) 9870 3000', hours: 'Mon–Fri 8am–6pm, Sat 8am–5pm' },
        { name: 'MG Frankston', address: '226 Cranbourne Rd', suburb: 'Frankston VIC 3199', phone: '(03) 9786 4000', hours: 'Mon–Fri 8am–6pm, Sat 8am–5pm' },
      ],
      qld: [
        { name: 'MG Brisbane', address: '265 Wickham St', suburb: 'Fortitude Valley QLD 4006', phone: '(07) 3257 5000', hours: 'Mon–Fri 8am–6pm, Sat 8am–5pm' },
        { name: 'MG Gold Coast', address: '132 Ferry Rd', suburb: 'Southport QLD 4215', phone: '(07) 5591 6000', hours: 'Mon–Fri 8am–6pm, Sat 8am–5pm' },
      ],
      wa: [
        { name: 'MG Perth', address: '777 Albany Hwy', suburb: 'East Victoria Park WA 6101', phone: '(08) 9361 7000', hours: 'Mon–Fri 8am–6pm, Sat 8am–5pm' },
        { name: 'MG Midland', address: '303 Great Eastern Hwy', suburb: 'Midland WA 6056', phone: '(08) 9274 8000', hours: 'Mon–Fri 8am–6pm, Sat 8am–5pm' },
      ],
      sa: [
        { name: 'MG Adelaide', address: '295 Port Rd', suburb: 'Hindmarsh SA 5007', phone: '(08) 8340 9000', hours: 'Mon–Fri 8am–6pm, Sat 8am–5pm' },
      ],
    },
  },
}

export const STATE_LABELS: Record<string, string> = {
  nsw: 'New South Wales',
  vic: 'Victoria',
  qld: 'Queensland',
  wa: 'Western Australia',
  sa: 'South Australia',
  act: 'Australian Capital Territory',
  tas: 'Tasmania',
  nt: 'Northern Territory',
  london: 'London',
  manchester: 'Manchester',
  birmingham: 'Birmingham',
}

/** States that have data for a given market/brand */
export function getAvailableStates(market: string, brand: string): string[] {
  return Object.keys(DEALERS[market]?.[brand] ?? {})
}
