const { TradingViewService, WebhookValidationError, RateLimitError } = require('./tradingviewService');

const tradingViewService = new TradingViewService();

const getClientIP = (req) => {
  return (
    req.headers['x-forwarded-for'] ||
    req.headers['x-real-ip'] ||
    (req.connection && req.connection.remoteAddress) ||
    (req.socket && req.socket.remoteAddress) ||
    'unknown'
  ).toString().split(',')[0].trim();
};

exports.tradingviewWebhookReceiver = async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Signature');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ success: false, error: 'Method not allowed. Only POST requests are accepted.', timestamp: new Date().toISOString() }); return; }
  try {
    const sourceIp = getClientIP(req);
    const signature = req.headers['x-signature'];
    const body = coerceBodyToObject(req);
    const validation = await tradingViewService.validateWebhookRequest(body, sourceIp, signature);
    if (!validation.isValid) { res.status(400).json({ success: false, error: 'Webhook validation failed', details: validation.errors, timestamp: new Date().toISOString() }); return; }
    if (validation.normalizedPayload) {
      await tradingViewService.storeAlert(validation.normalizedPayload);
      res.status(200).json({ success: true, message: 'Alert received and processed successfully', alertId: validation.normalizedPayload.alertId, timestamp: new Date().toISOString() });
      return;
    }
    throw new Error('Failed to normalize payload');
  } catch (error) {
    if (error instanceof WebhookValidationError) { res.status(400).json({ success: false, error: 'Validation error', details: error.errors, timestamp: new Date().toISOString() }); return; }
    if (error instanceof RateLimitError) { res.status(429).json({ success: false, error: 'Rate limit exceeded', retryAfter: error.retryAfter, timestamp: new Date().toISOString() }); return; }
    res.status(500).json({ success: false, error: 'Internal server error', message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred processing the webhook', timestamp: new Date().toISOString() });
  }
};

exports.tradingviewAlertsApi = async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  try {
    const path = req.path || '/';
    const method = req.method;
    if (method === 'GET' && path === '/alerts') {
      const filters = {
        ticker: req.query.ticker,
        action: req.query.action,
        sentiment: req.query.sentiment,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
        strategyName: req.query.strategyName,
        page: parseInt(req.query.page) || 1,
        limit: Math.min(parseInt(req.query.limit) || 50, 100)
      };
      const result = await tradingViewService.getAlerts(filters);
      res.status(200).json({ success: true, data: result, timestamp: new Date().toISOString() });
      return;
    }
    if (method === 'GET' && path === '/stats') {
      const stats = await tradingViewService.getAlertStats();
      res.status(200).json({ success: true, data: stats, timestamp: new Date().toISOString() });
      return;
    }
    if (method === 'GET' && path.startsWith('/alerts/')) {
      const ticker = path.split('/')[2];
      if (!ticker) { res.status(400).json({ success: false, error: 'Ticker parameter is required', timestamp: new Date().toISOString() }); return; }
      const filters = { ticker: ticker.toUpperCase(), page: parseInt(req.query.page) || 1, limit: Math.min(parseInt(req.query.limit) || 50, 100) };
      const result = await tradingViewService.getAlerts(filters);
      res.status(200).json({ success: true, data: result, timestamp: new Date().toISOString() });
      return;
    }
    if (method === 'GET' && path === '/health') {
      res.status(200).json({ success: true, message: 'TradingView Alerts API is healthy', timestamp: new Date().toISOString(), version: '1.0.0' });
      return;
    }
    res.status(404).json({ success: false, error: 'Route not found', availableRoutes: ['GET /alerts', 'GET /alerts/{ticker}', 'GET /stats', 'GET /health'], timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error', message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred', timestamp: new Date().toISOString() });
  }
};

exports.tradingviewHealthCheck = async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  try {
    const health = { status: 'healthy', timestamp: new Date().toISOString(), version: '1.0.0', services: { bigquery: 'unknown', redis: 'unknown' } };
    try { const { BigQuery } = require('@google-cloud/bigquery'); /* eslint-disable no-new */ new BigQuery(); health.services.bigquery = 'healthy'; } catch (_) { health.services.bigquery = 'unhealthy'; health.status = 'degraded'; }
    try { health.services.redis = process.env.REDIS_URL ? 'healthy' : 'unknown'; } catch (_) { health.services.redis = 'unhealthy'; health.status = 'degraded'; }
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() });
  }
};

function coerceBodyToObject(req) {
  const body = req.body;
  if (body && typeof body === 'object' && Object.keys(body).length > 0) return body;
  let raw = '';
  if (typeof body === 'string') raw = body;
  else if (req.rawBody && Buffer.isBuffer(req.rawBody)) raw = req.rawBody.toString('utf8');
  else if (body != null) raw = String(body);
  try { const parsed = JSON.parse(raw); if (parsed && typeof parsed === 'object') return parsed; } catch (_) {}
  const obj = { alertMessage: raw };
  const pairs = raw.split(/\n|,|;|\|/g).map(s => s.trim()).filter(Boolean);
  for (const pair of pairs) {
    const m = pair.match(/^(\w+)\s*[:=]\s*(.+)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (['ticker','symbol'].includes(key)) obj.ticker = value.toUpperCase();
    if (key === 'action') obj.action = value.toLowerCase();
    if (key === 'price') { const num = parseFloat(value.replace(/[^0-9.+-]/g, '')); if (!Number.isNaN(num)) obj.price = num; }
    if (key === 'sentiment') obj.sentiment = value.toLowerCase();
    if (['quantity','qty','contracts'].includes(key)) { const q = parseFloat(value.replace(/[^0-9.+-]/g, '')); if (!Number.isNaN(q)) obj.quantity = q; }
    if (key === 'timeframe' || key === 'interval') obj.timeframe = value;
    if (key === 'exchange') obj.exchange = value;
    if (key === 'strategy' || key === 'strategyname') obj.strategyName = value;
  }
  return obj;
}
