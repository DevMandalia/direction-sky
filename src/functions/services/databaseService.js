"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseService = exports.DatabaseService = void 0;
const bigquery_1 = require("@google-cloud/bigquery");
const ioredis_1 = require("ioredis");
class DatabaseService {
    config;
    bigquery;
    redisClient = null;
    constructor(config) {
        this.config = config;
        this.bigquery = new bigquery_1.BigQuery({
            projectId: config.projectId,
            keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
        });
        this.initializeRedis();
    }
    async initializeRedis() {
        try {
            if (this.config.redisUrl) {
                this.redisClient = new ioredis_1.Redis(this.config.redisUrl);
                console.log('Redis client initialized');
            }
        }
        catch (error) {
            console.error('Failed to initialize Redis client:', error);
        }
    }
    async initializeTable() {
        try {
            const dataset = this.bigquery.dataset(this.config.datasetId);
            const table = dataset.table(this.config.tableId);
            const [exists] = await table.exists();
            if (exists) {
                console.log(`Table ${this.config.tableId} already exists`);
                return;
            }
            const schema = [
                { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
                { name: 'metric', type: 'STRING', mode: 'REQUIRED' },
                { name: 'source', type: 'STRING', mode: 'REQUIRED' },
                { name: 'value', type: 'FLOAT64', mode: 'REQUIRED' },
                { name: 'date', type: 'DATE', mode: 'REQUIRED' },
                { name: 'metadata', type: 'JSON', mode: 'NULLABLE' },
                { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' }
            ];
            const options = {
                schema,
                timePartitioning: {
                    type: 'DAY',
                    field: 'date'
                }
            };
            await table.create(options);
            console.log(`Table ${this.config.tableId} created successfully`);
        }
        catch (error) {
            console.error('Error initializing BigQuery table:', error);
            throw error;
        }
    }
    async storeFREDData(fredResponse, metricName, metadata) {
        try {
            const rows = fredResponse.observations.map((observation) => ({
                timestamp: new Date(observation.date).toISOString(),
                metric: metricName,
                source: 'fred',
                value: parseFloat(observation.value) || 0,
                date: observation.date,
                metadata: JSON.stringify({
                    ...metadata,
                    realtime_start: observation.realtime_start,
                    realtime_end: observation.realtime_end,
                    series_id: metadata.series_id
                }),
                created_at: new Date().toISOString()
            }));
            const dataset = this.bigquery.dataset(this.config.datasetId);
            const table = dataset.table(this.config.tableId);
            await table.insert(rows);
            console.log(`Stored ${rows.length} data points for ${metricName}`);
            if (this.redisClient) {
                const latestValue = fredResponse.observations[0];
                await this.redisClient.setex(`fred:${metricName}:latest`, 3600, JSON.stringify({
                    value: latestValue.value,
                    date: latestValue.date,
                    timestamp: Date.now()
                }));
            }
        }
        catch (error) {
            console.error(`Error storing FRED data for ${metricName}:`, error);
            throw error;
        }
    }
    async getHistoricalFREDData(metricName, options = {}) {
        const cacheKey = `fred:${metricName}:history:${JSON.stringify(options)}`;
        if (this.redisClient) {
            const cached = await this.redisClient.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
        }
        try {
            const startTime = options.startTime || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const endTime = options.endTime || new Date();
            const limit = options.limit || 1000;
            let query = `
        SELECT 
          timestamp,
          value,
          metric,
          source,
          date,
          metadata
        FROM \`${this.config.projectId}.${this.config.datasetId}.${this.config.tableId}\`
        WHERE metric = @metric 
          AND source = 'fred'
          AND timestamp >= @startTime
          AND timestamp <= @endTime
        ORDER BY timestamp DESC
        LIMIT @limit
      `;
            const queryOptions = {
                query,
                params: {
                    metric: metricName,
                    startTime: startTime.toISOString(),
                    endTime: endTime.toISOString(),
                    limit
                }
            };
            const [rows] = await this.bigquery.query(queryOptions);
            const dataPoints = rows.map((row) => ({
                timestamp: new Date(row.timestamp.value || row.timestamp).getTime(),
                value: row.value,
                metric: row.metric,
                source: row.source,
                date: row.date,
                metadata: row.metadata ? JSON.parse(row.metadata) : null
            }));
            if (this.redisClient) {
                await this.redisClient.setex(cacheKey, 300, JSON.stringify(dataPoints));
            }
            return dataPoints;
        }
        catch (error) {
            console.error(`Error retrieving historical data for ${metricName}:`, error);
            throw error;
        }
    }
    async getLatestFREDValue(metricName) {
        if (this.redisClient) {
            const cached = await this.redisClient.get(`fred:${metricName}:latest`);
            if (cached) {
                const data = JSON.parse(cached);
                return {
                    timestamp: data.timestamp,
                    value: data.value,
                    metric: metricName,
                    source: 'fred',
                    date: data.date
                };
            }
        }
        try {
            const query = `
        SELECT 
          timestamp,
          value,
          metric,
          source,
          date
        FROM \`${this.config.projectId}.${this.config.datasetId}.${this.config.tableId}\`
        WHERE metric = @metric 
          AND source = 'fred'
        ORDER BY timestamp DESC
        LIMIT 1
      `;
            const [rows] = await this.bigquery.query({
                query,
                params: { metric: metricName }
            });
            if (rows.length === 0)
                return null;
            const row = rows[0];
            return {
                timestamp: new Date(row.timestamp.value || row.timestamp).getTime(),
                value: row.value,
                metric: row.metric,
                source: row.source,
                date: row.date
            };
        }
        catch (error) {
            console.error(`Error getting latest value for ${metricName}:`, error);
            return null;
        }
    }
    async getTrendAnalysis(metricName, period = '30d') {
        const periods = {
            '1d': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000,
            '90d': 90 * 24 * 60 * 60 * 1000,
            '1y': 365 * 24 * 60 * 60 * 1000
        };
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - periods[period]);
        try {
            const query = `
        WITH daily_avg AS (
          SELECT 
            DATE(timestamp) as date,
            AVG(value) as avg_value,
            COUNT(*) as data_points
          FROM \`${this.config.projectId}.${this.config.datasetId}.${this.config.tableId}\`
          WHERE metric = @metric 
            AND source = 'fred'
            AND timestamp >= @startTime
            AND timestamp <= @endTime
          GROUP BY DATE(timestamp)
          ORDER BY date
        ),
        stats AS (
          SELECT 
            FIRST_VALUE(avg_value) OVER (ORDER BY date) as earliest_value,
            LAST_VALUE(avg_value) OVER (ORDER BY date ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) as latest_value,
            AVG(avg_value) OVER () as mean_value,
            STDDEV(avg_value) OVER () as stddev_value,
            COUNT(*) OVER () as total_days
          FROM daily_avg
        )
        SELECT 
          @metric as metric,
          @period as period,
          earliest_value,
          latest_value,
          (latest_value - earliest_value) as change,
          CASE 
            WHEN earliest_value != 0 THEN ((latest_value - earliest_value) / earliest_value) * 100 
            ELSE 0 
          END as change_percent,
          stddev_value as volatility,
          total_days as data_points
        FROM stats
        LIMIT 1
      `;
            const [rows] = await this.bigquery.query({
                query,
                params: {
                    metric: metricName,
                    period,
                    startTime: startTime.toISOString(),
                    endTime: endTime.toISOString()
                }
            });
            if (rows.length === 0) {
                return {
                    metric: metricName,
                    period,
                    trend: 'insufficient_data',
                    change: 0,
                    changePercent: 0,
                    volatility: 0,
                    dataPoints: 0
                };
            }
            const row = rows[0];
            const changePercent = row.change_percent;
            let trend = 'sideways';
            if (changePercent > 5)
                trend = 'up';
            else if (changePercent < -5)
                trend = 'down';
            return {
                metric: metricName,
                period,
                trend,
                change: row.change,
                changePercent: row.change_percent,
                volatility: row.volatility,
                dataPoints: row.data_points,
                latestValue: row.latest_value,
                earliestValue: row.earliest_value
            };
        }
        catch (error) {
            console.error(`Error calculating trend analysis for ${metricName}:`, error);
            return {
                metric: metricName,
                period,
                trend: 'error',
                change: 0,
                changePercent: 0,
                volatility: 0,
                dataPoints: 0,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async getMultiMetricTrendAnalysis(metrics, period = '30d') {
        const promises = metrics.map(metric => this.getTrendAnalysis(metric, period));
        return Promise.all(promises);
    }
    async getCorrelationAnalysis(metric1, metric2, period = '30d') {
        const periods = {
            '30d': 30 * 24 * 60 * 60 * 1000,
            '90d': 90 * 24 * 60 * 60 * 1000,
            '1y': 365 * 24 * 60 * 60 * 1000
        };
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - periods[period]);
        try {
            const query = `
        WITH daily_data AS (
          SELECT 
            DATE(timestamp) as date,
            metric,
            AVG(value) as avg_value
          FROM \`${this.config.projectId}.${this.config.datasetId}.${this.config.tableId}\`
          WHERE metric IN (@metric1, @metric2)
            AND source = 'fred'
            AND timestamp >= @startTime
            AND timestamp <= @endTime
          GROUP BY DATE(timestamp), metric
        ),
        pivoted_data AS (
          SELECT 
            date,
            MAX(CASE WHEN metric = @metric1 THEN avg_value END) as value1,
            MAX(CASE WHEN metric = @metric2 THEN avg_value END) as value2
          FROM daily_data
          GROUP BY date
          HAVING value1 IS NOT NULL AND value2 IS NOT NULL
        ),
        correlation AS (
          SELECT 
            CORR(value1, value2) as correlation_coefficient,
            COUNT(*) as data_points
          FROM pivoted_data
        )
        SELECT 
          @metric1 as metric1,
          @metric2 as metric2,
          @period as period,
          correlation_coefficient,
          data_points
        FROM correlation
      `;
            const [rows] = await this.bigquery.query({
                query,
                params: {
                    metric1,
                    metric2,
                    period,
                    startTime: startTime.toISOString(),
                    endTime: endTime.toISOString()
                }
            });
            if (rows.length === 0) {
                return {
                    metric1,
                    metric2,
                    period,
                    correlation: 0,
                    dataPoints: 0,
                    strength: 'no_data'
                };
            }
            const row = rows[0];
            const correlation = row.correlation_coefficient || 0;
            let strength = 'no_correlation';
            if (correlation >= 0.7)
                strength = 'strong_positive';
            else if (correlation >= 0.3)
                strength = 'moderate_positive';
            else if (correlation >= 0.1)
                strength = 'weak_positive';
            else if (correlation <= -0.7)
                strength = 'strong_negative';
            else if (correlation <= -0.3)
                strength = 'moderate_negative';
            else if (correlation <= -0.1)
                strength = 'weak_negative';
            return {
                metric1,
                metric2,
                period,
                correlation,
                dataPoints: row.data_points,
                strength
            };
        }
        catch (error) {
            console.error(`Error calculating correlation for ${metric1} and ${metric2}:`, error);
            return {
                metric1,
                metric2,
                period,
                correlation: 0,
                dataPoints: 0,
                strength: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async initializeXTable() {
        try {
            const dataset = this.bigquery.dataset(this.config.datasetId);
            const table = dataset.table('x_sentiment_data');
            const [exists] = await table.exists();
            if (exists) {
                console.log('Table x_sentiment_data already exists');
                return;
            }
            const schema = [
                { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
                { name: 'source', type: 'STRING', mode: 'REQUIRED' },
                { name: 'query', type: 'STRING', mode: 'REQUIRED' },
                { name: 'total_tweets', type: 'INT64', mode: 'REQUIRED' },
                { name: 'sentiment_analysis', type: 'JSON', mode: 'REQUIRED' },
                { name: 'engagement_metrics', type: 'JSON', mode: 'REQUIRED' },
                { name: 'keyword_analysis', type: 'JSON', mode: 'REQUIRED' },
                { name: 'top_tweets', type: 'JSON', mode: 'REQUIRED' },
                { name: 'metadata', type: 'JSON', mode: 'REQUIRED' },
                { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' }
            ];
            const options = {
                schema,
                timePartitioning: {
                    type: 'DAY',
                    field: 'timestamp'
                }
            };
            await table.create(options);
            console.log('Table x_sentiment_data created successfully');
        }
        catch (error) {
            console.error('Error initializing X sentiment table:', error);
            throw error;
        }
    }
    async storeXData(xSentimentData, metricName) {
        try {
            await this.initializeXTable();
            const row = {
                timestamp: new Date(xSentimentData.timestamp).toISOString(),
                source: xSentimentData.source,
                query: xSentimentData.query,
                total_tweets: xSentimentData.total_tweets,
                sentiment_analysis: JSON.stringify(xSentimentData.sentiment_analysis),
                engagement_metrics: JSON.stringify(xSentimentData.engagement_metrics),
                keyword_analysis: JSON.stringify(xSentimentData.keyword_analysis),
                top_tweets: JSON.stringify(xSentimentData.top_tweets),
                metadata: JSON.stringify({
                    metric_name: metricName,
                    stored_at: Date.now(),
                    processing_time: 0,
                    keywords_tracked: ['bitcoin', 'btc', 'hodl', 'diamond hands', 'paper hands'],
                    accounts_monitored: xSentimentData.source === 'x_account' ? [xSentimentData.query] : undefined
                }),
                created_at: new Date().toISOString()
            };
            const dataset = this.bigquery.dataset(this.config.datasetId);
            const table = dataset.table('x_sentiment_data');
            await table.insert([row]);
            console.log(`Stored X sentiment data for ${metricName}`);
            if (this.redisClient) {
                await this.redisClient.setex(`x_sentiment:${metricName}:latest`, 1800, JSON.stringify({
                    sentiment_score: xSentimentData.sentiment_analysis.average_sentiment_score,
                    total_tweets: xSentimentData.total_tweets,
                    timestamp: Date.now()
                }));
            }
        }
        catch (error) {
            console.error(`Error storing X sentiment data for ${metricName}:`, error);
            throw error;
        }
    }
    async getLatestXSentiment(metricName) {
        if (this.redisClient) {
            const cached = await this.redisClient.get(`x_sentiment:${metricName}:latest`);
            if (cached) {
                return JSON.parse(cached);
            }
        }
        try {
            const query = `
        SELECT 
          timestamp,
          sentiment_analysis,
          engagement_metrics,
          keyword_analysis,
          total_tweets
        FROM \`${this.config.projectId}.${this.config.datasetId}.x_sentiment_data\`
        WHERE query = @metricName
        ORDER BY timestamp DESC
        LIMIT 1
      `;
            const [rows] = await this.bigquery.query({
                query,
                params: { metricName }
            });
            if (rows.length === 0)
                return null;
            const row = rows[0];
            return {
                timestamp: new Date(row.timestamp.value || row.timestamp).getTime(),
                sentiment_analysis: JSON.parse(row.sentiment_analysis),
                engagement_metrics: JSON.parse(row.engagement_metrics),
                keyword_analysis: JSON.parse(row.keyword_analysis),
                total_tweets: row.total_tweets
            };
        }
        catch (error) {
            console.error(`Error getting latest X sentiment for ${metricName}:`, error);
            return null;
        }
    }
    async initializeCoinMarketCapTable() {
        try {
            const dataset = this.bigquery.dataset(this.config.datasetId);
            const table = dataset.table('coinmarketcap_fear_greed');
            const [exists] = await table.exists();
            if (exists) {
                console.log('Table coinmarketcap_fear_greed already exists');
                return;
            }
            const schema = [
                { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
                { name: 'value', type: 'INT64', mode: 'REQUIRED' },
                { name: 'value_classification', type: 'STRING', mode: 'REQUIRED' },
                { name: 'time_until_update', type: 'INT64', mode: 'REQUIRED' },
                { name: 'metadata', type: 'JSON', mode: 'REQUIRED' },
                { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' }
            ];
            const options = {
                schema,
                timePartitioning: {
                    type: 'DAY',
                    field: 'timestamp'
                }
            };
            await table.create(options);
            console.log('Table coinmarketcap_fear_greed created successfully');
        }
        catch (error) {
            console.error('Error initializing CoinMarketCap Fear and Greed table:', error);
            throw error;
        }
    }
    async storeCoinMarketCapData(coinmarketcapResponse, metricName, metadata) {
        try {
            await this.initializeCoinMarketCapTable();
            const row = {
                timestamp: new Date(coinmarketcapResponse.data.timestamp).toISOString(),
                value: coinmarketcapResponse.data.value,
                value_classification: coinmarketcapResponse.data.value_classification,
                time_until_update: coinmarketcapResponse.data.time_until_update,
                metadata: JSON.stringify({
                    ...metadata,
                    source: 'coinmarketcap',
                    stored_at: Date.now(),
                    api_credits_used: coinmarketcapResponse.status.credit_count,
                    api_elapsed: coinmarketcapResponse.status.elapsed,
                    api_error_code: coinmarketcapResponse.status.error_code,
                    api_error_message: coinmarketcapResponse.status.error_message
                }),
                created_at: new Date().toISOString()
            };
            const dataset = this.bigquery.dataset(this.config.datasetId);
            const table = dataset.table('coinmarketcap_fear_greed');
            await table.insert([row]);
            console.log(`Stored CoinMarketCap Fear and Greed data: value=${row.value}, classification=${row.value_classification}`);
            if (this.redisClient) {
                await this.redisClient.setex(`coinmarketcap:fear_greed:latest`, 1800, JSON.stringify({
                    value: row.value,
                    value_classification: row.value_classification,
                    timestamp: Date.now(),
                    time_until_update: row.time_until_update
                }));
            }
        }
        catch (error) {
            console.error(`Error storing CoinMarketCap Fear and Greed data:`, error);
            throw error;
        }
    }
    async getLatestCoinMarketCapFearGreed() {
        if (this.redisClient) {
            const cached = await this.redisClient.get(`coinmarketcap:fear_greed:latest`);
            if (cached) {
                return JSON.parse(cached);
            }
        }
        try {
            const query = `
        SELECT 
          timestamp,
          value,
          value_classification,
          time_until_update,
          metadata
        FROM \`${this.config.projectId}.${this.config.datasetId}.coinmarketcap_fear_greed\`
        ORDER BY timestamp DESC
        LIMIT 1
      `;
            const [rows] = await this.bigquery.query({ query });
            if (rows.length === 0)
                return null;
            const row = rows[0];
            return {
                timestamp: new Date(row.timestamp.value || row.timestamp).getTime(),
                value: row.value,
                value_classification: row.value_classification,
                time_until_update: row.time_until_update,
                metadata: row.metadata ? JSON.parse(row.metadata) : null
            };
        }
        catch (error) {
            console.error(`Error getting latest CoinMarketCap Fear and Greed data:`, error);
            return null;
        }
    }
    async getHistoricalCoinMarketCapFearGreed(options = {}) {
        const cacheKey = `coinmarketcap:fear_greed:history:${JSON.stringify(options)}`;
        if (this.redisClient) {
            const cached = await this.redisClient.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
        }
        try {
            const startTime = options.startTime || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const endTime = options.endTime || new Date();
            const limit = options.limit || 1000;
            let query = `
        SELECT 
          timestamp,
          value,
          value_classification,
          time_until_update,
          metadata
        FROM \`${this.config.projectId}.${this.config.datasetId}.coinmarketcap_fear_greed\`
        WHERE timestamp >= @startTime
          AND timestamp <= @endTime
        ORDER BY timestamp DESC
        LIMIT @limit
      `;
            const queryOptions = {
                query,
                params: {
                    startTime: startTime.toISOString(),
                    endTime: endTime.toISOString(),
                    limit
                }
            };
            const [rows] = await this.bigquery.query(queryOptions);
            const dataPoints = rows.map((row) => ({
                timestamp: new Date(row.timestamp.value || row.timestamp).getTime(),
                value: row.value,
                value_classification: row.value_classification,
                time_until_update: row.time_until_update,
                metadata: row.metadata ? JSON.parse(row.metadata) : null
            }));
            if (this.redisClient) {
                await this.redisClient.setex(cacheKey, 300, JSON.stringify(dataPoints));
            }
            return dataPoints;
        }
        catch (error) {
            console.error(`Error retrieving historical CoinMarketCap Fear and Greed data:`, error);
            throw error;
        }
    }
    async cleanupOldData() {
        try {
            const cutoffDate = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000);
            const query = `
        DELETE FROM \`${this.config.projectId}.${this.config.datasetId}.${this.config.tableId}\`
        WHERE timestamp < @cutoffDate
      `;
            const [job] = await this.bigquery.query({
                query,
                params: { cutoffDate: cutoffDate.toISOString() }
            });
            console.log(`Cleaned up data older than ${cutoffDate.toISOString()}`);
        }
        catch (error) {
            console.error('Error during data cleanup:', error);
        }
    }
}
exports.DatabaseService = DatabaseService;
exports.databaseService = new DatabaseService({
    projectId: process.env.GOOGLE_CLOUD_PROJECT || '',
    datasetId: process.env.BIGQUERY_DATASET || 'direction_sky_data',
    tableId: process.env.BIGQUERY_TABLE || 'fred_metrics',
    redisUrl: process.env.REDIS_URL,
    region: process.env.GOOGLE_CLOUD_REGION || 'us-central1'
});
//# sourceMappingURL=databaseService.js.map