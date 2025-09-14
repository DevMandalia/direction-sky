// TradingView Service (uses BigQuery and ioredis, aligned with project deps)

import { BigQuery } from '@google-cloud/bigquery';
import Redis from 'ioredis';
import crypto from 'crypto';
import {
  TradingViewAlert,
  TradingViewWebhookPayload,
  AlertsApiResponse,
  AlertFilters,
  AlertStats,
  WebhookValidationResult,
  WebhookValidationError,
  RateLimitError,
  TradingViewConfig,
  BigQueryAlertRow
} from './tradingviewTypes';

export class TradingViewService {
  private bigquery: BigQuery;
  private redisClient: Redis;
  private config: TradingViewConfig;
  private readonly tableName = 'tradingview_alerts';
  private readonly datasetName: string;

  constructor() {
    this.bigquery = new BigQuery({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });

    this.datasetName = process.env.BIGQUERY_DATASET || 'direction_sky_data';

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redisClient = new Redis(redisUrl, {
      lazyConnect: false,
      maxRetriesPerRequest: 1,
    });

    this.config = {
      webhookSecret: process.env.TRADINGVIEW_WEBHOOK_SECRET,
      allowedIPs: [
        '52.89.214.238',
        '34.212.75.30',
        '54.218.53.128',
        '52.32.178.7'
      ],
      rateLimitEnabled: process.env.TRADINGVIEW_RATE_LIMIT_ENABLED === 'true',
      rateLimitWindow: 60000,
      rateLimitMaxRequests: 100,
      enableSignatureValidation: process.env.TRADINGVIEW_SIGNATURE_VALIDATION === 'true'
    };
  }

  async validateWebhookRequest(
    payload: any,
    sourceIp: string,
    signature?: string
  ): Promise<WebhookValidationResult> {
    const errors: string[] = [];

    if (!this.config.allowedIPs.includes(sourceIp)) {
      errors.push(`Invalid source IP: ${sourceIp}`);
    }

    if (this.config.rateLimitEnabled) {
      const isRateLimited = await this.checkRateLimit(sourceIp);
      if (isRateLimited) {
        throw new RateLimitError('Rate limit exceeded', this.config.rateLimitWindow / 1000);
      }
    }

    if (this.config.enableSignatureValidation && this.config.webhookSecret) {
      if (!signature) {
        errors.push('Missing webhook signature');
      } else {
        const isValidSignature = this.validateSignature(JSON.stringify(payload), signature);
        if (!isValidSignature) {
          errors.push('Invalid webhook signature');
        }
      }
    }

    const payloadValidation = this.validatePayload(payload as TradingViewWebhookPayload);
    if (!payloadValidation.isValid) {
      errors.push(...payloadValidation.errors);
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    const normalizedPayload = this.normalizePayload(payload as TradingViewWebhookPayload, sourceIp);
    return { isValid: true, errors: [], normalizedPayload };
  }

  private validatePayload(payload: TradingViewWebhookPayload): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!payload.ticker) {
      errors.push('Missing required field: ticker');
    }

    if (!payload.action) {
      errors.push('Missing required field: action');
    }

    const validActions = ['buy', 'sell', 'exit', 'close'];
    if (payload.action && !validActions.includes(payload.action.toLowerCase())) {
      errors.push(`Invalid action: ${payload.action}. Must be one of: ${validActions.join(', ')}`);
    }

    if (payload.price !== undefined) {
      const price = typeof payload.price === 'string' ? parseFloat(payload.price) : payload.price;
      if (isNaN(price as number) || (price as number) < 0) {
        errors.push('Invalid price value');
      }
    }

    if (payload.quantity !== undefined) {
      const quantity = typeof payload.quantity === 'string' ? parseFloat(payload.quantity) : payload.quantity;
      if (isNaN(quantity as number) || (quantity as number) < 0) {
        errors.push('Invalid quantity value');
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  private normalizePayload(payload: TradingViewWebhookPayload, sourceIp: string): TradingViewAlert {
    const alertId = this.generateAlertId();
    const now = new Date();

    return {
      alertId,
      timestamp: now,
      ticker: payload.ticker.toUpperCase(),
      action: payload.action.toLowerCase() as any,
      price: this.parseNumber(payload.price),
      sentiment: payload.sentiment?.toLowerCase() as any,
      quantity: this.parseNumber(payload.quantity),
      strategyName: payload.strategy?.order?.action || (payload as any).strategyName,
      alertMessage: (payload as any).alertMessage || (payload as any).message,
      rawPayload: payload as any,
      sourceIp,
      alertCondition: (payload as any).alertCondition,
      timeframe: payload.interval || (payload as any).timeframe,
      exchange: payload.exchange,
      marketPosition: payload.strategy?.market_position?.toLowerCase() as any,
      processedAt: now,
      createdAt: now
    };
  }

  async storeAlert(alert: TradingViewAlert): Promise<void> {
    const row: BigQueryAlertRow = {
      alert_id: alert.alertId,
      timestamp: alert.timestamp.toISOString(),
      ticker: alert.ticker,
      action: alert.action,
      price: alert.price,
      sentiment: alert.sentiment,
      quantity: alert.quantity,
      strategy_name: alert.strategyName,
      alert_message: alert.alertMessage,
      raw_payload: alert.rawPayload,
      processed_at: alert.processedAt?.toISOString() || new Date().toISOString(),
      source_ip: alert.sourceIp,
      user_id: alert.userId,
      alert_condition: alert.alertCondition,
      timeframe: alert.timeframe,
      exchange: alert.exchange,
      market_position: alert.marketPosition,
      created_at: alert.createdAt?.toISOString() || new Date().toISOString()
    };

    await this.bigquery
      .dataset(this.datasetName)
      .table(this.tableName)
      .insert([row]);

    await this.cacheAlert(alert);
  }

  private async cacheAlert(alert: TradingViewAlert): Promise<void> {
    try {
      const tickerKey = `tradingview:alerts:${alert.ticker}`;
      await this.redisClient.lpush(tickerKey, JSON.stringify(alert));
      await this.redisClient.ltrim(tickerKey, 0, 99);
      await this.redisClient.expire(tickerKey, 86400);

      const latestKey = 'tradingview:alerts:latest';
      await this.redisClient.lpush(latestKey, JSON.stringify(alert));
      await this.redisClient.ltrim(latestKey, 0, 49);
      await this.redisClient.expire(latestKey, 86400);

      await this.updateDailyStats(alert);
    } catch (error) {
      console.error('Redis caching error:', error);
    }
  }

  async getAlerts(filters: AlertFilters = {}): Promise<AlertsApiResponse> {
    const {
      ticker,
      action,
      sentiment,
      dateFrom,
      dateTo,
      strategyName,
      page = 1,
      limit = 50
    } = filters;

    let query = `
      SELECT *
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${this.datasetName}.${this.tableName}\`
      WHERE 1=1
    `;

    const params: any = {};

    if (ticker && ticker !== 'all') {
      query += ' AND ticker = @ticker';
      params.ticker = ticker.toUpperCase();
    }

    if (action) {
      query += ' AND action = @action';
      params.action = action;
    }

    if (sentiment) {
      query += ' AND sentiment = @sentiment';
      params.sentiment = sentiment;
    }

    if (dateFrom) {
      query += ' AND timestamp >= @dateFrom';
      params.dateFrom = dateFrom;
    }

    if (dateTo) {
      query += ' AND timestamp <= @dateTo';
      params.dateTo = dateTo;
    }

    if (strategyName) {
      query += ' AND strategy_name = @strategyName';
      params.strategyName = strategyName;
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countRows] = await this.bigquery.query({ query: countQuery, params });
    const total = (countRows as any)[0]?.total || 0;

    query += ' ORDER BY timestamp DESC LIMIT @limit OFFSET @offset';
    params.limit = limit;
    params.offset = (page - 1) * limit;

    const [rows] = await this.bigquery.query({ query, params });
    const alerts = (rows as any[]).map(this.mapBigQueryRowToAlert);

    const stats = await this.getAlertStats();

    return {
      alerts,
      pagination: {
        page,
        limit,
        total,
        hasMore: page * limit < total
      },
      stats
    };
  }

  async getAlertStats(): Promise<AlertStats> {
    const queries = {
      total: `SELECT COUNT(*) as count FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${this.datasetName}.${this.tableName}\``,
      today: `SELECT COUNT(*) as count FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${this.datasetName}.${this.tableName}\` WHERE DATE(timestamp) = CURRENT_DATE()`,
      week: `SELECT COUNT(*) as count FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${this.datasetName}.${this.tableName}\` WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)`,
      month: `SELECT COUNT(*) as count FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${this.datasetName}.${this.tableName}\` WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)`,
      tickers: `SELECT COUNT(DISTINCT ticker) as count FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${this.datasetName}.${this.tableName}\``,
      topTickers: `SELECT ticker, COUNT(*) as count FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${this.datasetName}.${this.tableName}\` WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY) GROUP BY ticker ORDER BY count DESC LIMIT 10`,
      actions: `SELECT action, COUNT(*) as count FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${this.datasetName}.${this.tableName}\` WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY) GROUP BY action`,
      sentiments: `SELECT sentiment, COUNT(*) as count FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${this.datasetName}.${this.tableName}\` WHERE sentiment IS NOT NULL AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY) GROUP BY sentiment`,
      hourly: `SELECT EXTRACT(HOUR FROM timestamp) as hour, COUNT(*) as count FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${this.datasetName}.${this.tableName}\` WHERE DATE(timestamp) = CURRENT_DATE() GROUP BY hour ORDER BY hour`
    };

    const results = await Promise.all([
      this.bigquery.query({ query: queries.total }),
      this.bigquery.query({ query: queries.today }),
      this.bigquery.query({ query: queries.week }),
      this.bigquery.query({ query: queries.month }),
      this.bigquery.query({ query: queries.tickers }),
      this.bigquery.query({ query: queries.topTickers }),
      this.bigquery.query({ query: queries.actions }),
      this.bigquery.query({ query: queries.sentiments }),
      this.bigquery.query({ query: queries.hourly })
    ]);

    return {
      totalAlerts: (results[0][0] as any)[0]?.count || 0,
      todayAlerts: (results[1][0] as any)[0]?.count || 0,
      weekAlerts: (results[2][0] as any)[0]?.count || 0,
      monthAlerts: (results[3][0] as any)[0]?.count || 0,
      uniqueTickers: (results[4][0] as any)[0]?.count || 0,
      topTickers: (results[5][0] as any) || [],
      actionBreakdown: (results[6][0] as any) || [],
      sentimentBreakdown: (results[7][0] as any) || [],
      hourlyDistribution: (results[8][0] as any) || []
    };
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private parseNumber(value: string | number | undefined): number | undefined {
    if (value === undefined || value === null) return undefined;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num as number) ? undefined : (num as number);
  }

  private validateSignature(payload: string, signature: string): boolean {
    if (!this.config.webhookSecret) return false;
    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(payload)
      .digest('hex');
    return signature === expectedSignature;
  }

  private async checkRateLimit(ip: string): Promise<boolean> {
    const key = `rate_limit:${ip}`;
    const current = await this.redisClient.get(key);
    if (!current) {
      await this.redisClient.setex(key, this.config.rateLimitWindow / 1000, '1');
      return false;
    }
    const count = parseInt(current, 10);
    if (count >= this.config.rateLimitMaxRequests) {
      return true;
    }
    await this.redisClient.incr(key);
    return false;
  }

  private async updateDailyStats(alert: TradingViewAlert): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const statsKey = `tradingview:stats:${today}`;

    await this.redisClient.hincrby(statsKey, 'total_alerts', 1);
    await this.redisClient.hincrby(statsKey, `ticker_${alert.ticker}`, 1);
    await this.redisClient.hincrby(statsKey, `action_${alert.action}`, 1);
    if (alert.sentiment) {
      await this.redisClient.hincrby(statsKey, `sentiment_${alert.sentiment}`, 1);
    }
    await this.redisClient.expire(statsKey, 86400 * 7);
  }

  private mapBigQueryRowToAlert = (row: any): TradingViewAlert => {
    let rawPayload: any = {};
    if (row.raw_payload) {
      rawPayload = typeof row.raw_payload === 'string' ? JSON.parse(row.raw_payload) : row.raw_payload;
    }
    return {
      alertId: row.alert_id,
      timestamp: new Date(row.timestamp),
      ticker: row.ticker,
      action: row.action,
      price: row.price,
      sentiment: row.sentiment,
      quantity: row.quantity,
      strategyName: row.strategy_name,
      alertMessage: row.alert_message,
      rawPayload,
      sourceIp: row.source_ip,
      userId: row.user_id,
      alertCondition: row.alert_condition,
      timeframe: row.timeframe,
      exchange: row.exchange,
      marketPosition: row.market_position,
      processedAt: row.processed_at ? new Date(row.processed_at) : undefined,
      createdAt: row.created_at ? new Date(row.created_at) : undefined
    };
  };
}


