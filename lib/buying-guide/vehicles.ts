// lib/buying-guide/vehicles.ts

export type Vehicle = {
  brand: string
  model: string
  variant: string
  msrp: number          // 澳元，含 GST，不含上路费用
  eligible_fbt: boolean // 纯电 BEV = true，PHEV = false（2025年4月1日起）
}

export const AU_VEHICLES: Vehicle[] = [
  // BYD
  { brand: 'BYD', model: 'Atto 3', variant: 'Standard Range', msrp: 44990, eligible_fbt: true },
  { brand: 'BYD', model: 'Atto 3', variant: 'Extended Range', msrp: 47990, eligible_fbt: true },
  { brand: 'BYD', model: 'Dolphin', variant: 'Standard', msrp: 38990, eligible_fbt: true },
  { brand: 'BYD', model: 'Dolphin', variant: 'Extended Range', msrp: 42990, eligible_fbt: true },
  { brand: 'BYD', model: 'Seal', variant: 'Dynamic RWD', msrp: 54990, eligible_fbt: true },
  { brand: 'BYD', model: 'Seal', variant: 'Premium RWD', msrp: 59990, eligible_fbt: true },
  { brand: 'BYD', model: 'Seal', variant: 'Performance AWD', msrp: 69990, eligible_fbt: true },
  { brand: 'BYD', model: 'Sealion 6', variant: 'PHEV', msrp: 54990, eligible_fbt: false },
  // MG
  { brand: 'MG', model: 'MG4', variant: 'Excite 51kWh', msrp: 34990, eligible_fbt: true },
  { brand: 'MG', model: 'MG4', variant: 'Excite 64kWh', msrp: 38990, eligible_fbt: true },
  { brand: 'MG', model: 'MG4', variant: 'Essence 64kWh', msrp: 44990, eligible_fbt: true },
  { brand: 'MG', model: 'MG4', variant: 'XPOWER AWD', msrp: 54990, eligible_fbt: true },
  { brand: 'MG', model: 'ZS EV', variant: 'Excite', msrp: 39990, eligible_fbt: true },
  // GWM
  { brand: 'GWM', model: 'Ora', variant: 'Standard Range', msrp: 39990, eligible_fbt: true },
  { brand: 'GWM', model: 'Ora', variant: 'Extended Range', msrp: 44990, eligible_fbt: true },
]

/** 返回所有品牌名（去重，保持顺序） */
export function getBrands(): string[] {
  const seen = new Set<string>()
  const brands: string[] = []
  for (const vehicle of AU_VEHICLES) {
    if (!seen.has(vehicle.brand)) {
      seen.add(vehicle.brand)
      brands.push(vehicle.brand)
    }
  }
  return brands
}

/** 返回指定品牌下的所有车型变体 */
export function getVehiclesByBrand(brand: string): Vehicle[] {
  return AU_VEHICLES.filter(v => v.brand === brand)
}
