// TradingView Service (CommonJS runtime for Cloud Functions)
const { BigQuery } = require('@google-cloud/bigquery');
const Redis = require('ioredis');
const crypto = require('crypto');

class TradingViewService {
  constructor() {
    this.bigquery = new BigQuery({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });

    this.datasetName = process.env.BIGQUERY_DATASET || 'direction_sky_data';

    const redisUrl = process.env.REDIS_URL;
    const redisEnabled = Boolean(redisUrl) && !/localhost|127\.0\.0\.1/.test(redisUrl);
    if (redisEnabled) {
      this.redisClient = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy: () => null,
      });
      this.redisClient.on('error', (err) => {
        console.error('[tradingviewService] Redis error:', err && err.message ? err.message : err);
      });
      // Try to connect, but don't block function if it fails
      this.redisClient.connect().catch((err) => {
        console.error('[tradingviewService] Redis connect failed, continuing without cache:', err && err.message ? err.message : err);
        this.redisClient = createNoopRedis();
        this.config.rateLimitEnabled = false;
      });
    } else {
      this.redisClient = createNoopRedis();
    }

    this.tableName = 'tradingview_alerts';
    this.config = {
      webhookSecret: process.env.TRADINGVIEW_WEBHOOK_SECRET,
      allowedIPs: ['52.89.214.238', '34.212.75.30', '54.218.53.128', '52.32.178.7'],
      rateLimitEnabled: Boolean(process.env.REDIS_URL) && process.env.TRADINGVIEW_RATE_LIMIT_ENABLED === 'true',
      rateLimitWindow: 60000,
      rateLimitMaxRequests: 100,
      enableSignatureValidation: process.env.TRADINGVIEW_SIGNATURE_VALIDATION === 'true'
    };
  }

  async validateWebhookRequest(payload, sourceIp, signature) {
    const errors = [];
    if (!this.config.allowedIPs.includes(sourceIp)) {
      errors.push(`Invalid source IP: ${sourceIp}`);
    }
    if (this.config.rateLimitEnabled) {
      const isRateLimited = await this.checkRateLimit(sourceIp);
      if (isRateLimited) {
        const err = new RateLimitError('Rate limit exceeded', this.config.rateLimitWindow / 1000);
        throw err;
      }
    }
    if (this.config.enableSignatureValidation && this.config.webhookSecret) {
      if (!signature) {
        errors.push('Missing webhook signature');
      } else if (!this.validateSignature(JSON.stringify(payload), signature)) {
        errors.push('Invalid webhook signature');
      }
    }
    const payloadValidation = this.validatePayload(payload);
    if (!payloadValidation.isValid) {
      errors.push(...payloadValidation.errors);
    }
    if (errors.length > 0) {
      return { isValid: false, errors };
    }
    const normalizedPayload = this.normalizePayload(payload, sourceIp);
    return { isValid: true, errors: [], normalizedPayload };
  }

  validatePayload(payload) {
    const errors = [];
    if (!payload || !payload.ticker) errors.push('Missing required field: ticker');
    if (!payload || !payload.action) errors.push('Missing required field: action');
    const validActions = ['buy', 'sell', 'exit', 'close'];
    if (payload && payload.action && !validActions.includes(String(payload.action).toLowerCase())) {
      errors.push(`Invalid action: ${payload.action}. Must be one of: ${validActions.join(', ')}`);
    }
    if (payload && payload.price !== undefined) {
      const price = typeof payload.price === 'string' ? parseFloat(payload.price) : payload.price;
      if (isNaN(price) || price < 0) errors.push('Invalid price value');
    }
    if (payload && payload.quantity !== undefined) {
      const quantity = typeof payload.quantity === 'string' ? parseFloat(payload.quantity) : payload.quantity;
      if (isNaN(quantity) || quantity < 0) errors.push('Invalid quantity value');
    }
    return { isValid: errors.length === 0, errors };
  }

  normalizePayload(payload, sourceIp) {
    const alertId = this.generateAlertId();
    const now = new Date();
    const alert = {
      alertId,
      timestamp: now,
      ticker: String(payload.ticker).toUpperCase(),
      action: String(payload.action).toLowerCase(),
      price: this.parseNumber(payload.price),
      sentiment: payload.sentiment ? String(payload.sentiment).toLowerCase() : undefined,
      quantity: this.parseNumber(payload.quantity),
      strategyName: payload.strategy?.order?.action || payload.strategyName,
      alertMessage: payload.alertMessage || payload.message,
      rawPayload: payload,
      sourceIp,
      alertCondition: payload.alertCondition,
      timeframe: payload.interval || payload.timeframe,
      exchange: payload.exchange,
      marketPosition: payload.strategy?.market_position ? String(payload.strategy.market_position).toLowerCase() : undefined,
      processedAt: now,
      createdAt: now
    };
    // If ticker/action missing but present in alertMessage like "ticker: TSLA action=buy", accept what was parsed earlier
    return alert;
  }

  async storeAlert(alert) {
    const row = {
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
      processed_at: alert.processedAt ? alert.processedAt.toISOString() : new Date().toISOString(),
      source_ip: alert.sourceIp,
      user_id: alert.userId,
      alert_condition: alert.alertCondition,
      timeframe: alert.timeframe,
      exchange: alert.exchange,
      market_position: alert.marketPosition,
      created_at: alert.createdAt ? alert.createdAt.toISOString() : new Date().toISOString()
    };
    await this.bigquery.dataset(this.datasetName).table(this.tableName).insert([row]);
    await this.cacheAlert(alert);
  }

  async cacheAlert(alert) {
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
    } catch (e) {
      console.error('Redis caching error:', e);
    }
  }

  async getAlerts(filters = {}) {
    const { ticker, action, sentiment, dateFrom, dateTo, strategyName, page = 1, limit = 50 } = filters;
    let query = `SELECT * FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${this.datasetName}.${this.tableName}\` WHERE 1=1`;
    const params = {};
    if (ticker && ticker !== 'all') { query += ' AND ticker = @ticker'; params.ticker = String(ticker).toUpperCase(); }
    if (action) { query += ' AND action = @action'; params.action = action; }
    if (sentiment) { query += ' AND sentiment = @sentiment'; params.sentiment = sentiment; }
    if (dateFrom) { query += ' AND timestamp >= @dateFrom'; params.dateFrom = dateFrom; }
    if (dateTo) { query += ' AND timestamp <= @dateTo'; params.dateTo = dateTo; }
    if (strategyName) { query += ' AND strategy_name = @strategyName'; params.strategyName = strategyName; }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countRows] = await this.bigquery.query({ query: countQuery, params });
    const total = (countRows && countRows[0] && countRows[0].total) || 0;

    query += ' ORDER BY timestamp DESC LIMIT @limit OFFSET @offset';
    params.limit = limit;
    params.offset = (page - 1) * limit;

    const [rows] = await this.bigquery.query({ query, params });
    const alerts = rows.map(this.mapBigQueryRowToAlert);
    const stats = await this.getAlertStats();
    return { alerts, pagination: { page, limit, total, hasMore: page * limit < total }, stats };
  }

  async getAlertStats() {
    const p = (sql) => this.bigquery.query({ query: sql });
    const base = `\`${process.env.GOOGLE_CLOUD_PROJECT}.${this.datasetName}.${this.tableName}\``;
    const queries = {
      total: `SELECT COUNT(*) as count FROM ${base}`,
      today: `SELECT COUNT(*) as count FROM ${base} WHERE DATE(timestamp) = CURRENT_DATE()`,
      week: `SELECT COUNT(*) as count FROM ${base} WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)`,
      month: `SELECT COUNT(*) as count FROM ${base} WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)`,
      tickers: `SELECT COUNT(DISTINCT ticker) as count FROM ${base}`,
      topTickers: `SELECT ticker, COUNT(*) as count FROM ${base} WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY) GROUP BY ticker ORDER BY count DESC LIMIT 10`,
      actions: `SELECT action, COUNT(*) as count FROM ${base} WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY) GROUP BY action`,
      sentiments: `SELECT sentiment, COUNT(*) as count FROM ${base} WHERE sentiment IS NOT NULL AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY) GROUP BY sentiment`,
      hourly: `SELECT EXTRACT(HOUR FROM timestamp) as hour, COUNT(*) as count FROM ${base} WHERE DATE(timestamp) = CURRENT_DATE() GROUP BY hour ORDER BY hour`,
    };
    const results = await Promise.all([p(queries.total), p(queries.today), p(queries.week), p(queries.month), p(queries.tickers), p(queries.topTickers), p(queries.actions), p(queries.sentiments), p(queries.hourly)]);
    return {
      totalAlerts: results[0][0][0]?.count || 0,
      todayAlerts: results[1][0][0]?.count || 0,
      weekAlerts: results[2][0][0]?.count || 0,
      monthAlerts: results[3][0][0]?.count || 0,
      uniqueTickers: results[4][0][0]?.count || 0,
      topTickers: results[5][0] || [],
      actionBreakdown: results[6][0] || [],
      sentimentBreakdown: results[7][0] || [],
      hourlyDistribution: results[8][0] || []
    };
  }

  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  parseNumber(value) {
    if (value === undefined || value === null) return undefined;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? undefined : num;
  }
  validateSignature(payload, signature) {
    if (!this.config.webhookSecret) return false;
    const expectedSignature = crypto.createHmac('sha256', this.config.webhookSecret).update(payload).digest('hex');
    return signature === expectedSignature;
  }
  async checkRateLimit(ip) {
    // If rate limiting is disabled (e.g., Redis not available), allow request
    if (!this.config.rateLimitEnabled) return false;
    const key = `rate_limit:${ip}`;
    const current = await this.redisClient.get(key);
    if (!current) { await this.redisClient.setex(key, this.config.rateLimitWindow / 1000, '1'); return false; }
    const count = parseInt(current, 10);
    if (count >= this.config.rateLimitMaxRequests) return true;
    await this.redisClient.incr(key);
    return false;
  }
  async updateDailyStats(alert) {
    const today = new Date().toISOString().split('T')[0];
    const statsKey = `tradingview:stats:${today}`;
    await this.redisClient.hincrby(statsKey, 'total_alerts', 1);
    await this.redisClient.hincrby(statsKey, `ticker_${alert.ticker}`, 1);
    await this.redisClient.hincrby(statsKey, `action_${alert.action}`, 1);
    if (alert.sentiment) await this.redisClient.hincrby(statsKey, `sentiment_${alert.sentiment}`, 1);
    await this.redisClient.expire(statsKey, 86400 * 7);
  }
  mapBigQueryRowToAlert(row) {
    let rawPayload = {};
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
  }
}

function createNoopRedis() {
  const noop = async () => undefined;
  return {
    on: () => {},
    connect: noop,
    get: async () => null,
    setex: noop,
    incr: noop,
    lpush: noop,
    ltrim: noop,
    expire: noop,
    hincrby: noop,
  };
}

class WebhookValidationError extends Error {
  constructor(message, errors) { super(message); this.name = 'WebhookValidationError'; this.errors = errors; }
}
class RateLimitError extends Error {
  constructor(message, retryAfter) { super(message); this.name = 'RateLimitError'; this.retryAfter = retryAfter; }
}

module.exports = { TradingViewService, WebhookValidationError, RateLimitError };


