/**
 * 车型技术规格配置
 * 用于 charging 和 service 页面的车型特定信息
 */

export interface ChargingSpec {
  batteryCapacity: string      // e.g., "60.5 kWh"
  acChargePower: string         // e.g., "7.4 kW"
  dcChargePower: string         // e.g., "80 kW peak"
  chargingPort: string          // e.g., "CCS2"
  range: string                 // e.g., "420 km (WLTP)"
  // Charge times
  acTime_20_80: string          // e.g., "~4-5 hrs"
  acTime_full: string           // e.g., "~8-10 hrs"
  dcTime_20_80: string          // e.g., "~30-40 min"
  dcTime_full: string           // e.g., "~50-60 min"
}

export interface ServiceSpec {
  serviceInterval: string       // e.g., "12 months / 20,000 km"
  warrantyVehicle: string       // e.g., "6 years / 150,000 km"
  warrantyBattery: string       // e.g., "8 years / 160,000 km"
  brakeFluidInterval: string    // e.g., "24 months"
  cabinFilterInterval: string   // e.g., "12-24 months"
}

export const VEHICLE_SPECS: Record<string, {
  charging: ChargingSpec
  service: ServiceSpec
}> = {
  'byd-atto-8': {
    charging: {
      batteryCapacity: '90.3 kWh',
      acChargePower: '11 kW',
      dcChargePower: '110 kW peak',
      chargingPort: 'CCS2',
      range: '480 km (WLTP)',
      acTime_20_80: '~4-5 hrs',
      acTime_full: '~8-9 hrs',
      dcTime_20_80: '~25-30 min',
      dcTime_full: '~45-55 min',
    },
    service: {
      serviceInterval: '12 months / 20,000 km',
      warrantyVehicle: '6 years / 150,000 km',
      warrantyBattery: '8 years / 160,000 km',
      brakeFluidInterval: '24 months',
      cabinFilterInterval: '12-24 months',
    },
  },
  'byd-atto-3': {
    charging: {
      batteryCapacity: '60.5 kWh',
      acChargePower: '7.4 kW',
      dcChargePower: '80 kW peak',
      chargingPort: 'CCS2',
      range: '420 km (WLTP)',
      acTime_20_80: '~4-5 hrs',
      acTime_full: '~8-10 hrs',
      dcTime_20_80: '~30-40 min',
      dcTime_full: '~50-60 min',
    },
    service: {
      serviceInterval: '12 months / 20,000 km',
      warrantyVehicle: '6 years / 150,000 km',
      warrantyBattery: '8 years / 160,000 km',
      brakeFluidInterval: '24 months',
      cabinFilterInterval: '12-24 months',
    },
  },
  'byd-dolphin': {
    charging: {
      batteryCapacity: '60.5 kWh',
      acChargePower: '7.4 kW',
      dcChargePower: '60 kW peak',
      chargingPort: 'CCS2',
      range: '427 km (WLTP)',
      acTime_20_80: '~4-5 hrs',
      acTime_full: '~8-10 hrs',
      dcTime_20_80: '~35-45 min',
      dcTime_full: '~60-70 min',
    },
    service: {
      serviceInterval: '12 months / 20,000 km',
      warrantyVehicle: '6 years / 150,000 km',
      warrantyBattery: '8 years / 160,000 km',
      brakeFluidInterval: '24 months',
      cabinFilterInterval: '12-24 months',
    },
  },
  'byd-qin-plus': {
    charging: {
      batteryCapacity: '71.8 kWh',
      acChargePower: '7.4 kW',
      dcChargePower: '80 kW peak',
      chargingPort: 'CCS2',
      range: '420 km (WLTP)',
      acTime_20_80: '~5-6 hrs',
      acTime_full: '~10-11 hrs',
      dcTime_20_80: '~35-40 min',
      dcTime_full: '~55-65 min',
    },
    service: {
      serviceInterval: '12 months / 20,000 km',
      warrantyVehicle: '6 years / 150,000 km',
      warrantyBattery: '8 years / 160,000 km',
      brakeFluidInterval: '24 months',
      cabinFilterInterval: '12-24 months',
    },
  },
  'mg-mg4': {
    charging: {
      batteryCapacity: '64 kWh',
      acChargePower: '11 kW',
      dcChargePower: '88 kW peak',
      chargingPort: 'CCS2',
      range: '450 km (WLTP)',
      acTime_20_80: '~3-4 hrs',
      acTime_full: '~6-7 hrs',
      dcTime_20_80: '~30-35 min',
      dcTime_full: '~45-55 min',
    },
    service: {
      serviceInterval: '12 months / 20,000 km',
      warrantyVehicle: '7 years / 175,000 km',
      warrantyBattery: '7 years / 175,000 km',
      brakeFluidInterval: '24 months',
      cabinFilterInterval: '12 months',
    },
  },
  'mg-zs-ev': {
    charging: {
      batteryCapacity: '72.6 kWh',
      acChargePower: '11 kW',
      dcChargePower: '76 kW peak',
      chargingPort: 'CCS2',
      range: '440 km (WLTP)',
      acTime_20_80: '~4-5 hrs',
      acTime_full: '~7-8 hrs',
      dcTime_20_80: '~35-40 min',
      dcTime_full: '~55-65 min',
    },
    service: {
      serviceInterval: '12 months / 20,000 km',
      warrantyVehicle: '7 years / 175,000 km',
      warrantyBattery: '7 years / 175,000 km',
      brakeFluidInterval: '24 months',
      cabinFilterInterval: '12 months',
    },
  },
  'byd-seal-u': {
    charging: {
      batteryCapacity: '87 kWh',
      acChargePower: '11 kW',
      dcChargePower: '150 kW peak',
      chargingPort: 'CCS2',
      range: '500 km (WLTP)',
      acTime_20_80: '~4-5 hrs',
      acTime_full: '~8-9 hrs',
      dcTime_20_80: '~25-30 min',
      dcTime_full: '~40-50 min',
    },
    service: {
      serviceInterval: '12 months / 20,000 km',
      warrantyVehicle: '6 years / 150,000 km',
      warrantyBattery: '8 years / 160,000 km',
      brakeFluidInterval: '24 months',
      cabinFilterInterval: '12-24 months',
    },
  },
  'byd-seal-6-ev': {
    charging: {
      batteryCapacity: '82.56 kWh',
      acChargePower: '11 kW',
      dcChargePower: '150 kW peak',
      chargingPort: 'CCS2',
      range: '520 km (WLTP)',
      acTime_20_80: '~4-5 hrs',
      acTime_full: '~8-9 hrs',
      dcTime_20_80: '~20-25 min',
      dcTime_full: '~35-45 min',
    },
    service: {
      serviceInterval: '12 months / 20,000 km',
      warrantyVehicle: '6 years / 150,000 km',
      warrantyBattery: '8 years / 160,000 km',
      brakeFluidInterval: '24 months',
      cabinFilterInterval: '12-24 months',
    },
  },
}
