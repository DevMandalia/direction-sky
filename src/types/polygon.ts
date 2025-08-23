// Polygon.io Data Types for Options, Stock, and Crypto

// Base API Response
export interface PolygonAPIResponse<T> {
  status: string;
  request_id: string;
  count: number;
  results: T;
}

// Option Contract Types
export interface OptionContract {
  underlying_asset: string;
  contract_type: 'call' | 'put';
  strike_price: number;
  expiration_date: string;
  contract_id: string;
  exercise_style: 'american' | 'european';
  shares_per_contract: number;
  primary_exchange: string;
  currency: string;
}

// Option Contract Snapshot
export interface OptionContractSnapshot {
  contract: OptionContract;
  greeks: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    rho?: number;
  };
  last_quote: {
    bid: number;
    ask: number;
    bid_size: number;
    ask_size: number;
    timestamp: number;
    participant_timestamp: number;
  };
  last_trade: {
    price: number;
    size: number;
    exchange: number;
    conditions: number[];
    timestamp: number;
    participant_timestamp: number;
  };
  min_av: {
    av: number;
    t: number;
  };
  prev_day_volume: number;
  open_interest: number;
  implied_volatility: number;
}

// Option Chain Snapshot
export interface OptionChainSnapshot {
  underlying_asset: string;
  underlying_price: number;
  underlying_timestamp: number;
  options: {
    calls: OptionContractSnapshot[];
    puts: OptionContractSnapshot[];
  };
  chain_timestamp: number;
}

// Unified Options Snapshot
export interface UnifiedOptionsSnapshot {
  underlying_asset: string;
  underlying_price: number;
  underlying_timestamp: number;
  options: {
    calls: UnifiedOptionContract[];
    puts: UnifiedOptionContract[];
  };
  chain_timestamp: number;
}

// Unified Option Contract (consolidated across exchanges)
export interface UnifiedOptionContract {
  contract: OptionContract;
  nbbo: {
    bid: number;
    ask: number;
    bid_size: number;
    ask_size: number;
    timestamp: number;
  };
  last_trade: {
    price: number;
    size: number;
    exchange: number;
    conditions: number[];
    timestamp: number;
  };
  volume: number;
  open_interest: number;
  implied_volatility: number;
  greeks: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    rho?: number;
  };
}

// Stock Snapshot
export interface StockSnapshot {
  ticker: string;
  last_quote: {
    bid: number;
    ask: number;
    bid_size: number;
    ask_size: number;
    timestamp: number;
    participant_timestamp: number;
  };
  last_trade: {
    price: number;
    size: number;
    exchange: number;
    conditions: number[];
    timestamp: number;
    participant_timestamp: number;
  };
  min_av: {
    av: number;
    t: number;
  };
  prev_day_volume: number;
  prev_day_vwap: number;
  prev_day_open: number;
  prev_day_high: number;
  prev_day_low: number;
  prev_day_close: number;
  updated: number;
}

// Crypto Snapshot
export interface CryptoSnapshot {
  ticker: string;
  last_quote: {
    bid: number;
    ask: number;
    bid_size: number;
    ask_size: number;
    timestamp: number;
  };
  last_trade: {
    price: number;
    size: number;
    exchange: number;
    conditions: number[];
    timestamp: number;
  };
  min_av: {
    av: number;
    t: number;
  };
  prev_day_volume: number;
  prev_day_vwap: number;
  prev_day_open: number;
  prev_day_high: number;
  prev_day_low: number;
  prev_day_close: number;
  updated: number;
}

// Real-time WebSocket Data
export interface RealTimeOptionsData {
  event: 'Q' | 'T' | 'G'; // Quote, Trade, Greeks
  contract_id: string;
  underlying_asset: string;
  timestamp: number;
  data: {
    bid?: number;
    ask?: number;
    bid_size?: number;
    ask_size?: number;
    price?: number;
    size?: number;
    delta?: number;
    gamma?: number;
    theta?: number;
    vega?: number;
    rho?: number;
    implied_volatility?: number;
  };
}

// Data Collection for Processing Layer
export interface PolygonDataCollection {
  timestamp: number;
  source: 'polygon_options' | 'polygon_stock' | 'polygon_crypto';
  data_type: 'snapshot' | 'realtime' | 'historical';
  underlying_asset: string;
  data: {
    contract_type?: 'call' | 'put' | 'stock' | 'crypto';
    strike_price?: number;
    expiration_date?: string;
    response: OptionContractSnapshot | OptionChainSnapshot | UnifiedOptionsSnapshot | StockSnapshot | CryptoSnapshot | RealTimeOptionsData;
  };
  status: 'success' | 'error';
  error?: string;
}

// Configuration for Polygon.io API
export interface PolygonConfig {
  apiKey: string;
  baseUrl: string;
  wsUrl: string;
  retryAttempts: number;
  retryDelay: number;
  realTimeEnabled: boolean;
  batchEnabled: boolean;
  cacheEnabled: boolean;
  cacheTTL: number;
}

// Asset Configuration
export interface AssetConfig {
  symbol: string;
  asset_type: 'stock' | 'crypto';
  options_enabled: boolean;
  real_time_enabled: boolean;
  batch_enabled: boolean;
}

// Default Assets to Track
export const DEFAULT_ASSETS: AssetConfig[] = [
  {
    symbol: 'MSTR',
    asset_type: 'stock',
    options_enabled: true,
    real_time_enabled: true,
    batch_enabled: true
  },
  {
    symbol: 'BTC',
    asset_type: 'crypto',
    options_enabled: false, // BTC doesn't have traditional options
    real_time_enabled: true,
    batch_enabled: true
  }
]; 