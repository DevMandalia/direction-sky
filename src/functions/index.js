const functions = require('@google-cloud/functions-framework');

// Export handlers for Cloud Functions (pure JS)
exports.polygonOptionsDataFetcher = require('./polygonOptionsDataFetcher').polygonOptionsDataFetcher;
exports.polygonHealthCheck = require('./polygonOptionsDataFetcher').polygonHealthCheck;
exports.fredDataFetcher = require('./fredDataFetcher').fredDataFetcher;
exports.coinmarketcapDataFetcher = require('./coinmarketcapDataFetcher').coinmarketcapDataFetcher;
exports.xDataFetcher = require('./xDataFetcher').xDataFetcher;

// Optional local registration for functions-framework
functions.http('polygon-options-fetcher', exports.polygonOptionsDataFetcher);
functions.http('fred-fetcher', exports.fredDataFetcher);
functions.http('coinmarketcap-fetcher', exports.coinmarketcapDataFetcher);
functions.http('x-fetcher', exports.xDataFetcher);
