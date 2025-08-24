"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.polygonDatabaseService = exports.PolygonDatabaseService = void 0;
const bigquery_1 = require("@google-cloud/bigquery");
const { Storage } = require('@google-cloud/storage');
class PolygonDatabaseService {
    constructor() {
        this.projectId = process.env.GOOGLE_CLOUD_PROJECT || '';
        this.datasetId = process.env.BIGQUERY_DATASET || 'direction_sky_data';
        this.bigquery = new bigquery_1.BigQuery({
            projectId: this.projectId,
            keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
        });
        this.storage = new Storage({
            projectId: this.projectId,
            keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
        });
    }
    // Initialize all Polygon.io tables
    async initializeTables() {
        try {
            console.log('Initializing Polygon.io BigQuery tables...');
            await Promise.all([
                this.initializeOptionsTable(),
                this.initializeOptionsStagingTable(),
                this.initializeStockTable(),
                this.initializeCryptoTable(),
                this.initializeRealTimeTable()
            ]);
            console.log('All Polygon.io tables initialized successfully');
        }
        catch (error) {
            console.error('Error initializing Polygon.io tables:', error);
            throw error;
        }
    }
    // Initialize Options table with comprehensive fields
    async initializeOptionsTable() {
        const tableId = 'polygon_options';
        // Schema definition for polygon_options table
        // Composite Primary Key: (date, contract_id)
        // - date: Trading date in EST (daily granularity)
        // - contract_id: Unique options contract identifier
        // Partitioned by date and clustered by contract_id for performance
        const schema = [
            // Primary Keys - Daily granularity structure
            { name: 'date', type: 'DATE', mode: 'REQUIRED' },
            { name: 'contract_id', type: 'STRING', mode: 'REQUIRED' },
            // Timestamps
            { name: 'insert_timestamp', type: 'TIMESTAMP', mode: 'NULLABLE' },
            { name: 'last_updated', type: 'TIMESTAMP', mode: 'NULLABLE' },
            // Contract Details
            { name: 'underlying_asset', type: 'STRING', mode: 'REQUIRED' },
            { name: 'contract_type', type: 'STRING', mode: 'REQUIRED' },
            // Contract Details
            { name: 'strike_price', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'expiration_date', type: 'DATE', mode: 'NULLABLE' },
            { name: 'exercise_style', type: 'STRING', mode: 'NULLABLE' },
            { name: 'shares_per_contract', type: 'INT64', mode: 'NULLABLE' },
            { name: 'primary_exchange', type: 'STRING', mode: 'NULLABLE' },
            { name: 'currency', type: 'STRING', mode: 'NULLABLE' },
            // Underlying Asset Data
            { name: 'underlying_price', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'underlying_timestamp', type: 'TIMESTAMP', mode: 'NULLABLE' },
            // Comprehensive Greeks
            { name: 'delta', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'gamma', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'theta', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'vega', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'rho', type: 'FLOAT64', mode: 'NULLABLE' },
            // Advanced Greeks (if available)
            { name: 'lambda', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'epsilon', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'charm', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'vanna', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'volga', type: 'FLOAT64', mode: 'NULLABLE' },
            // Quote Data (NBBO - National Best Bid and Offer)
            { name: 'bid', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'ask', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'bid_size', type: 'INT64', mode: 'NULLABLE' },
            { name: 'ask_size', type: 'INT64', mode: 'NULLABLE' },
            { name: 'mid_price', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'spread', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'spread_percentage', type: 'FLOAT64', mode: 'NULLABLE' },
            // Trade Data
            { name: 'last_price', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'last_size', type: 'INT64', mode: 'NULLABLE' },
            { name: 'last_trade_exchange', type: 'INT64', mode: 'NULLABLE' },
            { name: 'last_trade_conditions', type: 'STRING', mode: 'REPEATED' },
            // Market Data
            { name: 'volume', type: 'INT64', mode: 'NULLABLE' },
            { name: 'open_interest', type: 'INT64', mode: 'NULLABLE' },
            { name: 'implied_volatility', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'historical_volatility', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'min_av', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'min_av_timestamp', type: 'TIMESTAMP', mode: 'NULLABLE' },
            // Previous Day Data
            { name: 'prev_day_volume', type: 'INT64', mode: 'NULLABLE' },
            { name: 'prev_day_open_interest', type: 'INT64', mode: 'NULLABLE' },
            { name: 'prev_day_high', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'prev_day_low', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'prev_day_close', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'prev_day_vwap', type: 'FLOAT64', mode: 'NULLABLE' },
            // Options-Specific Data
            { name: 'days_to_expiration', type: 'INT64', mode: 'NULLABLE' },
            { name: 'time_value', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'intrinsic_value', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'extrinsic_value', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'moneyness', type: 'STRING', mode: 'NULLABLE' }, // ITM, OTM, ATM
            { name: 'leverage', type: 'FLOAT64', mode: 'NULLABLE' },
            // Risk Metrics
            { name: 'probability_itm', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'probability_otm', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'max_loss', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'max_profit', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'break_even_price', type: 'FLOAT64', mode: 'NULLABLE' },
            // Calculated Score (from your previous request)
            { name: 'score', type: 'FLOAT64', mode: 'NULLABLE' },
            // Timestamps
            { name: 'quote_timestamp', type: 'TIMESTAMP', mode: 'NULLABLE' },
            { name: 'trade_timestamp', type: 'TIMESTAMP', mode: 'NULLABLE' },
            { name: 'participant_timestamp', type: 'TIMESTAMP', mode: 'NULLABLE' },
            { name: 'chain_timestamp', type: 'TIMESTAMP', mode: 'NULLABLE' },
            // Exchange and Market Data
            { name: 'exchange', type: 'INT64', mode: 'NULLABLE' },
            { name: 'conditions', type: 'STRING', mode: 'REPEATED' },
            { name: 'market_center', type: 'STRING', mode: 'NULLABLE' },
            { name: 'tick_size', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'lot_size', type: 'INT64', mode: 'NULLABLE' },
            // Regulatory and Compliance
            { name: 'is_penny', type: 'BOOLEAN', mode: 'NULLABLE' },
            { name: 'is_weekly', type: 'BOOLEAN', mode: 'NULLABLE' },
            { name: 'is_monthly', type: 'BOOLEAN', mode: 'NULLABLE' },
            { name: 'is_quarterly', type: 'BOOLEAN', mode: 'NULLABLE' },
            { name: 'is_standard', type: 'BOOLEAN', mode: 'NULLABLE' },
            // Data Quality and Metadata
            { name: 'data_source', type: 'STRING', mode: 'NULLABLE' }, // 'polygon', 'real_time', 'batch'
            { name: 'data_quality_score', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'raw_data', type: 'JSON', mode: 'NULLABLE' },
            { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' }
        ];
        await this.createTableIfNotExists(tableId, schema);
    }
    // Initialize Options staging table (fast path for set-based MERGE)
    async initializeOptionsStagingTable() {
        const tableId = 'polygon_options_staging';
        const schema = [
            { name: 'date', type: 'DATE', mode: 'REQUIRED' },
            { name: 'contract_id', type: 'STRING', mode: 'REQUIRED' },
            { name: 'insert_timestamp', type: 'TIMESTAMP', mode: 'NULLABLE' },
            { name: 'last_updated', type: 'TIMESTAMP', mode: 'NULLABLE' },
            { name: 'underlying_asset', type: 'STRING', mode: 'REQUIRED' },
            { name: 'contract_type', type: 'STRING', mode: 'REQUIRED' },
            { name: 'strike_price', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'expiration_date', type: 'DATE', mode: 'NULLABLE' },
            { name: 'exercise_style', type: 'STRING', mode: 'NULLABLE' },
            { name: 'shares_per_contract', type: 'INT64', mode: 'NULLABLE' },
            { name: 'primary_exchange', type: 'STRING', mode: 'NULLABLE' },
            { name: 'currency', type: 'STRING', mode: 'NULLABLE' },
            { name: 'underlying_price', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'underlying_timestamp', type: 'TIMESTAMP', mode: 'NULLABLE' },
            { name: 'delta', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'gamma', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'theta', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'vega', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'rho', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'lambda', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'epsilon', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'charm', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'vanna', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'volga', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'bid', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'ask', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'bid_size', type: 'INT64', mode: 'NULLABLE' },
            { name: 'ask_size', type: 'INT64', mode: 'NULLABLE' },
            { name: 'mid_price', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'spread', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'spread_percentage', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'last_price', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'last_size', type: 'INT64', mode: 'NULLABLE' },
            { name: 'last_trade_exchange', type: 'INT64', mode: 'NULLABLE' },
            { name: 'last_trade_conditions', type: 'STRING', mode: 'NULLABLE' },
            { name: 'volume', type: 'INT64', mode: 'NULLABLE' },
            { name: 'open_interest', type: 'INT64', mode: 'NULLABLE' },
            { name: 'implied_volatility', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'historical_volatility', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'min_av', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'min_av_timestamp', type: 'TIMESTAMP', mode: 'NULLABLE' },
            { name: 'prev_day_volume', type: 'INT64', mode: 'NULLABLE' },
            { name: 'prev_day_open_interest', type: 'INT64', mode: 'NULLABLE' },
            { name: 'prev_day_high', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'prev_day_low', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'prev_day_close', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'prev_day_vwap', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'days_to_expiration', type: 'INT64', mode: 'NULLABLE' },
            { name: 'time_value', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'intrinsic_value', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'extrinsic_value', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'moneyness', type: 'STRING', mode: 'NULLABLE' },
            { name: 'leverage', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'probability_itm', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'probability_otm', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'max_loss', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'max_profit', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'break_even_price', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'score', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'quote_timestamp', type: 'TIMESTAMP', mode: 'NULLABLE' },
            { name: 'trade_timestamp', type: 'TIMESTAMP', mode: 'NULLABLE' },
            { name: 'participant_timestamp', type: 'TIMESTAMP', mode: 'NULLABLE' },
            { name: 'chain_timestamp', type: 'TIMESTAMP', mode: 'NULLABLE' },
            { name: 'exchange', type: 'INT64', mode: 'NULLABLE' },
            { name: 'conditions', type: 'STRING', mode: 'NULLABLE' },
            { name: 'market_center', type: 'STRING', mode: 'NULLABLE' },
            { name: 'tick_size', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'lot_size', type: 'INT64', mode: 'NULLABLE' },
            { name: 'is_penny', type: 'BOOLEAN', mode: 'NULLABLE' },
            { name: 'is_weekly', type: 'BOOLEAN', mode: 'NULLABLE' },
            { name: 'is_monthly', type: 'BOOLEAN', mode: 'NULLABLE' },
            { name: 'is_quarterly', type: 'BOOLEAN', mode: 'NULLABLE' },
            { name: 'is_standard', type: 'BOOLEAN', mode: 'NULLABLE' },
            { name: 'data_source', type: 'STRING', mode: 'NULLABLE' },
            { name: 'data_quality_score', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' }
        ];
        const dataset = this.bigquery.dataset(this.datasetId);
        const table = dataset.table(tableId);
        const [exists] = await table.exists();
        if (!exists) {
            await table.create({
                schema,
                location: 'US',
                timePartitioning: { type: 'DAY', field: 'date' },
                clustering: { fields: ['date', 'contract_id'] }
            });
            console.log(`Table ${tableId} created successfully (staging)`);
        }
        else {
            console.log(`Table ${tableId} already exists (staging)`);
        }
    }
    // Fast path: stage rows then set-based MERGE
    async storeOptionsDataFast(data) {
        const dataset = this.bigquery.dataset(this.datasetId);
        const staging = dataset.table('polygon_options_staging');
        // Build rows via existing formatter
        const rows = [];
        if ('options' in data) {
            if (data.options.calls) data.options.calls.forEach(c => rows.push(this.formatOptionsRow(c, 'call', data.underlying_asset)));
            if (data.options.puts) data.options.puts.forEach(p => rows.push(this.formatOptionsRow(p, 'put', data.underlying_asset)));
        }
        else {
            rows.push(this.formatOptionsRow(data, data.contract.contract_type, data.contract.underlying_asset));
        }
        if (rows.length === 0) return;
        // Stream into staging in chunks (read-only staging allows MERGE from it)
        const chunkSize = 500;
        for (let i = 0; i < rows.length; i += chunkSize) {
            const batch = rows.slice(i, i + chunkSize).map(r => {
                const { raw_data, ...rest } = r;
                return rest;
            });
            await staging.insert(batch);
        }
        // Single MERGE from staging for today (EST)
        const mergeSql = `
      MERGE \`${this.projectId}.${this.datasetId}.polygon_options\` AS target
      USING (
        SELECT * EXCEPT(rn)
        FROM (
          SELECT s.*, ROW_NUMBER() OVER (
            PARTITION BY s.contract_id, s.date
            ORDER BY s.last_updated DESC, s.created_at DESC
          ) AS rn
          FROM \`${this.projectId}.${this.datasetId}.polygon_options_staging\` s
          WHERE s.date = DATE(TIMESTAMP(CURRENT_TIMESTAMP()), "America/New_York")
        )
        WHERE rn = 1
      ) AS source
      ON target.contract_id = source.contract_id AND target.date = source.date
      WHEN MATCHED THEN UPDATE SET
        underlying_asset = source.underlying_asset,
        contract_type = source.contract_type,
        strike_price = source.strike_price,
        expiration_date = source.expiration_date,
        exercise_style = source.exercise_style,
        shares_per_contract = source.shares_per_contract,
        primary_exchange = source.primary_exchange,
        currency = source.currency,
        underlying_price = source.underlying_price,
        underlying_timestamp = source.underlying_timestamp,
        delta = source.delta,
        gamma = source.gamma,
        theta = source.theta,
        vega = source.vega,
        rho = source.rho,
        lambda = source.lambda,
        epsilon = source.epsilon,
        charm = source.charm,
        vanna = source.vanna,
        volga = source.volga,
        bid = source.bid,
        ask = source.ask,
        bid_size = source.bid_size,
        ask_size = source.ask_size,
        mid_price = source.mid_price,
        spread = source.spread,
        spread_percentage = source.spread_percentage,
        last_price = source.last_price,
        last_size = source.last_size,
        last_trade_exchange = source.last_trade_exchange,
        last_trade_conditions = source.last_trade_conditions,
        volume = source.volume,
        open_interest = source.open_interest,
        implied_volatility = source.implied_volatility,
        historical_volatility = source.historical_volatility,
        min_av = source.min_av,
        min_av_timestamp = source.min_av_timestamp,
        prev_day_volume = source.prev_day_volume,
        prev_day_open_interest = source.prev_day_open_interest,
        prev_day_high = source.prev_day_high,
        prev_day_low = source.prev_day_low,
        prev_day_close = source.prev_day_close,
        prev_day_vwap = source.prev_day_vwap,
        days_to_expiration = source.days_to_expiration,
        time_value = source.time_value,
        intrinsic_value = source.intrinsic_value,
        extrinsic_value = source.extrinsic_value,
        moneyness = source.moneyness,
        leverage = source.leverage,
        probability_itm = source.probability_itm,
        probability_otm = source.probability_otm,
        max_loss = source.max_loss,
        max_profit = source.max_profit,
        break_even_price = source.break_even_price,
        score = source.score,
        quote_timestamp = source.quote_timestamp,
        trade_timestamp = source.trade_timestamp,
        participant_timestamp = source.participant_timestamp,
        chain_timestamp = source.chain_timestamp,
        exchange = source.exchange,
        conditions = source.conditions,
        market_center = source.market_center,
        tick_size = source.tick_size,
        lot_size = source.lot_size,
        is_penny = source.is_penny,
        is_weekly = source.is_weekly,
        is_monthly = source.is_monthly,
        is_quarterly = source.is_quarterly,
        is_standard = source.is_standard,
        data_source = source.data_source,
        data_quality_score = source.data_quality_score,
        last_updated = source.last_updated,
        created_at = source.created_at
      WHEN NOT MATCHED THEN INSERT (
        date, underlying_asset, contract_id, contract_type, strike_price, expiration_date,
        exercise_style, shares_per_contract, primary_exchange, currency, underlying_price,
        underlying_timestamp, delta, gamma, theta, vega, rho, lambda, epsilon, charm,
        vanna, volga, bid, ask, bid_size, ask_size, mid_price, spread, spread_percentage,
        last_price, last_size, last_trade_exchange, last_trade_conditions, volume, open_interest,
        implied_volatility, historical_volatility, min_av, min_av_timestamp, prev_day_volume,
        prev_day_open_interest, prev_day_high, prev_day_low, prev_day_close, prev_day_vwap,
        days_to_expiration, time_value, intrinsic_value, extrinsic_value, moneyness, leverage,
        probability_itm, probability_otm, max_loss, max_profit, break_even_price, score,
        quote_timestamp, trade_timestamp, participant_timestamp, chain_timestamp, exchange,
        conditions, market_center, tick_size, lot_size, is_penny, is_weekly, is_monthly,
        is_quarterly, is_standard, data_source, data_quality_score, insert_timestamp, last_updated, raw_data, created_at
      ) VALUES (
        source.date, source.underlying_asset, source.contract_id, source.contract_type, source.strike_price, source.expiration_date,
        source.exercise_style, source.shares_per_contract, source.primary_exchange, source.currency, source.underlying_price,
        source.underlying_timestamp, source.delta, source.gamma, source.theta, source.vega, source.rho, source.lambda, source.epsilon, source.charm,
        source.vanna, source.volga, source.bid, source.ask, source.bid_size, source.ask_size, source.mid_price, source.spread, source.spread_percentage,
        source.last_price, source.last_size, source.last_trade_exchange, source.last_trade_conditions, source.volume, source.open_interest,
        source.implied_volatility, source.historical_volatility, source.min_av, source.min_av_timestamp, source.prev_day_volume,
        source.prev_day_open_interest, source.prev_day_high, source.prev_day_low, source.prev_day_close, source.prev_day_vwap,
        source.days_to_expiration, source.time_value, source.intrinsic_value, source.extrinsic_value, source.moneyness, source.leverage,
        source.probability_itm, source.probability_otm, source.max_loss, source.max_profit, source.break_even_price, source.score,
        source.quote_timestamp, source.trade_timestamp, source.participant_timestamp, source.chain_timestamp, source.exchange,
        source.conditions, source.market_center, source.tick_size, source.lot_size, source.is_penny, source.is_weekly, source.is_monthly,
        source.is_quarterly, source.is_standard, source.data_source, source.data_quality_score, source.insert_timestamp, source.last_updated, CAST(NULL AS JSON), TIMESTAMP(source.created_at)
      )`;
        await this.bigquery.query({ query: mergeSql });
        console.log(`Fast-path MERGE complete for ${rows.length} options contracts`);
    }
    // Initialize Stock table
    async initializeStockTable() {
        const tableId = 'polygon_stocks';
        const schema = [
            { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
            { name: 'ticker', type: 'STRING', mode: 'REQUIRED' },
            // Quote Data
            { name: 'bid', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'ask', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'bid_size', type: 'INT64', mode: 'NULLABLE' },
            { name: 'ask_size', type: 'INT64', mode: 'NULLABLE' },
            // Trade Data
            { name: 'last_price', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'last_size', type: 'INT64', mode: 'NULLABLE' },
            // Market Data
            { name: 'min_av', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'prev_day_volume', type: 'INT64', mode: 'NULLABLE' },
            { name: 'prev_day_vwap', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'prev_day_open', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'prev_day_high', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'prev_day_low', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'prev_day_close', type: 'FLOAT64', mode: 'NULLABLE' },
            // Timestamps
            { name: 'quote_timestamp', type: 'TIMESTAMP', mode: 'NULLABLE' },
            { name: 'trade_timestamp', type: 'TIMESTAMP', mode: 'NULLABLE' },
            { name: 'participant_timestamp', type: 'TIMESTAMP', mode: 'NULLABLE' },
            { name: 'updated', type: 'TIMESTAMP', mode: 'NULLABLE' },
            // Metadata
            { name: 'exchange', type: 'INT64', mode: 'NULLABLE' },
            { name: 'conditions', type: 'STRING', mode: 'REPEATED' },
            { name: 'raw_data', type: 'JSON', mode: 'NULLABLE' },
            { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' }
        ];
        await this.createTableIfNotExists(tableId, schema);
    }
    // Initialize Crypto table
    async initializeCryptoTable() {
        const tableId = 'polygon_crypto';
        const schema = [
            { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
            { name: 'ticker', type: 'STRING', mode: 'REQUIRED' },
            // Quote Data
            { name: 'bid', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'ask', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'bid_size', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'ask_size', type: 'FLOAT64', mode: 'NULLABLE' },
            // Trade Data
            { name: 'last_price', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'last_size', type: 'FLOAT64', mode: 'NULLABLE' },
            // Market Data
            { name: 'min_av', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'prev_day_volume', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'prev_day_vwap', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'prev_day_open', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'prev_day_high', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'prev_day_low', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'prev_day_close', type: 'FLOAT64', mode: 'NULLABLE' },
            // Timestamps
            { name: 'quote_timestamp', type: 'TIMESTAMP', mode: 'NULLABLE' },
            { name: 'trade_timestamp', type: 'TIMESTAMP', mode: 'NULLABLE' },
            { name: 'updated', type: 'TIMESTAMP', mode: 'NULLABLE' },
            // Metadata
            { name: 'exchange', type: 'INT64', mode: 'NULLABLE' },
            { name: 'conditions', type: 'STRING', mode: 'REPEATED' },
            { name: 'raw_data', type: 'JSON', mode: 'NULLABLE' },
            { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' }
        ];
        await this.createTableIfNotExists(tableId, schema);
    }
    // Initialize Real-time table
    async initializeRealTimeTable() {
        const tableId = 'polygon_realtime';
        const schema = [
            { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
            { name: 'event_type', type: 'STRING', mode: 'REQUIRED' },
            { name: 'contract_id', type: 'STRING', mode: 'NULLABLE' },
            { name: 'underlying_asset', type: 'STRING', mode: 'REQUIRED' },
            // Event Data
            { name: 'bid', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'ask', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'bid_size', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'ask_size', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'price', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'size', type: 'FLOAT64', mode: 'NULLABLE' },
            // Greeks
            { name: 'delta', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'gamma', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'theta', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'vega', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'rho', type: 'FLOAT64', mode: 'NULLABLE' },
            { name: 'implied_volatility', type: 'FLOAT64', mode: 'NULLABLE' },
            // Metadata
            { name: 'raw_data', type: 'JSON', mode: 'NULLABLE' },
            { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' }
        ];
        await this.createTableIfNotExists(tableId, schema);
    }
    // Create table if it doesn't exist
    async createTableIfNotExists(tableId, schema) {
        try {
            const dataset = this.bigquery.dataset(this.datasetId);
            const table = dataset.table(tableId);
            const [exists] = await table.exists();
            if (!exists) {
                // Configure table options based on table type
                let options = {
                    schema: schema,
                    location: 'US'
                };
                // Add specific configurations for polygon_options table
                if (tableId === 'polygon_options') {
                    options = {
                        ...options,
                        // Time partitioning by trading date
                        timePartitioning: {
                            type: 'DAY',
                            field: 'date'
                        },
                        // Clustering on date and contract_id
                        clustering: ['date', 'contract_id']
                    };
                }
                await table.create(options);
                console.log(`Table ${tableId} created successfully with clustering and time partitioning`);
            }
            else {
                console.log(`Table ${tableId} already exists`);
            }
        }
        catch (error) {
            console.error(`Error creating table ${tableId}:`, error);
            throw error;
        }
    }
    // Validate composite primary key constraint before insertion
    async validateCompositePrimaryKey(tableId, contractId, date) {
        try {
            if (tableId === 'polygon_options') {
                const dataset = this.bigquery.dataset(this.datasetId);
                const table = dataset.table(tableId);
                // Check if a record with the same contract_id and date already exists
                const query = `
          SELECT COUNT(*) as count
          FROM \`${this.projectId}.${this.datasetId}.${tableId}\`
          WHERE \`date\` = @trading_date 
          AND \`contract_id\` = @contract_identifier
        `;
                const jobConfig = {
                    query: query,
                    params: [
                        { name: 'trading_date', value: date },
                        { name: 'contract_identifier', value: contractId }
                    ]
                };
                const [rows] = await this.bigquery.query(jobConfig);
                const count = rows[0]?.count || 0;
                if (count > 0) {
                    console.warn(`Duplicate composite key detected: contract_id=${contractId}, date=${date}`);
                    return false;
                }
                return true;
            }
            return true; // For non-options tables, no validation needed
        }
        catch (error) {
            console.error('Error validating composite primary key:', error);
            // If validation fails, allow insertion to prevent blocking data flow
            return true;
        }
    }
    // Calculate options score based on the formula provided by the user
    calculateOptionsScore(contract) {
        try {
            const details = contract.details || contract.contract || contract;
            const greeks = contract.greeks || contract;
            const quoteData = contract.last_quote || contract.nbbo || contract;
            const dayData = contract.day || {};
            // Use only Polygon API values; do not fallback to other fields
            const theta = Number(greeks.theta) || 0;
            const gamma = Number(greeks.gamma) || 0;
            const delta = Number(greeks.delta) || 0;
            const vega = Number(greeks.vega) || 0;
            const bid = Number((quoteData && quoteData.bid != null) ? quoteData.bid : dayData.close);
            const strikePrice = Number(details?.strike_price);
            const expirationDate = details?.expiration_date || contract.expiration_date || null;
            // Validate presence (allow 0 values to pass through)
            if (!expirationDate) {
                return null;
            }
            if (!Number.isFinite(bid) || !Number.isFinite(strikePrice)) {
                return null;
            }
            // Calculate days to expiry
            const today = new Date();
            const expiryDate = new Date(expirationDate);
            const daysToExpiry = Math.max(1, Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
            // Calculate components of the score formula
            const thetaIncome = Math.abs(theta) * 100;
            const premiumYield = (bid / strikePrice) * (365 / daysToExpiry) * 2;
            const deltaRisk = delta * 50;
            const gammaRisk = gamma * 1000;
            const vegaRisk = vega * 10;
            // Calculate final score
            const score = thetaIncome + premiumYield - deltaRisk - gammaRisk - vegaRisk;
            return Math.round(score * 100) / 100; // Round to 2 decimal places
        }
        catch (error) {
            console.error('Error calculating options score:', error);
            return null;
        }
    }
    // Format options row for BigQuery with comprehensive data
    formatOptionsRow(contract, contractType, underlyingAsset) {
        // Handle both unified and regular contract formats
        const contractData = contract.contract || contract;
        const greeksData = contract.greeks || contract;
        const quoteData = contract.last_quote || contract.nbbo || contract;
        const tradeData = contract.last_trade || contract;
        // Extract data from the actual Polygon.io structure
        const details = contract.details || contractData;
        const dayData = contract.day || {};
        // Calculate days to expiration
        const today = new Date();
        const expiryDate = details.expiration_date ? new Date(details.expiration_date) : null;
        // Determine current EST trading date for composite primary key
        const now = new Date();
        const estNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        const tradingDate = estNow.toISOString().split('T')[0];
        // Skip rows strictly after expiration date
        if (expiryDate && tradingDate > details.expiration_date) {
            return null;
        }
        const daysToExpiration = expiryDate ? Math.max(0, Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))) : null;
        // Skip moneyness, intrinsic/extrinsic values, and leverage calculations since we don't have underlying price
        // Focus on the data that IS available from the API
        // Calculate spread and mid-price from available quote data
        const bid = quoteData.bid || dayData.close || null;
        const ask = quoteData.ask || dayData.close || null;
        const midPrice = bid && ask ? (bid + ask) / 2 : null;
        const spread = bid && ask ? ask - bid : null;
        const spreadPercentage = bid && ask && bid > 0 ? ((ask - bid) / bid) * 100 : null;
        // Calculate the options score using available data
        const score = this.calculateOptionsScore(contract);
        return {
            // Primary Keys and Identifiers
            date: tradingDate,
            underlying_asset: underlyingAsset,
            contract_id: details.ticker || contractData.contract_id || contract.contract_id || '',
            contract_type: contractType,
            // Contract Details
            strike_price: details.strike_price || contractData.strike_price || contract.strike_price || null,
            expiration_date: details.expiration_date || contractData.expiration_date || contract.expiration_date || null,
            exercise_style: details.exercise_style || contractData.exercise_style || contract.exercise_style || null,
            shares_per_contract: details.shares_per_contract || contractData.shares_per_contract || contract.shares_per_contract || null,
            primary_exchange: 'NASDAQ',
            currency: 'USD',
            // Underlying Asset Data - skip underlying price
            underlying_price: null,
            underlying_timestamp: null,
            // Comprehensive Greeks - extract from greeks object
            delta: greeksData.delta || null,
            gamma: greeksData.gamma || null,
            theta: greeksData.theta || null,
            vega: greeksData.vega || null,
            rho: greeksData.rho || null,
            // Advanced Greeks (if available)
            lambda: greeksData.lambda || null,
            epsilon: greeksData.epsilon || null,
            charm: greeksData.charm || null,
            vanna: greeksData.vanna || null,
            volga: greeksData.volga || null,
            // Quote Data (NBBO) - use available quote data
            bid: bid,
            ask: ask,
            bid_size: quoteData.bid_size || null,
            ask_size: quoteData.ask_size || null,
            mid_price: midPrice,
            spread: spread,
            spread_percentage: spreadPercentage,
            // Trade Data - use available trade data
            last_price: tradeData.price || dayData.close || null,
            last_size: tradeData.size || null,
            last_trade_exchange: tradeData.exchange || null,
            last_trade_conditions: Array.isArray(tradeData.conditions)
                ? tradeData.conditions.join(',')
                : (tradeData.conditions || null),
            // Market Data - extract from day data and other fields
            volume: dayData.volume || contract.volume || null,
            open_interest: contract.open_interest || null,
            implied_volatility: contract.implied_volatility || null,
            historical_volatility: contract.historical_volatility || null,
            min_av: contract.min_av?.av || null,
            min_av_timestamp: contract.min_av?.t ? new Date(contract.min_av.t) : null,
            // Previous Day Data - extract from available fields
            prev_day_volume: contract.prev_day_volume || dayData.volume || null,
            prev_day_open_interest: contract.prev_day_open_interest || null,
            prev_day_high: contract.prev_day_high || dayData.high || null,
            prev_day_low: contract.prev_day_low || dayData.low || null,
            prev_day_close: contract.prev_day_close || dayData.previous_close || null,
            prev_day_vwap: contract.prev_day_vwap || dayData.vwap || null,
            // Options-Specific Data - skip calculations that need underlying price
            days_to_expiration: daysToExpiration,
            time_value: null,
            intrinsic_value: null,
            extrinsic_value: null,
            moneyness: null,
            leverage: null,
            // Risk Metrics
            probability_itm: contract.probability_itm || null,
            probability_otm: contract.probability_itm || null,
            max_loss: contract.max_loss || null,
            max_profit: contract.max_profit || null,
            break_even_price: null,
            // Calculated Score
            score: score,
            // Timestamps - extract from available data
            quote_timestamp: quoteData.timestamp ? new Date(quoteData.timestamp) : (dayData.last_updated ? new Date(dayData.last_updated) : null),
            trade_timestamp: tradeData.timestamp ? new Date(tradeData.timestamp) : (dayData.last_updated ? new Date(dayData.last_updated) : null),
            participant_timestamp: quoteData.participant_timestamp ? new Date(quoteData.participant_timestamp) : null,
            chain_timestamp: contract.chain_timestamp ? new Date(contract.chain_timestamp) : null,
            // Exchange and Market Data
            exchange: tradeData.exchange || null,
            conditions: Array.isArray(tradeData.conditions)
                ? tradeData.conditions.join(',')
                : (tradeData.conditions || null),
            market_center: contract.market_center || null,
            tick_size: contract.tick_size || null,
            lot_size: contract.lot_size || null,
            // Regulatory and Compliance
            is_penny: contract.is_penny || null,
            is_weekly: contract.is_weekly || null,
            is_monthly: contract.is_monthly || null,
            is_quarterly: contract.is_quarterly || null,
            is_standard: contract.is_standard || null,
            // Data Quality and Metadata
            data_source: 'polygon',
            data_quality_score: contract.data_quality_score || null,
            insert_timestamp: new Date(),
            last_updated: new Date(),
            raw_data: JSON.stringify(contract),
            created_at: new Date()
        };
    }
    // Format stock row for BigQuery
    formatStockRow(data) {
        return {
            timestamp: new Date(),
            ticker: data.ticker,
            // Quote Data
            bid: data.last_quote?.bid || null,
            ask: data.last_quote?.ask || null,
            bid_size: data.last_quote?.bid_size || null,
            ask_size: data.last_quote?.ask_size || null,
            // Trade Data
            last_price: data.last_trade?.price || null,
            last_size: data.last_trade?.size || null,
            // Market Data
            min_av: data.min_av?.av || null,
            prev_day_volume: data.prev_day_volume || null,
            prev_day_vwap: data.prev_day_vwap || null,
            prev_day_open: data.prev_day_open || null,
            prev_day_high: data.prev_day_high || null,
            prev_day_low: data.prev_day_low || null,
            prev_day_close: data.prev_day_close || null,
            // Timestamps
            quote_timestamp: data.last_quote?.timestamp ? new Date(data.last_quote.timestamp) : null,
            trade_timestamp: data.last_trade?.timestamp ? new Date(data.last_trade.timestamp) : null,
            participant_timestamp: data.last_quote?.participant_timestamp ? new Date(data.last_quote.participant_timestamp) : null,
            updated: data.updated ? new Date(data.updated) : null,
            // Metadata
            exchange: data.last_trade?.exchange || null,
            conditions: data.last_trade?.conditions || [],
            raw_data: JSON.stringify(data),
            created_at: new Date()
        };
    }
    // Format crypto row for BigQuery
    formatCryptoRow(data) {
        return {
            timestamp: new Date(),
            ticker: data.ticker,
            // Quote Data
            bid: data.last_quote?.bid || null,
            ask: data.last_quote?.ask || null,
            bid_size: data.last_quote?.bid_size || null,
            ask_size: data.last_quote?.ask_size || null,
            // Trade Data
            last_price: data.last_trade?.price || null,
            last_size: data.last_trade?.size || null,
            // Market Data
            min_av: data.min_av?.av || null,
            prev_day_volume: data.prev_day_volume || null,
            prev_day_vwap: data.prev_day_vwap || null,
            prev_day_open: data.prev_day_open || null,
            prev_day_high: data.prev_day_high || null,
            prev_day_low: data.prev_day_low || null,
            prev_day_close: data.prev_day_close || null,
            // Timestamps
            quote_timestamp: data.last_quote?.timestamp ? new Date(data.last_quote.timestamp) : null,
            trade_timestamp: data.last_trade?.timestamp ? new Date(data.last_trade.timestamp) : null,
            updated: data.updated ? new Date(data.updated) : null,
            // Metadata
            exchange: data.last_trade?.exchange || null,
            conditions: data.last_trade?.conditions || [],
            raw_data: JSON.stringify(data),
            created_at: new Date()
        };
    }
    // Format real-time row for BigQuery
    formatRealTimeRow(data) {
        return {
            timestamp: new Date(),
            event_type: data.event,
            contract_id: data.contract_id || null,
            underlying_asset: data.underlying_asset,
            // Event Data
            bid: data.data.bid || null,
            ask: data.data.ask || null,
            bid_size: data.data.bid_size || null,
            ask_size: data.data.ask_size || null,
            price: data.data.price || null,
            size: data.data.size || null,
            // Greeks
            delta: data.data.delta || null,
            gamma: data.data.gamma || null,
            theta: data.data.theta || null,
            vega: data.data.vega || null,
            rho: data.data.rho || null,
            implied_volatility: data.data.implied_volatility || null,
            // Metadata
            raw_data: JSON.stringify(data),
            created_at: new Date()
        };
    }
    // Upsert options data with batch processing for large datasets
    async storeOptionsData(data) {
        try {
            const table = this.bigquery.dataset(this.datasetId).table('polygon_options');
            if ('options' in data) {
                // This is a chain or unified snapshot
                const rows = [];
                // Process calls
                if (data.options.calls) {
                    data.options.calls.forEach(contract => {
                        rows.push(this.formatOptionsRow(contract, 'call', data.underlying_asset));
                    });
                }
                // Process puts
                if (data.options.puts) {
                    data.options.puts.forEach(contract => {
                        rows.push(this.formatOptionsRow(contract, 'put', data.underlying_asset));
                    });
                }
                if (rows.length > 0) {
                    // Process in batches to avoid "Request Entity Too Large" error
                    const batchSize = 100; // Process 100 rows at a time
                    let processedCount = 0;
                    for (let i = 0; i < rows.length; i += batchSize) {
                        const batch = rows.slice(i, i + batchSize);
                        try {
                            const concurrency = 20;
                            let nextIndex = 0;
                            const worker = async () => {
                                while (nextIndex < batch.length) {
                                    const idx = nextIndex++;
                                    const row = batch[idx];
                                    await this.upsertOptionsRow(row);
                                    processedCount += 1;
                                    if (processedCount % 200 === 0) {
                                        console.log(`Upserted ${processedCount}/${rows.length} options contracts`);
                                    }
                                }
                            };
                            const workers = Array.from({ length: Math.min(concurrency, batch.length) }, () => worker());
                            await Promise.all(workers);
                            // Small delay between batches
                            if (i + batchSize < rows.length) {
                                await new Promise(resolve => setTimeout(resolve, 25));
                            }
                        }
                        catch (batchError) {
                            console.error(`Error upserting batch ${Math.floor(i / batchSize) + 1}:`, batchError);
                        }
                    }
                    console.log(`Successfully upserted ${processedCount} options contracts in BigQuery across ${Math.ceil(rows.length / batchSize)} batches`);
                }
            }
            else {
                // This is a single contract snapshot
                const row = this.formatOptionsRow(data, data.contract.contract_type, data.contract.underlying_asset);
                await this.upsertOptionsRow(row);
                console.log('Upserted single options contract in BigQuery');
            }
        }
        catch (error) {
            console.error('Error storing options data:', error);
            throw error;
        }
    }
    // Upsert a single options row using MERGE statement (contract_id + date)
    async upsertOptionsRow(row) {
        try {
            const query = `
        MERGE \`${this.projectId}.${this.datasetId}.polygon_options\` AS target
        USING (
          SELECT 
            DATE(TIMESTAMP(?), "America/New_York") as date,
            ? as underlying_asset,
            ? as contract_id,
            ? as contract_type,
            ? as strike_price,
            ? as expiration_date,
            ? as exercise_style,
            ? as shares_per_contract,
            ? as primary_exchange,
            ? as currency,
            ? as underlying_price,
            ? as underlying_timestamp,
            ? as delta,
            ? as gamma,
            ? as theta,
            ? as vega,
            ? as rho,
            ? as lambda,
            ? as epsilon,
            ? as charm,
            ? as vanna,
            ? as volga,
            ? as bid,
            ? as ask,
            ? as bid_size,
            ? as ask_size,
            ? as mid_price,
            ? as spread,
            ? as spread_percentage,
            ? as last_price,
            ? as last_size,
            ? as last_trade_exchange,
            ? as last_trade_conditions,
            ? as volume,
            ? as open_interest,
            ? as implied_volatility,
            ? as historical_volatility,
            ? as min_av,
            ? as min_av_timestamp,
            ? as prev_day_volume,
            ? as prev_day_open_interest,
            ? as prev_day_high,
            ? as prev_day_low,
            ? as prev_day_close,
            ? as prev_day_vwap,
            ? as days_to_expiration,
            ? as time_value,
            ? as intrinsic_value,
            ? as extrinsic_value,
            ? as moneyness,
            ? as leverage,
            ? as probability_itm,
            ? as probability_otm,
            ? as max_loss,
            ? as max_profit,
            ? as break_even_price,
            ? as score,
            ? as quote_timestamp,
            ? as trade_timestamp,
            ? as participant_timestamp,
            ? as chain_timestamp,
            ? as exchange,
            ? as conditions,
            ? as market_center,
            ? as tick_size,
            ? as lot_size,
            ? as is_penny,
            ? as is_weekly,
            ? as is_monthly,
            ? as is_quarterly,
            ? as is_standard,
            ? as data_source,
            ? as data_quality_score,
            ? as insert_timestamp,
            ? as last_updated,
            CAST(? AS JSON) as raw_data,
            ? as created_at
        ) AS source
        ON target.contract_id = source.contract_id AND target.date = source.date
        WHEN MATCHED THEN
          UPDATE SET
            underlying_asset = source.underlying_asset,
            contract_type = source.contract_type,
            strike_price = source.strike_price,
            expiration_date = source.expiration_date,
            exercise_style = source.exercise_style,
            shares_per_contract = source.shares_per_contract,
            primary_exchange = source.primary_exchange,
            currency = source.currency,
            underlying_price = source.underlying_price,
            underlying_timestamp = source.underlying_timestamp,
            delta = source.delta,
            gamma = source.gamma,
            theta = source.theta,
            vega = source.vega,
            rho = source.rho,
            lambda = source.lambda,
            epsilon = source.epsilon,
            charm = source.charm,
            vanna = source.vanna,
            volga = source.volga,
            bid = source.bid,
            ask = source.ask,
            bid_size = source.bid_size,
            ask_size = source.ask_size,
            mid_price = source.mid_price,
            spread = source.spread,
            spread_percentage = source.spread_percentage,
            last_price = source.last_price,
            last_size = source.last_size,
            last_trade_exchange = source.last_trade_exchange,
            last_trade_conditions = source.last_trade_conditions,
            volume = source.volume,
            open_interest = source.open_interest,
            implied_volatility = source.implied_volatility,
            historical_volatility = source.historical_volatility,
            min_av = source.min_av,
            min_av_timestamp = source.min_av_timestamp,
            prev_day_volume = source.prev_day_volume,
            prev_day_open_interest = source.prev_day_open_interest,
            prev_day_high = source.prev_day_high,
            prev_day_low = source.prev_day_low,
            prev_day_close = source.prev_day_close,
            prev_day_vwap = source.prev_day_vwap,
            days_to_expiration = source.days_to_expiration,
            time_value = source.time_value,
            intrinsic_value = source.intrinsic_value,
            extrinsic_value = source.extrinsic_value,
            moneyness = source.moneyness,
            leverage = source.leverage,
            probability_itm = source.probability_itm,
            probability_otm = source.probability_otm,
            max_loss = source.max_loss,
            max_profit = source.max_profit,
            break_even_price = source.break_even_price,
            score = source.score,
            quote_timestamp = source.quote_timestamp,
            trade_timestamp = source.trade_timestamp,
            participant_timestamp = source.participant_timestamp,
            chain_timestamp = source.chain_timestamp,
            exchange = source.exchange,
            conditions = source.conditions,
            market_center = source.market_center,
            tick_size = source.tick_size,
            lot_size = source.lot_size,
            is_penny = source.is_penny,
            is_weekly = source.is_weekly,
            is_monthly = source.is_monthly,
            is_quarterly = source.is_quarterly,
            is_standard = source.is_standard,
            data_source = source.data_source,
            data_quality_score = source.data_quality_score,
            last_updated = source.last_updated,
            raw_data = source.raw_data,
            created_at = source.created_at
        WHEN NOT MATCHED THEN
          INSERT (
            date, underlying_asset, contract_id, contract_type, strike_price, expiration_date,
            exercise_style, shares_per_contract, primary_exchange, currency, underlying_price,
            underlying_timestamp, delta, gamma, theta, vega, rho, lambda, epsilon, charm,
            vanna, volga, bid, ask, bid_size, ask_size, mid_price, spread, spread_percentage,
            last_price, last_size, last_trade_exchange, last_trade_conditions, volume, open_interest,
            implied_volatility, historical_volatility, min_av, min_av_timestamp, prev_day_volume,
            prev_day_open_interest, prev_day_high, prev_day_low, prev_day_close, prev_day_vwap,
            days_to_expiration, time_value, intrinsic_value, extrinsic_value, moneyness, leverage,
            probability_itm, probability_otm, max_loss, max_profit, break_even_price, score,
            quote_timestamp, trade_timestamp, participant_timestamp, chain_timestamp, exchange,
            conditions, market_center, tick_size, lot_size, is_penny, is_weekly, is_monthly,
            is_quarterly, is_standard, data_source, data_quality_score, insert_timestamp, last_updated, raw_data, created_at
          )
          VALUES (
            source.date, source.underlying_asset, source.contract_id, source.contract_type, source.strike_price, source.expiration_date,
            source.exercise_style, source.shares_per_contract, source.primary_exchange, source.currency, source.underlying_price,
            source.underlying_timestamp, source.delta, source.gamma, source.theta, source.vega, source.rho, source.lambda, source.epsilon, source.charm,
            source.vanna, source.volga, source.bid, source.ask, source.bid_size, source.ask_size, source.mid_price, source.spread, source.spread_percentage,
            source.last_price, source.last_size, source.last_trade_exchange, source.last_trade_conditions, source.volume, source.open_interest,
            source.implied_volatility, source.historical_volatility, source.min_av, source.min_av_timestamp, source.prev_day_volume,
            source.prev_day_open_interest, source.prev_day_high, source.prev_day_low, source.prev_day_close, source.prev_day_vwap,
            source.days_to_expiration, source.time_value, source.intrinsic_value, source.extrinsic_value, source.moneyness, source.leverage,
            source.probability_itm, source.probability_otm, source.max_loss, source.max_profit, source.break_even_price, source.score,
            source.quote_timestamp, source.trade_timestamp, source.participant_timestamp, source.chain_timestamp, source.exchange,
            source.conditions, source.market_center, source.tick_size, source.lot_size, source.is_penny, source.is_weekly, source.is_monthly,
            source.is_quarterly, source.is_standard, source.data_source, source.data_quality_score, source.insert_timestamp, source.last_updated, source.raw_data, TIMESTAMP(source.created_at)
          )
      `;
            const jobConfig = {
                query: query,
                params: [
                    row.insert_timestamp || new Date(),
                    row.underlying_asset,
                    row.contract_id,
                    row.contract_type,
                    row.strike_price,
                    row.expiration_date,
                    row.exercise_style,
                    row.shares_per_contract,
                    row.primary_exchange,
                    row.currency,
                    row.underlying_price,
                    row.underlying_timestamp,
                    row.delta,
                    row.gamma,
                    row.theta,
                    row.vega,
                    row.rho,
                    row.lambda,
                    row.epsilon,
                    row.charm,
                    row.vanna,
                    row.volga,
                    row.bid,
                    row.ask,
                    row.bid_size,
                    row.ask_size,
                    row.mid_price,
                    row.spread,
                    row.spread_percentage,
                    row.last_price,
                    row.last_size,
                    row.last_trade_exchange,
                    row.last_trade_conditions,
                    row.volume,
                    row.open_interest,
                    row.implied_volatility,
                    row.historical_volatility,
                    row.min_av,
                    row.min_av_timestamp,
                    row.prev_day_volume,
                    row.prev_day_open_interest,
                    row.prev_day_high,
                    row.prev_day_low,
                    row.prev_day_close,
                    row.prev_day_vwap,
                    row.days_to_expiration,
                    row.time_value,
                    row.intrinsic_value,
                    row.extrinsic_value,
                    row.moneyness,
                    row.leverage,
                    row.probability_itm,
                    row.probability_otm,
                    row.max_loss,
                    row.max_profit,
                    row.break_even_price,
                    row.score,
                    row.quote_timestamp,
                    row.trade_timestamp,
                    row.participant_timestamp,
                    row.chain_timestamp,
                    row.exchange,
                    row.conditions,
                    row.market_center,
                    row.tick_size,
                    row.lot_size,
                    row.is_penny,
                    row.is_weekly,
                    row.is_monthly,
                    row.is_quarterly,
                    row.is_standard,
                    row.data_source,
                    row.data_quality_score,
                    row.insert_timestamp,
                    row.last_updated,
                    row.raw_data,
                    row.created_at
                ],
                types: [
                    'TIMESTAMP',         // insert_timestamp to derive date in EST
                    'STRING',            // underlying_asset
                    'STRING',            // contract_id
                    'STRING',            // contract_type
                    'FLOAT64',           // strike_price
                    'DATE',              // expiration_date
                    'STRING',            // exercise_style
                    'INT64',             // shares_per_contract
                    'STRING',            // primary_exchange
                    'STRING',            // currency
                    'FLOAT64',           // underlying_price
                    'TIMESTAMP',         // underlying_timestamp
                    'FLOAT64',           // delta
                    'FLOAT64',           // gamma
                    'FLOAT64',           // theta
                    'FLOAT64',           // vega
                    'FLOAT64',           // rho
                    'FLOAT64',           // lambda
                    'FLOAT64',           // epsilon
                    'FLOAT64',           // charm
                    'FLOAT64',           // vanna
                    'FLOAT64',           // volga
                    'FLOAT64',           // bid
                    'FLOAT64',           // ask
                    'INT64',             // bid_size
                    'INT64',             // ask_size
                    'FLOAT64',           // mid_price
                    'FLOAT64',           // spread
                    'FLOAT64',           // spread_percentage
                    'FLOAT64',           // last_price
                    'INT64',             // last_size
                    'INT64',             // last_trade_exchange
                    'STRING',            // last_trade_conditions
                    'INT64',             // volume
                    'INT64',             // open_interest
                    'FLOAT64',           // implied_volatility
                    'FLOAT64',           // historical_volatility
                    'FLOAT64',           // min_av
                    'TIMESTAMP',         // min_av_timestamp
                    'INT64',             // prev_day_volume
                    'INT64',             // prev_day_open_interest
                    'FLOAT64',           // prev_day_high
                    'FLOAT64',           // prev_day_low
                    'FLOAT64',           // prev_day_close
                    'FLOAT64',           // prev_day_vwap
                    'INT64',             // days_to_expiration
                    'FLOAT64',           // time_value
                    'FLOAT64',           // intrinsic_value
                    'FLOAT64',           // extrinsic_value
                    'STRING',            // moneyness
                    'FLOAT64',           // leverage
                    'FLOAT64',           // probability_itm
                    'FLOAT64',           // probability_otm
                    'FLOAT64',           // max_loss
                    'FLOAT64',           // max_profit
                    'FLOAT64',           // break_even_price
                    'FLOAT64',           // score
                    'TIMESTAMP',         // quote_timestamp
                    'TIMESTAMP',         // trade_timestamp
                    'TIMESTAMP',         // participant_timestamp
                    'TIMESTAMP',         // chain_timestamp
                    'INT64',             // exchange
                    'STRING',            // conditions
                    'STRING',            // market_center
                    'FLOAT64',           // tick_size
                    'INT64',             // lot_size
                    'BOOL',              // is_penny
                    'BOOL',              // is_weekly
                    'BOOL',              // is_monthly
                    'BOOL',              // is_quarterly
                    'BOOL',              // is_standard
                    'STRING',            // data_source
                    'FLOAT64',           // data_quality_score
                    'TIMESTAMP',         // insert_timestamp
                    'TIMESTAMP',         // last_updated
                    'JSON',              // raw_data
                    'TIMESTAMP'          // created_at
                ]
            };
            await this.bigquery.query(jobConfig);
            console.log(`Upserted options contract: ${row.contract_id} on ${row.date}`);
        }
        catch (error) {
            console.error('Error upserting options row:', error);
            throw error;
        }
    }
    // Upsert a batch of options rows (contract_id + date)
    async upsertOptionsBatch(rows) {
        try {
            // For batch upserts, we'll use a single MERGE statement with UNION ALL
            const valuesClause = rows.map((row, index) => `
        SELECT 
          @date_${index} as date,
          @underlying_asset_${index} as underlying_asset,
          @contract_id_${index} as contract_id,
          @contract_type_${index} as contract_type,
          @strike_price_${index} as strike_price,
          @expiration_date_${index} as expiration_date,
          @exercise_style_${index} as exercise_style,
          @shares_per_contract_${index} as shares_per_contract,
          @primary_exchange_${index} as primary_exchange,
          @currency_${index} as currency,
          @underlying_price_${index} as underlying_price,
          @underlying_timestamp_${index} as underlying_timestamp,
          @delta_${index} as delta,
          @gamma_${index} as gamma,
          @theta_${index} as theta,
          @vega_${index} as vega,
          @rho_${index} as rho,
          @lambda_${index} as lambda,
          @epsilon_${index} as epsilon,
          @charm_${index} as charm,
          @vanna_${index} as vanna,
          @volga_${index} as volga,
          @bid_${index} as bid,
          @ask_${index} as ask,
          @bid_size_${index} as bid_size,
          @ask_size_${index} as ask_size,
          @mid_price_${index} as mid_price,
          @spread_${index} as spread,
          @spread_percentage_${index} as spread_percentage,
          @last_price_${index} as last_price,
          @last_size_${index} as last_size,
          @last_trade_exchange_${index} as last_trade_exchange,
          @last_trade_conditions_${index} as last_trade_conditions,
          @volume_${index} as volume,
          @open_interest_${index} as open_interest,
          @implied_volatility_${index} as implied_volatility,
          @historical_volatility_${index} as historical_volatility,
          @min_av_${index} as min_av,
          @min_av_timestamp_${index} as min_av_timestamp,
          @prev_day_volume_${index} as prev_day_volume,
          @prev_day_open_interest_${index} as prev_day_open_interest,
          @prev_day_high_${index} as prev_day_high,
          @prev_day_low_${index} as prev_day_low,
          @prev_day_close_${index} as prev_day_close,
          @prev_day_vwap_${index} as prev_day_vwap,
          @days_to_expiration_${index} as days_to_expiration,
          @time_value_${index} as time_value,
          @intrinsic_value_${index} as intrinsic_value,
          @extrinsic_value_${index} as extrinsic_value,
          @moneyness_${index} as moneyness,
          @leverage_${index} as leverage,
          @probability_itm_${index} as probability_itm,
          @probability_otm_${index} as probability_otm,
          @max_loss_${index} as max_loss,
          @max_profit_${index} as max_profit,
          @break_even_price_${index} as break_even_price,
          @score_${index} as score,
          @quote_timestamp_${index} as quote_timestamp,
          @trade_timestamp_${index} as trade_timestamp,
          @participant_timestamp_${index} as participant_timestamp,
          @chain_timestamp_${index} as chain_timestamp,
          @exchange_${index} as exchange,
          @conditions_${index} as conditions,
          @market_center_${index} as market_center,
          @tick_size_${index} as tick_size,
          @lot_size_${index} as lot_size,
          @is_penny_${index} as is_penny,
          @is_weekly_${index} as is_weekly,
          @is_monthly_${index} as is_monthly,
          @is_quarterly_${index} as is_quarterly,
          @is_standard_${index} as is_standard,
          @data_source_${index} as data_source,
          @data_quality_score_${index} as data_quality_score,
          @insert_timestamp_${index} as insert_timestamp,
          @last_updated_${index} as last_updated,
          @raw_data_${index} as raw_data,
          @created_at_${index} as created_at
      `).join(' UNION ALL ');
            const query = `
        MERGE \`${this.projectId}.${this.datasetId}.polygon_options\` AS target
        USING (
          ${valuesClause}
        ) AS source
        ON target.contract_id = source.contract_id AND target.date = source.date
        WHEN MATCHED THEN
          UPDATE SET
            underlying_asset = source.underlying_asset,
            contract_type = source.contract_type,
            strike_price = source.strike_price,
            expiration_date = source.expiration_date,
            exercise_style = source.exercise_style,
            shares_per_contract = source.shares_per_contract,
            primary_exchange = source.primary_exchange,
            currency = source.currency,
            underlying_price = source.underlying_price,
            underlying_timestamp = source.underlying_timestamp,
            delta = source.delta,
            gamma = source.gamma,
            theta = source.theta,
            vega = source.vega,
            rho = source.rho,
            lambda = source.lambda,
            epsilon = source.epsilon,
            charm = source.charm,
            vanna = source.vanna,
            volga = source.volga,
            bid = source.bid,
            ask = source.ask,
            bid_size = source.bid_size,
            ask_size = source.ask_size,
            mid_price = source.mid_price,
            spread = source.spread,
            spread_percentage = source.spread_percentage,
            last_price = source.last_price,
            last_size = source.last_size,
            last_trade_exchange = source.last_trade_exchange,
            last_trade_conditions = source.last_trade_conditions,
            volume = source.volume,
            open_interest = source.open_interest,
            implied_volatility = source.implied_volatility,
            historical_volatility = source.historical_volatility,
            min_av = source.min_av,
            min_av_timestamp = source.min_av_timestamp,
            prev_day_volume = source.prev_day_volume,
            prev_day_open_interest = source.prev_day_open_interest,
            prev_day_high = source.prev_day_high,
            prev_day_low = source.prev_day_low,
            prev_day_close = source.prev_day_close,
            prev_day_vwap = source.prev_day_vwap,
            days_to_expiration = source.days_to_expiration,
            time_value = source.time_value,
            intrinsic_value = source.intrinsic_value,
            extrinsic_value = source.extrinsic_value,
            moneyness = source.moneyness,
            leverage = source.leverage,
            probability_itm = source.probability_itm,
            probability_otm = source.probability_otm,
            max_loss = source.max_loss,
            max_profit = source.max_profit,
            break_even_price = source.break_even_price,
            score = source.score,
            quote_timestamp = source.quote_timestamp,
            trade_timestamp = source.trade_timestamp,
            participant_timestamp = source.participant_timestamp,
            chain_timestamp = source.chain_timestamp,
            exchange = source.exchange,
            conditions = source.conditions,
            market_center = source.market_center,
            tick_size = source.tick_size,
            lot_size = source.lot_size,
            is_penny = source.is_penny,
            is_weekly = source.is_weekly,
            is_monthly = source.is_monthly,
            is_quarterly = source.is_quarterly,
            is_standard = source.is_standard,
            data_source = source.data_source,
            data_quality_score = source.data_quality_score,
            last_updated = source.last_updated,
            raw_data = source.raw_data,
            created_at = source.created_at
        WHEN NOT MATCHED THEN
          INSERT (
            date, underlying_asset, contract_id, contract_type, strike_price, expiration_date,
            exercise_style, shares_per_contract, primary_exchange, currency, underlying_price,
            underlying_timestamp, delta, gamma, theta, vega, rho, lambda, epsilon, charm,
            vanna, volga, bid, ask, bid_size, ask_size, mid_price, spread, spread_percentage,
            last_price, last_size, last_trade_exchange, last_trade_conditions, volume, open_interest,
            implied_volatility, historical_volatility, min_av, min_av_timestamp, prev_day_volume,
            prev_day_open_interest, prev_day_high, prev_day_low, prev_day_close, prev_day_vwap,
            days_to_expiration, time_value, intrinsic_value, extrinsic_value, moneyness, leverage,
            probability_itm, probability_otm, max_loss, max_profit, break_even_price, score,
            quote_timestamp, trade_timestamp, participant_timestamp, chain_timestamp, exchange,
            conditions, market_center, tick_size, lot_size, is_penny, is_weekly, is_monthly,
            is_quarterly, is_standard, data_source, data_quality_score, insert_timestamp, last_updated, raw_data, created_at
          )
          VALUES (
            source.date, source.underlying_asset, source.contract_id, source.contract_type, source.strike_price, source.expiration_date,
            source.exercise_style, source.shares_per_contract, source.primary_exchange, source.currency, source.underlying_price,
            source.underlying_timestamp, source.delta, source.gamma, source.theta, source.vega, source.rho, source.lambda, source.epsilon, source.charm,
            source.vanna, source.volga, source.bid, source.ask, source.bid_size, source.ask_size, source.mid_price, source.spread, source.spread_percentage,
            source.last_price, source.last_size, source.last_trade_exchange, source.last_trade_conditions, source.volume, source.open_interest,
            source.implied_volatility, source.historical_volatility, source.min_av, source.min_av_timestamp, source.prev_day_volume,
            source.prev_day_open_interest, source.prev_day_high, source.prev_day_low, source.prev_day_close, source.prev_day_vwap,
            source.days_to_expiration, source.time_value, source.intrinsic_value, source.extrinsic_value, source.moneyness, source.leverage,
            source.probability_itm, source.probability_otm, source.max_loss, source.max_profit, source.break_even_price, source.score,
            source.quote_timestamp, source.trade_timestamp, source.participant_timestamp, source.chain_timestamp, source.exchange,
            source.conditions, source.market_center, source.tick_size, source.lot_size, source.is_penny, source.is_weekly, source.is_monthly,
            source.is_quarterly, source.is_standard, source.data_source, source.data_quality_score, source.insert_timestamp, source.last_updated, source.raw_data, TIMESTAMP(source.created_at)
          )
      `;
            // Build parameters for the batch
            const params = [];
            rows.forEach((row, index) => {
                params.push({ name: `date_${index}`, value: row.date }, { name: `underlying_asset_${index}`, value: row.underlying_asset }, { name: `contract_id_${index}`, value: row.contract_id }, { name: `contract_type_${index}`, value: row.contract_type }, { name: `strike_price_${index}`, value: row.strike_price }, { name: `expiration_date_${index}`, value: row.expiration_date }, { name: `exercise_style_${index}`, value: row.exercise_style }, { name: `shares_per_contract_${index}`, value: row.shares_per_contract }, { name: `primary_exchange_${index}`, value: row.primary_exchange }, { name: `currency_${index}`, value: row.currency }, { name: `underlying_price_${index}`, value: row.underlying_price }, { name: `underlying_timestamp_${index}`, value: row.underlying_timestamp }, { name: `delta_${index}`, value: row.delta }, { name: `gamma_${index}`, value: row.gamma }, { name: `theta_${index}`, value: row.theta }, { name: `vega_${index}`, value: row.vega }, { name: `rho_${index}`, value: row.rho }, { name: `lambda_${index}`, value: row.lambda }, { name: `epsilon_${index}`, value: row.epsilon }, { name: `charm_${index}`, value: row.charm }, { name: `vanna_${index}`, value: row.vanna }, { name: `volga_${index}`, value: row.volga }, { name: `bid_${index}`, value: row.bid }, { name: `ask_${index}`, value: row.ask }, { name: `bid_size_${index}`, value: row.bid_size }, { name: `ask_size_${index}`, value: row.ask_size }, { name: `mid_price_${index}`, value: row.mid_price }, { name: `spread_${index}`, value: row.spread }, { name: `spread_percentage_${index}`, value: row.spread_percentage }, { name: `last_price_${index}`, value: row.last_price }, { name: `last_size_${index}`, value: row.last_size }, { name: `last_trade_exchange_${index}`, value: row.last_trade_exchange }, { name: `last_trade_conditions_${index}`, value: row.last_trade_conditions }, { name: `volume_${index}`, value: row.volume }, { name: `open_interest_${index}`, value: row.open_interest }, { name: `implied_volatility_${index}`, value: row.implied_volatility }, { name: `historical_volatility_${index}`, value: row.historical_volatility }, { name: `min_av_${index}`, value: row.min_av }, { name: `min_av_timestamp_${index}`, value: row.min_av_timestamp }, { name: `prev_day_volume_${index}`, value: row.prev_day_volume }, { name: `prev_day_open_interest_${index}`, value: row.prev_day_open_interest }, { name: `prev_day_high_${index}`, value: row.prev_day_high }, { name: `prev_day_low_${index}`, value: row.prev_day_low }, { name: `prev_day_close_${index}`, value: row.prev_day_close }, { name: `prev_day_vwap_${index}`, value: row.prev_day_vwap }, { name: `days_to_expiration_${index}`, value: row.days_to_expiration }, { name: `time_value_${index}`, value: row.time_value }, { name: `intrinsic_value_${index}`, value: row.intrinsic_value }, { name: `extrinsic_value_${index}`, value: row.extrinsic_value }, { name: `moneyness_${index}`, value: row.moneyness }, { name: `leverage_${index}`, value: row.leverage }, { name: `probability_itm_${index}`, value: row.probability_itm }, { name: `probability_otm_${index}`, value: row.probability_otm }, { name: `max_loss_${index}`, value: row.max_loss }, { name: `max_profit_${index}`, value: row.max_profit }, { name: `break_even_price_${index}`, value: row.break_even_price }, { name: `score_${index}`, value: row.score }, { name: `quote_timestamp_${index}`, value: row.quote_timestamp }, { name: `trade_timestamp_${index}`, value: row.trade_timestamp }, { name: `participant_timestamp_${index}`, value: row.participant_timestamp }, { name: `chain_timestamp_${index}`, value: row.chain_timestamp }, { name: `exchange_${index}`, value: row.exchange }, { name: `conditions_${index}`, value: row.conditions }, { name: `market_center_${index}`, value: row.market_center }, { name: `tick_size_${index}`, value: row.tick_size }, { name: `lot_size_${index}`, value: row.lot_size }, { name: `is_penny_${index}`, value: row.is_penny }, { name: `is_weekly_${index}`, value: row.is_weekly }, { name: `is_monthly_${index}`, value: row.is_monthly }, { name: `is_quarterly_${index}`, value: row.is_quarterly }, { name: `is_standard_${index}`, value: row.is_standard }, { name: `data_source_${index}`, value: row.data_source }, { name: `data_quality_score_${index}`, value: row.data_quality_score }, { name: `insert_timestamp_${index}`, value: row.insert_timestamp }, { name: `last_updated_${index}`, value: row.last_updated }, { name: `raw_data_${index}`, value: row.raw_data }, { name: `created_at_${index}`, value: row.created_at });
            });
            const jobConfig = {
                query: query,
                params: params
            };
            await this.bigquery.query(jobConfig);
            console.log(`Upserted batch of ${rows.length} options contracts`);
        }
        catch (error) {
            console.error('Error upserting options batch:', error);
            throw error;
        }
    }
    // Upsert a single stock row using MERGE statement
    async upsertStockRow(row) {
        try {
            const query = `
        MERGE \`${this.projectId}.${this.datasetId}.polygon_stocks\` AS target
        USING (
          SELECT 
            ? as timestamp,
            ? as ticker,
            ? as bid,
            ? as ask,
            ? as bid_size,
            ? as ask_size,
            ? as last_price,
            ? as last_size,
            ? as min_av,
            ? as prev_day_volume,
            ? as prev_day_vwap,
            ? as prev_day_open,
            ? as prev_day_high,
            ? as prev_day_low,
            ? as prev_day_close,
            ? as quote_timestamp,
            ? as trade_timestamp,
            ? as participant_timestamp,
            ? as updated,
            ? as exchange,
            ? as conditions,
            ? as raw_data,
            ? as created_at
        ) AS source
        ON target.ticker = source.ticker AND target.timestamp = TIMESTAMP(source.timestamp)
        WHEN MATCHED THEN
          UPDATE SET
            bid = source.bid,
            ask = source.ask,
            bid_size = source.bid_size,
            ask_size = source.ask_size,
            last_price = source.last_price,
            last_size = source.last_size,
            min_av = source.min_av,
            prev_day_volume = source.prev_day_volume,
            prev_day_vwap = source.prev_day_vwap,
            prev_day_open = source.prev_day_open,
            prev_day_high = source.prev_day_high,
            prev_day_low = source.prev_day_low,
            prev_day_close = source.prev_day_close,
            quote_timestamp = source.quote_timestamp,
            trade_timestamp = source.trade_timestamp,
            participant_timestamp = source.participant_timestamp,
            updated = source.updated,
            exchange = source.exchange,
            conditions = source.conditions,
            raw_data = source.raw_data,
            created_at = source.created_at
        WHEN NOT MATCHED THEN
          INSERT (
            timestamp, ticker, bid, ask, bid_size, ask_size, last_price, last_size,
            min_av, prev_day_volume, prev_day_vwap, prev_day_open, prev_day_high,
            prev_day_low, prev_day_close, quote_timestamp, trade_timestamp,
            participant_timestamp, updated, exchange, conditions, raw_data, created_at
          )
          VALUES (
            TIMESTAMP(source.timestamp), source.ticker, source.bid, source.ask, source.bid_size, source.ask_size,
            source.last_price, source.last_size, source.min_av, source.prev_day_volume,
            source.prev_day_vwap, source.prev_day_open, source.prev_day_high, source.prev_day_low,
            source.prev_day_close, source.quote_timestamp, source.trade_timestamp,
            source.participant_timestamp, source.updated, source.exchange, source.conditions,
            source.raw_data, TIMESTAMP(source.created_at)
          )
      `;
            const jobConfig = {
                query: query,
                params: [
                    row.timestamp,
                    row.ticker,
                    row.bid,
                    row.ask,
                    row.bid_size,
                    row.ask_size,
                    row.last_price,
                    row.last_size,
                    row.min_av,
                    row.prev_day_volume,
                    row.prev_day_vwap,
                    row.prev_day_open,
                    row.prev_day_high,
                    row.prev_day_low,
                    row.prev_day_close,
                    row.quote_timestamp,
                    row.trade_timestamp,
                    row.participant_timestamp,
                    row.updated,
                    row.exchange,
                    row.conditions,
                    row.raw_data,
                    row.created_at
                ]
            };
            await this.bigquery.query(jobConfig);
            console.log(`Upserted stock data for ${row.ticker} at ${row.timestamp}`);
        }
        catch (error) {
            console.error('Error upserting stock row:', error);
            throw error;
        }
    }
    // Upsert a single crypto row using MERGE statement
    async upsertCryptoRow(row) {
        try {
            const query = `
        MERGE \`${this.projectId}.${this.datasetId}.polygon_crypto\` AS target
        USING (
          SELECT 
            ? as timestamp,
            ? as ticker,
            ? as bid,
            ? as ask,
            ? as bid_size,
            ? as ask_size,
            ? as last_price,
            ? as last_size,
            ? as min_av,
            ? as prev_day_volume,
            ? as prev_day_vwap,
            ? as prev_day_open,
            ? as prev_day_high,
            ? as prev_day_low,
            ? as prev_day_close,
            ? as quote_timestamp,
            ? as trade_timestamp,
            ? as updated,
            ? as exchange,
            ? as conditions,
            ? as raw_data,
            ? as created_at
        ) AS source
        ON target.ticker = source.ticker AND target.timestamp = TIMESTAMP(source.timestamp)
        WHEN MATCHED THEN
          UPDATE SET
            bid = source.bid,
            ask = source.ask,
            bid_size = source.bid_size,
            ask_size = source.ask_size,
            last_price = source.last_price,
            last_size = source.last_size,
            min_av = source.min_av,
            prev_day_volume = source.prev_day_volume,
            prev_day_vwap = source.prev_day_vwap,
            prev_day_open = source.prev_day_open,
            prev_day_high = source.prev_day_high,
            prev_day_low = source.prev_day_low,
            prev_day_close = source.prev_day_close,
            quote_timestamp = source.quote_timestamp,
            trade_timestamp = source.trade_timestamp,
            updated = source.updated,
            exchange = source.exchange,
            conditions = source.conditions,
            raw_data = source.raw_data,
            created_at = source.created_at
        WHEN NOT MATCHED THEN
          INSERT (
            timestamp, ticker, bid, ask, bid_size, ask_size, last_price, last_size,
            min_av, prev_day_volume, prev_day_vwap, prev_day_open, prev_day_high,
            prev_day_low, prev_day_close, quote_timestamp, trade_timestamp,
            updated, exchange, conditions, raw_data, created_at
          )
          VALUES (
            TIMESTAMP(source.timestamp), source.ticker, source.bid, source.ask, source.bid_size, source.ask_size,
            source.last_price, source.last_size, source.min_av, source.prev_day_volume,
            source.prev_day_vwap, source.prev_day_open, source.prev_day_high, source.prev_day_low,
            source.prev_day_close, source.quote_timestamp, source.trade_timestamp,
            source.updated, source.exchange, source.conditions, source.raw_data, TIMESTAMP(source.created_at)
          )
      `;
            const jobConfig = {
                query: query,
                params: [
                    row.timestamp,
                    row.ticker,
                    row.bid,
                    row.ask,
                    row.bid_size,
                    row.ask_size,
                    row.last_price,
                    row.last_size,
                    row.min_av,
                    row.prev_day_volume,
                    row.prev_day_vwap,
                    row.prev_day_open,
                    row.prev_day_high,
                    row.prev_day_low,
                    row.prev_day_close,
                    row.quote_timestamp,
                    row.trade_timestamp,
                    row.updated,
                    row.exchange,
                    row.conditions,
                    row.raw_data,
                    row.created_at
                ]
            };
            await this.bigquery.query(jobConfig);
            console.log(`Upserted crypto data for ${row.ticker} at ${row.timestamp}`);
        }
        catch (error) {
            console.error('Error upserting crypto row:', error);
            throw error;
        }
    }
    // Upsert a single real-time row using MERGE statement
    async upsertRealTimeRow(row) {
        try {
            const query = `
        MERGE \`${this.projectId}.${this.datasetId}.polygon_realtime\` AS target
        USING (
          SELECT 
            ? as timestamp,
            ? as event_type,
            ? as contract_id,
            ? as underlying_asset,
            ? as bid,
            ? as ask,
            ? as bid_size,
            ? as ask_size,
            ? as price,
            ? as size,
            ? as delta,
            ? as gamma,
            ? as theta,
            ? as vega,
            ? as rho,
            ? as implied_volatility,
            ? as raw_data,
            ? as created_at
        ) AS source
        ON target.contract_id = source.contract_id AND target.timestamp = TIMESTAMP(source.timestamp)
        WHEN MATCHED THEN
          UPDATE SET
            event_type = source.event_type,
            underlying_asset = source.underlying_asset,
            bid = source.bid,
            ask = source.ask,
            bid_size = source.bid_size,
            ask_size = source.ask_size,
            price = source.price,
            size = source.size,
            delta = source.delta,
            gamma = source.gamma,
            theta = source.theta,
            vega = source.vega,
            rho = source.rho,
            implied_volatility = source.implied_volatility,
            raw_data = source.raw_data,
            created_at = source.created_at
        WHEN NOT MATCHED THEN
          INSERT (
            timestamp, event_type, contract_id, underlying_asset, bid, ask, bid_size, ask_size,
            price, size, delta, gamma, theta, vega, rho, implied_volatility, raw_data, created_at
          )
          VALUES (
            TIMESTAMP(source.timestamp), source.event_type, source.contract_id, source.underlying_asset,
            source.bid, source.ask, source.bid_size, source.ask_size, source.price, source.size,
            source.delta, source.gamma, source.theta, source.vega, source.rho,
            source.implied_volatility, source.raw_data, TIMESTAMP(source.created_at)
          )
      `;
            const jobConfig = {
                query: query,
                params: [
                    row.timestamp,
                    row.event_type,
                    row.contract_id,
                    row.underlying_asset,
                    row.bid,
                    row.ask,
                    row.bid_size,
                    row.ask_size,
                    row.price,
                    row.size,
                    row.delta,
                    row.gamma,
                    row.theta,
                    row.vega,
                    row.rho,
                    row.implied_volatility,
                    row.raw_data,
                    row.created_at
                ]
            };
            await this.bigquery.query(jobConfig);
            console.log(`Upserted real-time ${row.event_type} data at ${row.timestamp}`);
        }
        catch (error) {
            console.error('Error upserting real-time row:', error);
            throw error;
        }
    }
    // Store stock data with upsert
    async storeStockData(data) {
        try {
            const row = this.formatStockRow(data);
            await this.upsertStockRow(row);
            console.log(`Upserted stock data for ${data.ticker} in BigQuery`);
        }
        catch (error) {
            console.error('Error storing stock data:', error);
            throw error;
        }
    }
    // Store crypto data with upsert
    async storeCryptoData(data) {
        try {
            const row = this.formatCryptoRow(data);
            await this.upsertCryptoRow(row);
            console.log(`Upserted crypto data for ${data.ticker} in BigQuery`);
        }
        catch (error) {
            console.error('Error storing crypto data:', error);
            throw error;
        }
    }
    // Store real-time data with upsert
    async storeRealTimeData(data) {
        try {
            const row = this.formatRealTimeRow(data);
            await this.upsertRealTimeRow(row);
            console.log(`Upserted real-time ${data.event} data in BigQuery`);
        }
        catch (error) {
            console.error('Error storing real-time data:', error);
            throw error;
        }
    }
    // Store all data from a collection
    async storeDataCollection(collection) {
        try {
            const { data, source } = collection;
            if (source === 'polygon_options') {
                await this.storeOptionsData(data.response);
            }
            else if (source === 'polygon_stock') {
                await this.storeStockData(data.response);
            }
            else if (source === 'polygon_crypto') {
                await this.storeCryptoData(data.response);
            }
            console.log(`Stored ${source} data successfully`);
        }
        catch (error) {
            console.error('Error storing data collection:', error);
            throw error;
        }
    }
}
exports.PolygonDatabaseService = PolygonDatabaseService;
// Export singleton instance
exports.polygonDatabaseService = new PolygonDatabaseService();
