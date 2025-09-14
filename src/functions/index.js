const functions = require('@google-cloud/functions-framework');

// Export handlers for Cloud Functions (pure JS)
exports.polygonOptionsDataFetcher = require('./polygonOptionsDataFetcher').polygonOptionsDataFetcher;
exports.polygonHealthCheck = require('./polygonOptionsDataFetcher').polygonHealthCheck;
exports.fredDataFetcher = require('./fredDataFetcher').fredDataFetcher;
exports.coinmarketcapDataFetcher = require('./coinmarketcapDataFetcher').coinmarketcapDataFetcher;
exports.xDataFetcher = require('./xDataFetcher').xDataFetcher;
exports.tradingviewWebhookReceiver = require('./tradingview').tradingviewWebhookReceiver;
exports.tradingviewAlertsApi = require('./tradingview').tradingviewAlertsApi;
exports.tradingviewHealthCheck = require('./tradingview').tradingviewHealthCheck;

// Optional local registration for functions-framework
functions.http('polygon-options-fetcher', exports.polygonOptionsDataFetcher);
functions.http('fred-fetcher', exports.fredDataFetcher);
functions.http('coinmarketcap-fetcher', exports.coinmarketcapDataFetcher);
functions.http('x-fetcher', exports.xDataFetcher);
functions.http('tradingview-webhook-receiver', exports.tradingviewWebhookReceiver);
functions.http('tradingview-alerts-api', exports.tradingviewAlertsApi);
functions.http('tradingview-health-check', exports.tradingviewHealthCheck);
