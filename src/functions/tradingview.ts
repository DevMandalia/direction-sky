import { Request, Response } from 'express';
import { TradingViewService } from './tradingviewService';
import { WebhookValidationError, RateLimitError } from './tradingviewTypes';

const tradingViewService = new TradingViewService();

export const tradingviewWebhookReceiver = async (req: Request, res: Response) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Signature');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed. Only POST requests are accepted.', timestamp: new Date().toISOString() });
    return;
  }

  try {
    const sourceIp = getClientIP(req);
    const signature = req.headers['x-signature'] as string;

    const validation = await tradingViewService.validateWebhookRequest(req.body, sourceIp, signature);

    if (!validation.isValid) {
      res.status(400).json({ success: false, error: 'Webhook validation failed', details: validation.errors, timestamp: new Date().toISOString() });
      return;
    }

    if (validation.normalizedPayload) {
      await tradingViewService.storeAlert(validation.normalizedPayload);
      res.status(200).json({ success: true, message: 'Alert received and processed successfully', alertId: validation.normalizedPayload.alertId, timestamp: new Date().toISOString() });
      return;
    }

    throw new Error('Failed to normalize payload');
  } catch (error: any) {
    if (error instanceof WebhookValidationError) {
      res.status(400).json({ success: false, error: 'Validation error', details: error.errors, timestamp: new Date().toISOString() });
      return;
    }
    if (error instanceof RateLimitError) {
      res.status(429).json({ success: false, error: 'Rate limit exceeded', retryAfter: error.retryAfter, timestamp: new Date().toISOString() });
      return;
    }
    res.status(500).json({ success: false, error: 'Internal server error', message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred processing the webhook', timestamp: new Date().toISOString() });
  }
};

export const tradingviewAlertsApi = async (req: Request, res: Response) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const path = req.path || '/';
    const method = req.method;

    if (method === 'GET' && path === '/alerts') {
      const filters = {
        ticker: req.query.ticker as string,
        action: req.query.action as string,
        sentiment: req.query.sentiment as string,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        strategyName: req.query.strategyName as string,
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 50, 100)
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
      if (!ticker) {
        res.status(400).json({ success: false, error: 'Ticker parameter is required', timestamp: new Date().toISOString() });
        return;
      }
      const filters = {
        ticker: ticker.toUpperCase(),
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 50, 100)
      };
      const result = await tradingViewService.getAlerts(filters);
      res.status(200).json({ success: true, data: result, timestamp: new Date().toISOString() });
      return;
    }

    if (method === 'GET' && path === '/health') {
      res.status(200).json({ success: true, message: 'TradingView Alerts API is healthy', timestamp: new Date().toISOString(), version: '1.0.0' });
      return;
    }

    res.status(404).json({ success: false, error: 'Route not found', availableRoutes: ['GET /alerts', 'GET /alerts/{ticker}', 'GET /stats', 'GET /health'], timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Internal server error', message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred', timestamp: new Date().toISOString() });
  }
};

export const tradingviewHealthCheck = async (req: Request, res: Response) => {
  res.set('Access-Control-Allow-Origin', '*');
  try {
    const health: any = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: { bigquery: 'unknown', redis: 'unknown' }
    };
    try {
      const { BigQuery } = require('@google-cloud/bigquery');
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const bigquery = new BigQuery();
      health.services.bigquery = 'healthy';
    } catch (_) {
      health.services.bigquery = 'unhealthy';
      health.status = 'degraded';
    }
    try {
      health.services.redis = process.env.REDIS_URL ? 'healthy' : 'unknown';
    } catch (_) {
      health.services.redis = 'unhealthy';
      health.status = 'degraded';
    }
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error: any) {
    res.status(503).json({ status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() });
  }
};

function getClientIP(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string) ||
    (req.headers['x-real-ip'] as string) ||
    (req.connection as any).remoteAddress ||
    (req.socket as any).remoteAddress ||
    'unknown'
  ).split(',')[0].trim();
}


