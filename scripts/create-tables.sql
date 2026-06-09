-- EV Aftermarket Platform - 建表脚本
-- 数据库: mayfair_merch_new
-- 所有表前缀: mf_nv_
-- 执行顺序: 按依赖关系排列，无需修改

-- 市场配置表
CREATE TABLE IF NOT EXISTS `mf_nv_markets` (
  `market_code` VARCHAR(10) NOT NULL,
  `country_name` VARCHAR(100) NOT NULL,
  `currency` VARCHAR(10) NOT NULL,
  `drive_side` VARCHAR(5),
  `climate_zone` VARCHAR(20),
  `active` BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (`market_code`)
);

-- 品牌表
CREATE TABLE IF NOT EXISTS `mf_nv_brands` (
  `brand_id` VARCHAR(50) NOT NULL,
  `brand_name_en` VARCHAR(100) NOT NULL,
  `brand_name_cn` VARCHAR(100),
  `logo_url` TEXT,
  PRIMARY KEY (`brand_id`)
);

-- 车型表
CREATE TABLE IF NOT EXISTS `mf_nv_models` (
  `model_id` VARCHAR(100) NOT NULL,
  `brand_id` VARCHAR(50),
  `model_name` VARCHAR(100) NOT NULL,
  `vehicle_type` VARCHAR(10),
  `years` VARCHAR(20),
  `steering` VARCHAR(5),
  `slug` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`model_id`),
  UNIQUE KEY `uq_mf_nv_models_slug` (`slug`),
  CONSTRAINT `fk_mf_nv_models_brand` FOREIGN KEY (`brand_id`) REFERENCES `mf_nv_brands` (`brand_id`)
);

-- 故障码表
CREATE TABLE IF NOT EXISTS `mf_nv_dtcs` (
  `dtc_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `dtc_code` VARCHAR(20) NOT NULL,
  `dtc_type` VARCHAR(20) DEFAULT 'STANDARD',
  `description_en` TEXT NOT NULL,
  `severity` VARCHAR(10),
  `related_system` VARCHAR(100),
  `safety_warning` TEXT,
  PRIMARY KEY (`dtc_id`),
  INDEX `idx_mf_nv_dtcs_code` (`dtc_code`)
);

-- 故障码-车型关联表
CREATE TABLE IF NOT EXISTS `mf_nv_dtc_model_notes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `dtc_id` BIGINT UNSIGNED,
  `model_id` VARCHAR(100),
  `market_code` VARCHAR(10),
  `likely_causes` JSON,
  `suggested_actions` JSON,
  `climate_notes` TEXT,
  `data_confidence` VARCHAR(20) DEFAULT 'community',
  `source_urls` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_mf_nv_dmn_dtc_id` (`dtc_id`),
  INDEX `idx_mf_nv_dmn_model_id` (`model_id`),
  CONSTRAINT `fk_mf_nv_dmn_dtc` FOREIGN KEY (`dtc_id`) REFERENCES `mf_nv_dtcs` (`dtc_id`),
  CONSTRAINT `fk_mf_nv_dmn_model` FOREIGN KEY (`model_id`) REFERENCES `mf_nv_models` (`model_id`),
  CONSTRAINT `fk_mf_nv_dmn_market` FOREIGN KEY (`market_code`) REFERENCES `mf_nv_markets` (`market_code`)
);

-- 软件更新追踪表
CREATE TABLE IF NOT EXISTS `mf_nv_software_updates` (
  `update_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `model_id` VARCHAR(100),
  `market_code` VARCHAR(10),
  `version` VARCHAR(50) NOT NULL,
  `release_date` VARCHAR(30),
  `update_method` VARCHAR(20),
  `changelog_en` TEXT,
  `source_url` TEXT,
  `data_confidence` VARCHAR(20) DEFAULT 'community',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`update_id`),
  INDEX `idx_mf_nv_su_model_id` (`model_id`),
  CONSTRAINT `fk_mf_nv_su_model` FOREIGN KEY (`model_id`) REFERENCES `mf_nv_models` (`model_id`),
  CONSTRAINT `fk_mf_nv_su_market` FOREIGN KEY (`market_code`) REFERENCES `mf_nv_markets` (`market_code`)
);

-- 服务费用表
CREATE TABLE IF NOT EXISTS `mf_nv_service_costs` (
  `cost_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `model_id` VARCHAR(100),
  `market_code` VARCHAR(10),
  `service_type` VARCHAR(100) NOT NULL,
  `cost_min` INT,
  `cost_max` INT,
  `currency` VARCHAR(10),
  `is_dealer_only` BOOLEAN DEFAULT FALSE,
  `notes` TEXT,
  `source_url` TEXT,
  `data_confidence` VARCHAR(20) DEFAULT 'community',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`cost_id`),
  CONSTRAINT `fk_mf_nv_sc_model` FOREIGN KEY (`model_id`) REFERENCES `mf_nv_models` (`model_id`),
  CONSTRAINT `fk_mf_nv_sc_market` FOREIGN KEY (`market_code`) REFERENCES `mf_nv_markets` (`market_code`)
);

-- 经销商/服务网点表
CREATE TABLE IF NOT EXISTS `mf_nv_dealers` (
  `dealer_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `brand_id` VARCHAR(50),
  `market_code` VARCHAR(10),
  `city` VARCHAR(100),
  `state_province` VARCHAR(100),
  `name` VARCHAR(200) NOT NULL,
  `address` TEXT,
  `phone` VARCHAR(50),
  `hours` VARCHAR(200),
  `is_authorised` BOOLEAN DEFAULT TRUE,
  `last_verified` VARCHAR(20),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dealer_id`),
  INDEX `idx_mf_nv_dealers_brand_market` (`brand_id`, `market_code`),
  CONSTRAINT `fk_mf_nv_dealers_brand` FOREIGN KEY (`brand_id`) REFERENCES `mf_nv_brands` (`brand_id`),
  CONSTRAINT `fk_mf_nv_dealers_market` FOREIGN KEY (`market_code`) REFERENCES `mf_nv_markets` (`market_code`)
);

-- 案例表
CREATE TABLE IF NOT EXISTS `mf_nv_cases` (
  `case_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `model_id` VARCHAR(100),
  `market_code` VARCHAR(10),
  `content_type` VARCHAR(30) DEFAULT 'dtc',
  `source_type` VARCHAR(50) NOT NULL,
  `source_name` VARCHAR(100) NOT NULL,
  `source_url` TEXT,
  `source_language` VARCHAR(10) DEFAULT 'en',
  `location` VARCHAR(100),
  `report_date` VARCHAR(20),
  `vehicle_desc` TEXT,
  `symptom_summary` TEXT NOT NULL,
  `resolution` TEXT,
  `cost_info` TEXT,
  `confidence` VARCHAR(20) DEFAULT 'community',
  `translated_by` VARCHAR(50),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`case_id`),
  INDEX `idx_mf_nv_cases_model_id` (`model_id`),
  INDEX `idx_mf_nv_cases_content_type` (`content_type`),
  CONSTRAINT `fk_mf_nv_cases_model` FOREIGN KEY (`model_id`) REFERENCES `mf_nv_models` (`model_id`),
  CONSTRAINT `fk_mf_nv_cases_market` FOREIGN KEY (`market_code`) REFERENCES `mf_nv_markets` (`market_code`)
);

-- 案例-故障码关联表
CREATE TABLE IF NOT EXISTS `mf_nv_case_dtc_links` (
  `case_id` BIGINT UNSIGNED NOT NULL,
  `dtc_id` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`case_id`, `dtc_id`),
  CONSTRAINT `fk_mf_nv_cdl_case` FOREIGN KEY (`case_id`) REFERENCES `mf_nv_cases` (`case_id`),
  CONSTRAINT `fk_mf_nv_cdl_dtc` FOREIGN KEY (`dtc_id`) REFERENCES `mf_nv_dtcs` (`dtc_id`)
);

-- 案例媒体附件表
CREATE TABLE IF NOT EXISTS `mf_nv_case_media` (
  `media_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `case_id` BIGINT UNSIGNED,
  `media_type` VARCHAR(20) NOT NULL,
  `media_url` TEXT NOT NULL,
  `caption` TEXT,
  `source_attribution` TEXT,
  `display_order` INT DEFAULT 0,
  PRIMARY KEY (`media_id`),
  CONSTRAINT `fk_mf_nv_cm_case` FOREIGN KEY (`case_id`) REFERENCES `mf_nv_cases` (`case_id`)
);

-- 待审队列表（案例）
CREATE TABLE IF NOT EXISTS `mf_nv_pending_cases` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `raw_content` TEXT NOT NULL,
  `source_platform` VARCHAR(100) NOT NULL,
  `source_url` TEXT,
  `ai_extracted` JSON,
  `status` VARCHAR(20) DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

-- 待审队列表（软件更新）
CREATE TABLE IF NOT EXISTS `mf_nv_pending_software_updates` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `raw_content` TEXT NOT NULL,
  `source_platform` VARCHAR(100) NOT NULL,
  `source_url` TEXT,
  `ai_extracted` JSON,
  `status` VARCHAR(20) DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

-- 待审队列表（服务费用）
CREATE TABLE IF NOT EXISTS `mf_nv_pending_service_costs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `model_slug` VARCHAR(100),
  `market_code` VARCHAR(10),
  `service_type` VARCHAR(100),
  `cost_min` INT,
  `cost_max` INT,
  `currency` VARCHAR(10),
  `city` VARCHAR(100),
  `is_dealer_only` BOOLEAN,
  `submitter_email` VARCHAR(200),
  `status` VARCHAR(20) DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);
