export type ClimateZone = 'temperate' | 'hot_arid' | 'cold'
export type DriveSide = 'LHD' | 'RHD' | 'Both'
export type Severity = 'INFO' | 'WARNING' | 'CRITICAL'
export type DataConfidence = 'official' | 'community' | 'ai_generated'
export type VehicleType = 'BEV' | 'PHEV' | 'HEV' | 'ICE'
export type ContentType = 'dtc' | 'software_update' | 'service_cost' | 'reliability' | 'climate'
export type UpdateMethod = 'OTA' | 'dealer_only' | 'usb'

export interface Market {
  market_code: string
  country_name: string
  currency: string
  drive_side: DriveSide | null
  climate_zone: ClimateZone | null
  active: boolean
}

export interface Brand {
  brand_id: string
  brand_name_en: string
  brand_name_cn: string | null
  logo_url: string | null
}

export interface Model {
  model_id: string
  brand_id: string
  model_name: string
  vehicle_type: VehicleType | null
  years: string | null
  steering: DriveSide | null
  slug: string
}

export interface DTC {
  dtc_id: number
  dtc_code: string
  dtc_type: string
  description_en: string
  severity: Severity | null
  related_system: string | null
  safety_warning: string | null
}

export interface ActionStep {
  title: string
  body: string
}

export interface DTCModelNote {
  id: number
  dtc_id: number
  model_id: string
  market_code: string | null
  likely_causes: string[] | null
  suggested_actions: ActionStep[] | null
  climate_notes: string | null
  data_confidence: DataConfidence
  source_urls: string[] | null
  created_at: string
  updated_at: string
}

export interface SoftwareUpdate {
  update_id: number
  model_id: string
  market_code: string | null
  version: string
  release_date: string | null
  update_method: UpdateMethod | null
  changelog_en: string | null
  source_url: string | null
  data_confidence: DataConfidence
  created_at: string
}

export interface ServiceCost {
  cost_id: number
  model_id: string
  market_code: string | null
  service_type: string
  cost_min: number | null
  cost_max: number | null
  currency: string | null
  is_dealer_only: boolean
  notes: string | null
  source_url: string | null
  data_confidence: DataConfidence
  created_at: string
}

export interface Dealer {
  dealer_id: number
  brand_id: string
  market_code: string
  city: string | null
  state_province: string | null
  name: string
  address: string | null
  phone: string | null
  hours: string | null
  is_authorised: boolean
  last_verified: string | null
  created_at: string
}

export interface Case {
  case_id: number
  model_id: string
  market_code: string | null
  content_type: ContentType
  source_type: string
  source_name: string
  source_url: string | null
  source_language: string
  location: string | null
  report_date: string | null
  vehicle_desc: string | null
  symptom_summary: string
  resolution: string | null
  cost_info: string | null
  confidence: DataConfidence
  translated_by: string | null
  created_at: string
}

export interface CaseMedia {
  media_id: number
  case_id: number
  media_type: 'image' | 'video_embed' | 'diagram'
  media_url: string
  caption: string | null
  source_attribution: string | null
  display_order: number
}

export type CanDrive = 'yes' | 'no' | 'caution'

export interface WarningLight {
  id: number
  brand_id: string
  model_id: string | null
  slug: string | null
  category: string
  name_en: string
  name_cn: string | null
  severity: Severity | null
  description_en: string | null
  causes: string[] | null
  can_drive: CanDrive | null
  action_en: string | null
}

export interface WarningLightWithDtcs extends WarningLight {
  dtcs: { dtc_id: number; dtc_code: string; description_en: string }[]
}
