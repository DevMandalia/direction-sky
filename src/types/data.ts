// API Response Types
export interface GlassnodeResponse {
  t: number[]; // timestamps
  v: number[]; // values
  meta?: {
    name: string;
    description?: string;
    category?: string;
  };
}

export interface CoinGlassResponse {
  code: string;
  message: string;
  data?: any;
  success: boolean;
}

export interface FREDResponse {
  realtime_start: string;
  realtime_end: string;
  observation_start: string;
  observation_end: string;
  units: string;
  output_type: number;
  file_type: string;
  order_by: string;
  sort_order: string;
  count: number;
  offset: number;
  limit: number;
  observations: Array<{
    realtime_start: string;
    realtime_end: string;
    date: string;
    value: string;
  }>;
}

export interface BinanceResponse {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

export interface CoinMarketCapFearGreedResponse {
  data: {
    value: number;
    value_classification: string;
    timestamp: string;
    time_until_update: number;
  };
  status: {
    timestamp: string;
    error_code: number;
    error_message: string | null;
    elapsed: number;
    credit_count: number;
    notice: string | null;
  };
}

// Data Source Types
export interface DataSource {
  name: string;
  url: string;
  apiKey?: string;
  headers?: Record<string, string>;
  parameters?: Record<string, string>;
}

export interface DataPoint {
  timestamp: number;
  value: number;
  source: string;
  metric: string;
  symbol?: string;
  metadata?: Record<string, any>;
}

export interface RawDataCollection {
  timestamp: number;
  source: string;
  data: any;
  status: 'success' | 'error';
  error?: string;
}

export interface IngestionResult {
  success: boolean;
  timestamp: number;
  dataSources: {
    [key: string]: {
      status: 'success' | 'error';
      dataPoints: number;
      error?: string;
    };
  };
  totalDataPoints: number;
  processingTime: number;
}

// Configuration Types
export interface DataIngestionConfig {
  schedule: string;
  timeout: number;
  retryAttempts: number;
  dataSources: {
    glassnode: DataSource;
    coinglass: DataSource;
    fred: DataSource;
    binance: DataSource;
  };
  processingLayer: {
    url: string;
    timeout: number;
  };
}

// Error Types
export interface DataIngestionError {
  source: string;
  error: string;
  timestamp: number;
  retryCount: number;
}

// Metrics Types
export interface MetricDefinition {
  name: string;
  description: string;
  unit: string;
  category: 'onchain' | 'market' | 'economic' | 'price';
  source: string;
  endpoint: string;
  parameters?: Record<string, string>;
}

export const GLASSNODE_METRICS: MetricDefinition[] = [
  {
    name: 'active_addresses',
    description: 'Number of active addresses',
    unit: 'count',
    category: 'onchain',
    source: 'glassnode',
    endpoint: '/v1/metrics/addresses/active_count'
  },
  {
    name: 'transaction_count',
    description: 'Number of transactions',
    unit: 'count',
    category: 'onchain',
    source: 'glassnode',
    endpoint: '/v1/metrics/transactions/count'
  },
  {
    name: 'network_hash_rate',
    description: 'Network hash rate',
    unit: 'TH/s',
    category: 'onchain',
    source: 'glassnode',
    endpoint: '/v1/metrics/mining/hash_rate_mean'
  },
  {
    name: 'exchange_balance',
    description: 'Exchange balance',
    unit: 'BTC',
    category: 'onchain',
    source: 'glassnode',
    endpoint: '/v1/metrics/distribution/balance_exchanges'
  }
];

export const FRED_METRICS: MetricDefinition[] = [
  {
    name: 'federal_funds_rate',
    description: 'Federal Funds Rate',
    unit: 'percent',
    category: 'economic',
    source: 'fred',
    endpoint: '/series/observations',
    parameters: { series_id: 'FEDFUNDS' }
  },
  {
    name: 'unemployment_rate',
    description: 'Unemployment Rate',
    unit: 'percent',
    category: 'economic',
    source: 'fred',
    endpoint: '/series/observations',
    parameters: { series_id: 'UNRATE' }
  },
  {
    name: 'gdp',
    description: 'Gross Domestic Product',
    unit: 'billions of dollars',
    category: 'economic',
    source: 'fred',
    endpoint: '/series/observations',
    parameters: { series_id: 'GDP' }
  }
];

// Historical Data Types
export interface HistoricalDataPoint {
  timestamp: number;
  value: number;
  metric: string;
  source: string;
  date: string;
  metadata?: Record<string, any>;
}

export interface StoredFREDData {
  metric: string;
  description: string;
  unit: string;
  category: string;
  series_id: string;
  observations: Array<{
    date: string;
    value: string;
    realtime_start: string;
    realtime_end: string;
  }>;
  metadata: {
    observation_count: number;
    latest_value: string;
    latest_date: string;
    stored_at: number;
  };
}

// Database Types
export interface DatabaseQueryResult {
  success: boolean;
  data: HistoricalDataPoint[];
  count: number;
  queryTime: number;
  error?: string;
}

export interface TrendAnalysisResult {
  success: boolean;
  analysis: TrendAnalysis[];
  queryTime: number;
  error?: string;
}

export interface TrendAnalysis {
  metric: string;
  period: string;
  trend: 'up' | 'down' | 'sideways' | 'insufficient_data' | 'error';
  change: number;
  changePercent: number;
  volatility: number;
  dataPoints: number;
  latestValue?: number;
  earliestValue?: number;
  error?: string;
}

// X (Twitter) Data Types
export interface XPost {
  id: string;
  text: string;
  author_id: string;
  author_username: string;
  created_at: string;
  public_metrics: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
  sentiment: {
    score: number;
    label: 'positive' | 'negative' | 'neutral';
    confidence: number;
    keywords_found: string[];
  };
  entities: {
    hashtags: string[];
    mentions: string[];
    urls: string[];
  };
}

export interface XSentimentAnalysis {
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  average_sentiment_score: number;
  sentiment_distribution: {
    very_positive: number;
    positive: number;
    neutral: number;
    negative: number;
    very_negative: number;
  };
}

export interface XEngagementMetrics {
  total_likes: number;
  total_retweets: number;
  total_replies: number;
  total_quotes: number;
  average_engagement_rate: number;
}

export interface XKeywordAnalysis {
  keyword_frequency: Record<string, number>;
  trending_keywords: string[];
}

export interface XSentimentData {
  source: 'x_search' | 'x_account';
  query: string;
  timestamp: number;
  total_tweets: number;
  sentiment_analysis: XSentimentAnalysis;
  engagement_metrics: XEngagementMetrics;
  keyword_analysis: XKeywordAnalysis;
  top_tweets: XPost[];
}

export interface XAggregatedSentiment {
  overall_sentiment_score: number;
  overall_sentiment_label: 'positive' | 'negative' | 'neutral';
  total_tweets_analyzed: number;
  sentiment_confidence: number;
  timestamp: number;
}

export interface StoredXData {
  source: string;
  query: string;
  timestamp: number;
  total_tweets: number;
  sentiment_analysis: XSentimentAnalysis;
  engagement_metrics: XEngagementMetrics;
  keyword_analysis: XKeywordAnalysis;
  top_tweets: XPost[];
  metadata: {
    stored_at: number;
    processing_time: number;
    keywords_tracked: string[];
    accounts_monitored?: string[];
  };
}

export interface StoredCoinMarketCapData {
  timestamp: number;
  value: number;
  value_classification: string;
  time_until_update: number;
  metadata: {
    stored_at: number;
    source: 'coinmarketcap';
    api_credits_used: number;
  };
} 