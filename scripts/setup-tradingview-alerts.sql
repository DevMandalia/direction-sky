-- TradingView alerts table schema
-- Aligned with project patterns; uses active project and the BIGQUERY_DATASET env (defaults via bq CLI)

CREATE TABLE IF NOT EXISTS `direction_sky_data.tradingview_alerts` (
  alert_id STRING NOT NULL OPTIONS(description="Unique identifier for the alert"),
  timestamp TIMESTAMP NOT NULL OPTIONS(description="When the alert was triggered in TradingView"),
  ticker STRING NOT NULL OPTIONS(description="Stock/crypto ticker symbol"),
  action STRING NOT NULL OPTIONS(description="Trading action: buy, sell, exit, close"),
  price FLOAT64 OPTIONS(description="Price at which the alert was triggered"),
  sentiment STRING OPTIONS(description="Market sentiment: bullish, bearish, flat"),
  quantity FLOAT64 OPTIONS(description="Quantity/contracts for the trade"),
  strategy_name STRING OPTIONS(description="Name of the TradingView strategy"),
  alert_message STRING OPTIONS(description="Custom alert message from TradingView"),
  raw_payload JSON OPTIONS(description="Complete webhook payload as received"),
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP() OPTIONS(description="When the alert was processed by our system"),
  source_ip STRING OPTIONS(description="IP address from which the webhook was sent"),
  user_id STRING OPTIONS(description="User ID if available"),
  alert_condition STRING OPTIONS(description="The condition that triggered the alert"),
  timeframe STRING OPTIONS(description="Chart timeframe (1m, 5m, 1h, 1d, etc.)"),
  exchange STRING OPTIONS(description="Exchange name (NASDAQ, NYSE, BINANCE, etc.)"),
  market_position STRING OPTIONS(description="Current market position: long, short, flat"),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP() OPTIONS(description="When the record was created")
)
PARTITION BY DATE(timestamp)
CLUSTER BY ticker, action
OPTIONS(
  description="TradingView webhook alerts storage table",
  labels=[("source", "tradingview"), ("type", "alerts"), ("project", "direction-sky")]
);


