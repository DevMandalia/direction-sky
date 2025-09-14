// TradingView Webhook Integration Types (aligned with project patterns)

export interface TradingViewAlert {
  alertId: string;
  timestamp: Date;
  ticker: string;
  action: 'buy' | 'sell' | 'exit' | 'close';
  price?: number;
  sentiment?: 'bullish' | 'bearish' | 'flat';
  quantity?: number;
  strategyName?: string;
  alertMessage?: string;
  rawPayload: Record<string, any>;
  sourceIp?: string;
  userId?: string;
  alertCondition?: string;
  timeframe?: string;
  exchange?: string;
  marketPosition?: 'long' | 'short' | 'flat';
  processedAt?: Date;
  createdAt?: Date;
}

export interface TradingViewWebhookPayload {
  ticker: string;
  action: string;
  price?: string | number;
  sentiment?: string;
  quantity?: string | number;
  strategy?: {
    order: {
      action: string;
      contracts: string | number;
    };
    market_position: string;
  };
  close?: string | number;
  open?: string | number;
  high?: string | number;
  low?: string | number;
  volume?: string | number;
  time?: string;
  interval?: string;
  exchange?: string;
  [key: string]: any;
}

export interface AlertsApiResponse {
  alerts: TradingViewAlert[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  stats: AlertStats;
}

export interface AlertFilters {
  ticker?: string;
  action?: string;
  sentiment?: string;
  dateFrom?: string;
  dateTo?: string;
  strategyName?: string;
  page?: number;
  limit?: number;
}

export interface AlertStats {
  totalAlerts: number;
  todayAlerts: number;
  weekAlerts: number;
  monthAlerts: number;
  uniqueTickers: number;
  topTickers: Array<{ ticker: string; count: number }>;
  actionBreakdown: Array<{ action: string; count: number }>;
  sentimentBreakdown: Array<{ sentiment: string; count: number }>;
  hourlyDistribution: Array<{ hour: number; count: number }>;
}

export interface WebhookValidationResult {
  isValid: boolean;
  errors: string[];
  normalizedPayload?: TradingViewAlert;
}

export class WebhookValidationError extends Error {
  constructor(message: string, public errors: string[]) {
    super(message);
    this.name = 'WebhookValidationError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string, public retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export interface TradingViewConfig {
  webhookSecret?: string;
  allowedIPs: string[];
  rateLimitEnabled: boolean;
  rateLimitWindow: number;
  rateLimitMaxRequests: number;
  enableSignatureValidation: boolean;
}

export interface BigQueryAlertRow {
  alert_id: string;
  timestamp: string;
  ticker: string;
  action: string;
  price?: number;
  sentiment?: string;
  quantity?: number;
  strategy_name?: string;
  alert_message?: string;
  raw_payload: any;
  processed_at: string;
  source_ip?: string;
  user_id?: string;
  alert_condition?: string;
  timeframe?: string;
  exchange?: string;
  market_position?: string;
  created_at: string;
}


