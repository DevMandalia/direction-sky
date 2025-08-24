-- Complete schema for polygon_options table
-- This is the single source of truth for the MSTR options data table structure

-- Drop existing table (WARNING: This will delete all existing data)
DROP TABLE IF EXISTS `dev-epsilon-467101-v2.direction_sky_data.polygon_options`;

-- Create table with current schema
CREATE TABLE `dev-epsilon-467101-v2.direction_sky_data.polygon_options` (
  -- Primary Keys - Daily granularity structure
  `date` DATE NOT NULL,
  `contract_id` STRING NOT NULL,
  
  -- Timestamps
  `insert_timestamp` TIMESTAMP,
  `last_updated` TIMESTAMP NOT NULL,
  
  -- Contract Details
  `underlying_asset` STRING NOT NULL,
  `contract_type` STRING NOT NULL,
  `strike_price` FLOAT64,
  `expiration_date` DATE,
  `exercise_style` STRING,
  `shares_per_contract` INT64,
  `primary_exchange` STRING,
  `currency` STRING,
  
  -- Underlying Asset Data
  `underlying_price` FLOAT64,
  `underlying_timestamp` TIMESTAMP,
  
  -- Comprehensive Greeks
  `delta` FLOAT64,
  `gamma` FLOAT64,
  `theta` FLOAT64,
  `vega` FLOAT64,
  `rho` FLOAT64,
  
  -- Advanced Greeks
  `lambda` FLOAT64,
  `epsilon` FLOAT64,
  `charm` FLOAT64,
  `vanna` FLOAT64,
  `volga` FLOAT64,
  
  -- Quote Data
  `bid` FLOAT64,
  `ask` FLOAT64,
  `bid_size` INT64,
  `ask_size` INT64,
  `mid_price` FLOAT64,
  `spread` FLOAT64,
  `spread_percentage` FLOAT64,
  
  -- Trade Data
  `last_price` FLOAT64,
  `last_size` INT64,
  `last_trade_exchange` INT64,
  `last_trade_conditions` STRING,
  
  -- Market Data
  `volume` INT64,
  `open_interest` INT64,
  `implied_volatility` FLOAT64,
  `historical_volatility` FLOAT64,
  `min_av` FLOAT64,
  `min_av_timestamp` TIMESTAMP,
  
  -- Day Field Child Attributes
  `close` FLOAT64,
  `change` FLOAT64,
  `change_percent` FLOAT64,
  `high` FLOAT64,
  `low` FLOAT64,
  `open` FLOAT64,
  `previous_close` FLOAT64,
  `vwap` FLOAT64,
  `day_last_updated` TIMESTAMP,
  `day_volume` INT64,
  
  -- Previous Day Data
  `prev_day_volume` INT64,
  `prev_day_open_interest` INT64,
  `prev_day_high` FLOAT64,
  `prev_day_low` FLOAT64,
  `prev_day_close` FLOAT64,
  `prev_day_vwap` FLOAT64,
  
  -- Last Quote Field Child Attributes
  `quote_bid` FLOAT64,
  `quote_ask` FLOAT64,
  `quote_bid_size` INT64,
  `quote_ask_size` INT64,
  `quote_last_updated` TIMESTAMP,
  `quote_last_exchange` STRING,
  `quote_midpoint` FLOAT64,
  `quote_timeframe` STRING,
  `quote_bid_exchange` STRING,
  
  -- Last Trade Field Child Attributes
  `last_trade_price` FLOAT64,
  `last_trade_size` INT64,
  `last_trade_timestamp` TIMESTAMP,
  
  -- Underlying Asset Field Child Attributes
  `underlying_ticker` STRING,
  
  -- Options-Specific Data
  `days_to_expiration` INT64,
  `time_value` FLOAT64,
  `intrinsic_value` FLOAT64,
  `extrinsic_value` FLOAT64,
  `moneyness` STRING,
  `leverage` FLOAT64,
  
  -- Risk Metrics
  `probability_itm` FLOAT64,
  `probability_otm` FLOAT64,
  `max_loss` FLOAT64,
  `max_profit` FLOAT64,
  `break_even_price` FLOAT64,
  
  -- Calculated Score
  `score` FLOAT64,
  
  -- Timestamps
  `quote_timestamp` TIMESTAMP,
  `trade_timestamp` TIMESTAMP,
  `participant_timestamp` TIMESTAMP,
  `chain_timestamp` TIMESTAMP,
  
  -- Exchange and Market Data
  `exchange` INT64,
  `conditions` STRING,
  `market_center` STRING,
  `tick_size` FLOAT64,
  `lot_size` INT64,
  
  -- Regulatory and Compliance
  `is_penny` BOOL,
  `is_weekly` BOOL,
  `is_monthly` BOOL,
  `is_quarterly` BOOL,
  `is_standard` BOOL,
  
  -- Data Quality and Metadata
  `data_source` STRING,
  `data_quality_score` FLOAT64,
  `raw_data` JSON,
  `created_at` TIMESTAMP NOT NULL
)
PARTITION BY `date`
CLUSTER BY `contract_id`
OPTIONS(
  description="MSTR options data with daily granularity, partitioned by date and clustered by contract_id"
);

-- Verify table creation
SELECT 
  table_id,
  creation_time,
  last_modified_time,
  row_count,
  size_bytes
FROM `dev-epsilon-467101-v2.direction_sky_data.__TABLES__`
WHERE table_id = 'polygon_options'; 