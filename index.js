const functions = require('@google-cloud/functions-framework');

// Import all function handlers
const { dataIngestion } = require('./dist/functions/dataIngestion');
const { glassnodeDataFetcher } = require('./dist/functions/glassnodeDataFetcher');
const { coinglassDataFetcher } = require('./dist/functions/coinglassDataFetcher');
const { fredDataFetcher } = require('./dist/functions/fredDataFetcher');
const { binanceDataFetcher } = require('./dist/functions/binanceDataFetcher');

// Register HTTP functions
functions.http('data-ingestion', dataIngestion);
functions.http('glassnode-fetcher', glassnodeDataFetcher);
functions.http('coinglass-fetcher', coinglassDataFetcher);
functions.http('fred-fetcher', fredDataFetcher);
functions.http('binance-fetcher', binanceDataFetcher); 