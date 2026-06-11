import {
  mysqlTable,
  varchar,
  text,
  boolean,
  int,
  decimal,
  serial,
  timestamp,
  json,
  primaryKey,
  index,
} from 'drizzle-orm/mysql-core'

// ─── 市场配置表 ───────────────────────────────────────────────────────────────
export const markets = mysqlTable('mf_nv_markets', {
  market_code: varchar('market_code', { length: 10 }).primaryKey(),
  country_name: varchar('country_name', { length: 100 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull(),
  drive_side: varchar('drive_side', { length: 5 }),   // RHD | LHD
  climate_zone: varchar('climate_zone', { length: 20 }), // temperate | hot_arid | cold
  active: boolean('active').default(false),
})

// ─── 品牌表 ──────────────────────────────────────────────────────────────────
export const brands = mysqlTable('mf_nv_brands', {
  brand_id: varchar('brand_id', { length: 50 }).primaryKey(),
  brand_name_en: varchar('brand_name_en', { length: 100 }).notNull(),
  brand_name_cn: varchar('brand_name_cn', { length: 100 }),
  logo_url: text('logo_url'),
})

// ─── 车型表 ──────────────────────────────────────────────────────────────────
export const models = mysqlTable('mf_nv_models', {
  model_id: varchar('model_id', { length: 100 }).primaryKey(),
  brand_id: varchar('brand_id', { length: 50 }).references(() => brands.brand_id),
  model_name: varchar('model_name', { length: 100 }).notNull(),
  vehicle_type: varchar('vehicle_type', { length: 10 }), // BEV|PHEV|HEV|ICE
  years: varchar('years', { length: 20 }),
  steering: varchar('steering', { length: 5 }),           // LHD|RHD|Both
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  range_km: int('range_km'),
  battery_kwh: decimal('battery_kwh', { precision: 5, scale: 1 }),
  acceleration_0_100: decimal('acceleration_0_100', { precision: 4, scale: 1 }),
  charge_ac_kw: decimal('charge_ac_kw', { precision: 4, scale: 1 }),
  charge_dc_kw: decimal('charge_dc_kw', { precision: 4, scale: 1 }),
  cargo_l: int('cargo_l'),
})

// ─── 故障码表 ─────────────────────────────────────────────────────────────────
export const dtcs = mysqlTable('mf_nv_dtcs', {
  dtc_id: serial('dtc_id').primaryKey(),
  dtc_code: varchar('dtc_code', { length: 20 }).notNull(),
  dtc_type: varchar('dtc_type', { length: 20 }).default('STANDARD'), // STANDARD|MANUFACTURER|PROPRIETARY
  description_en: text('description_en').notNull(),
  severity: varchar('severity', { length: 10 }),   // INFO|WARNING|CRITICAL
  related_system: varchar('related_system', { length: 100 }),
  safety_warning: text('safety_warning'),
}, (t) => [
  index('idx_mf_nv_dtcs_code').on(t.dtc_code),
])

// ─── 故障码-车型关联表 ────────────────────────────────────────────────────────
export const dtcModelNotes = mysqlTable('mf_nv_dtc_model_notes', {
  id: serial('id').primaryKey(),
  dtc_id: int('dtc_id').references(() => dtcs.dtc_id),
  model_id: varchar('model_id', { length: 100 }).references(() => models.model_id),
  market_code: varchar('market_code', { length: 10 }).references(() => markets.market_code),
  likely_causes: json('likely_causes'),      // string[]
  suggested_actions: json('suggested_actions'), // string[]
  climate_notes: text('climate_notes'),
  data_confidence: varchar('data_confidence', { length: 20 }).default('community'),
  source_urls: json('source_urls'),          // string[]
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (t) => [
  index('idx_mf_nv_dmn_dtc_id').on(t.dtc_id),
  index('idx_mf_nv_dmn_model_id').on(t.model_id),
])

// ─── 软件更新追踪表 ───────────────────────────────────────────────────────────
export const softwareUpdates = mysqlTable('mf_nv_software_updates', {
  update_id: serial('update_id').primaryKey(),
  model_id: varchar('model_id', { length: 100 }).references(() => models.model_id),
  market_code: varchar('market_code', { length: 10 }).references(() => markets.market_code),
  version: varchar('version', { length: 50 }).notNull(),
  release_date: varchar('release_date', { length: 30 }),
  update_method: varchar('update_method', { length: 20 }), // OTA|dealer_only|usb
  changelog_en: text('changelog_en'),
  source_url: text('source_url'),
  data_confidence: varchar('data_confidence', { length: 20 }).default('community'),
  created_at: timestamp('created_at').defaultNow(),
}, (t) => [
  index('idx_mf_nv_su_model_id').on(t.model_id),
])

// ─── 服务费用表 ───────────────────────────────────────────────────────────────
export const serviceCosts = mysqlTable('mf_nv_service_costs', {
  cost_id: serial('cost_id').primaryKey(),
  model_id: varchar('model_id', { length: 100 }).references(() => models.model_id),
  market_code: varchar('market_code', { length: 10 }).references(() => markets.market_code),
  service_type: varchar('service_type', { length: 100 }).notNull(),
  cost_min: int('cost_min'),
  cost_max: int('cost_max'),
  currency: varchar('currency', { length: 10 }),
  is_dealer_only: boolean('is_dealer_only').default(false),
  notes: text('notes'),
  source_url: text('source_url'),
  data_confidence: varchar('data_confidence', { length: 20 }).default('community'),
  created_at: timestamp('created_at').defaultNow(),
})

// ─── 经销商/服务网点表 ────────────────────────────────────────────────────────
export const dealers = mysqlTable('mf_nv_dealers', {
  dealer_id: serial('dealer_id').primaryKey(),
  brand_id: varchar('brand_id', { length: 50 }).references(() => brands.brand_id),
  market_code: varchar('market_code', { length: 10 }).references(() => markets.market_code),
  city: varchar('city', { length: 100 }),
  state_province: varchar('state_province', { length: 100 }),
  name: varchar('name', { length: 200 }).notNull(),
  address: text('address'),
  phone: varchar('phone', { length: 50 }),
  hours: varchar('hours', { length: 200 }),
  is_authorised: boolean('is_authorised').default(true),
  last_verified: varchar('last_verified', { length: 20 }),
  created_at: timestamp('created_at').defaultNow(),
}, (t) => [
  index('idx_mf_nv_dealers_brand_market').on(t.brand_id, t.market_code),
])

// ─── 案例表 ──────────────────────────────────────────────────────────────────
export const cases = mysqlTable('mf_nv_cases', {
  case_id: serial('case_id').primaryKey(),
  model_id: varchar('model_id', { length: 100 }).references(() => models.model_id),
  market_code: varchar('market_code', { length: 10 }).references(() => markets.market_code),
  content_type: varchar('content_type', { length: 30 }).default('dtc'),
  source_type: varchar('source_type', { length: 50 }).notNull(),
  source_name: varchar('source_name', { length: 100 }).notNull(),
  source_url: text('source_url'),
  source_language: varchar('source_language', { length: 10 }).default('en'),
  location: varchar('location', { length: 100 }),
  report_date: varchar('report_date', { length: 20 }),
  vehicle_desc: text('vehicle_desc'),
  symptom_summary: text('symptom_summary').notNull(),
  resolution: text('resolution'),
  cost_info: text('cost_info'),
  confidence: varchar('confidence', { length: 20 }).default('community'),
  translated_by: varchar('translated_by', { length: 50 }),
  created_at: timestamp('created_at').defaultNow(),
}, (t) => [
  index('idx_mf_nv_cases_model_id').on(t.model_id),
  index('idx_mf_nv_cases_content_type').on(t.content_type),
])

// ─── 案例-故障码关联表 ────────────────────────────────────────────────────────
export const caseDtcLinks = mysqlTable('mf_nv_case_dtc_links', {
  case_id: int('case_id').references(() => cases.case_id).notNull(),
  dtc_id: int('dtc_id').references(() => dtcs.dtc_id).notNull(),
}, (t) => [
  primaryKey({ columns: [t.case_id, t.dtc_id] }),
])

// ─── 案例媒体附件表 ───────────────────────────────────────────────────────────
export const caseMedia = mysqlTable('mf_nv_case_media', {
  media_id: serial('media_id').primaryKey(),
  case_id: int('case_id').references(() => cases.case_id),
  media_type: varchar('media_type', { length: 20 }).notNull(), // image|video_embed|diagram
  media_url: text('media_url').notNull(),
  caption: text('caption'),
  source_attribution: text('source_attribution'),
  display_order: int('display_order').default(0),
})

// ─── 待审队列表（数据采集 Pipeline 用） ────────────────────────────────────────
export const pendingCases = mysqlTable('mf_nv_pending_cases', {
  id: serial('id').primaryKey(),
  raw_content: text('raw_content').notNull(),
  source_platform: varchar('source_platform', { length: 100 }).notNull(),
  source_url: text('source_url'),
  ai_extracted: json('ai_extracted'),
  status: varchar('status', { length: 20 }).default('pending'), // pending|approved|rejected
  created_at: timestamp('created_at').defaultNow(),
})

export const pendingSoftwareUpdates = mysqlTable('mf_nv_pending_software_updates', {
  id: serial('id').primaryKey(),
  raw_content: text('raw_content').notNull(),
  source_platform: varchar('source_platform', { length: 100 }).notNull(),
  source_url: text('source_url'),
  ai_extracted: json('ai_extracted'),
  status: varchar('status', { length: 20 }).default('pending'),
  created_at: timestamp('created_at').defaultNow(),
})

export const pendingServiceCosts = mysqlTable('mf_nv_pending_service_costs', {
  id: serial('id').primaryKey(),
  model_slug: varchar('model_slug', { length: 100 }),
  market_code: varchar('market_code', { length: 10 }),
  service_type: varchar('service_type', { length: 100 }),
  cost_min: int('cost_min'),
  cost_max: int('cost_max'),
  currency: varchar('currency', { length: 10 }),
  city: varchar('city', { length: 100 }),
  is_dealer_only: boolean('is_dealer_only'),
  submitter_email: varchar('submitter_email', { length: 200 }),
  status: varchar('status', { length: 20 }).default('pending'),
  created_at: timestamp('created_at').defaultNow(),
})

// ─── 警告灯表 ──────────────────────────────────────────────────────────────────
export const warningLights = mysqlTable('mf_nv_warning_lights', {
  id: serial('id').primaryKey(),
  brand_id: varchar('brand_id', { length: 50 }).references(() => brands.brand_id).notNull(),
  model_id: varchar('model_id', { length: 100 }).references(() => models.model_id),
  slug: varchar('slug', { length: 100 }).unique(),   // e.g. "high-voltage-battery-overtemperature"
  code: varchar('code', { length: 30 }),             // e.g. "BYD_WL_026", "BYD_FP_007"
  category: varchar('category', { length: 50 }).notNull(),
  name_en: varchar('name_en', { length: 200 }).notNull(),
  name_cn: varchar('name_cn', { length: 200 }),
  severity: varchar('severity', { length: 10 }),   // INFO | WARNING | CRITICAL
  description_en: text('description_en'),
  causes: json('causes'),                            // string[]
  can_drive: varchar('can_drive', { length: 20 }),   // yes | no | caution
  action_en: text('action_en'),
}, (t) => [
  index('idx_mf_nv_wl_brand_id').on(t.brand_id),
  index('idx_mf_nv_wl_model_id').on(t.model_id),
])

// ─── 警告灯-故障码关联表 ──────────────────────────────────────────────────────
export const warningLightDtcLinks = mysqlTable('mf_nv_warning_light_dtc_links', {
  warning_light_id: int('warning_light_id').references(() => warningLights.id).notNull(),
  dtc_id: int('dtc_id').references(() => dtcs.dtc_id).notNull(),
}, (t) => [
  primaryKey({ columns: [t.warning_light_id, t.dtc_id] }),
])
