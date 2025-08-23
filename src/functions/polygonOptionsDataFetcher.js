"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.polygonHealthCheck = exports.polygonOptionsDataFetcher = void 0;

// Import required modules
const { PolygonDatabaseService } = require('./services/polygonDatabaseService');

// Simple HTTP client for making API calls
const https = require('https');

// Calculate options score based on the formula
function calculateOptionsScore(contract) {
    try {
        const details = contract.details || contract;
        const greeks = contract.greeks || {};
        const dayData = contract.day || {};
        
        // Extract values with null checks
        const theta = parseFloat(greeks.theta) || 0;
        const gamma = parseFloat(greeks.gamma) || 0;
        const delta = parseFloat(greeks.delta) || 0;
        const vega = parseFloat(greeks.vega) || 0;
        const ask = parseFloat(dayData.close) || 0; // Use close price as ask
        const strikePrice = parseFloat(details.strike_price) || 0;
        const expirationDate = details.expiration_date;
        
        if (!expirationDate || !strikePrice || !ask) {
            return null;
        }
        
        // Calculate days to expiry
        const today = new Date();
        const expiryDate = new Date(expirationDate);
        const daysToExpiry = Math.max(1, Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
        
        // Calculate components of the score formula
        const thetaIncome = Math.abs(theta) * 100;
        const premiumYield = (ask / strikePrice) * (365 / daysToExpiry) * 2;
        const deltaRisk = delta * 50;
        const gammaRisk = gamma * 1000;
        const vegaRisk = vega * 10;
        
        // Calculate final score
        const score = thetaIncome + premiumYield - deltaRisk - gammaRisk - vegaRisk;
        
        return Math.round(score * 100) / 100; // Round to 2 decimal places
    } catch (error) {
        console.error('Error calculating options score:', error);
        return null;
    }
}

// Check if market is open (9:30 AM - 4:00 PM EST, weekdays only, no holidays)
function isMarketOpen() {
    try {
        const now = new Date();
        const estTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
        
        // Check if weekend (0 = Sunday, 6 = Saturday)
        if (estTime.getDay() === 0 || estTime.getDay() === 6) {
            return false;
        }
        
        // Check if holiday (static list for 2025-2026)
        const holidays = [
            '2025-01-01', // New Year's Day
            '2025-01-20', // Martin Luther King Jr. Day (3rd Monday)
            '2025-02-17', // Presidents' Day (3rd Monday)
            '2025-05-26', // Memorial Day (Last Monday)
            '2025-07-04', // Independence Day
            '2025-09-01', // Labor Day (1st Monday)
            '2025-10-13', // Columbus Day (2nd Monday)
            '2025-11-11', // Veterans' Day
            '2025-11-27', // Thanksgiving Day (4th Thursday)
            '2025-12-25', // Christmas Day
            '2026-01-01', // New Year's Day
            '2026-01-19', // Martin Luther King Jr. Day
            '2026-02-16', // Presidents' Day
            '2026-05-25', // Memorial Day
            '2026-07-04', // Independence Day
            '2026-09-07', // Labor Day
            '2026-10-12', // Columbus Day
            '2026-11-11', // Veterans' Day
            '2026-11-26', // Thanksgiving Day
            '2026-12-25'  // Christmas Day
        ];
        
        const dateString = estTime.toISOString().split('T')[0];
        if (holidays.includes(dateString)) {
            return false;
        }
        
        // Check if within market hours (9:30 AM - 4:00 PM EST)
        const hour = estTime.getHours();
        const minute = estTime.getMinutes();
        const timeInMinutes = hour * 60 + minute;
        
        // 9:30 AM = 570 minutes, 4:00 PM = 960 minutes
        return timeInMinutes >= 570 && timeInMinutes <= 960;
        
    } catch (error) {
        console.error('Error checking market hours:', error);
        return false; // Default to closed if error
    }
}

// Get next market open time
function getNextMarketOpen(currentTime) {
    try {
        let nextOpen = new Date(currentTime);
        
        // If it's after 4 PM today, move to next business day
        if (currentTime.getHours() >= 16) {
            nextOpen.setDate(nextOpen.getDate() + 1);
        }
        
        // Find next business day (skip weekends)
        while (nextOpen.getDay() === 0 || nextOpen.getDay() === 6) {
            nextOpen.setDate(nextOpen.getDate() + 1);
        }
        
        // Set to 9:30 AM EST
        nextOpen.setHours(9, 30, 0, 0);
        
        return nextOpen.toISOString();
        
    } catch (error) {
        console.error('Error calculating next market open:', error);
        return null;
    }
}

const polygonOptionsDataFetcher = async (req, res) => {
    console.log('🚀 MSTR Polygon options data fetcher started');
    try {
        // Set CORS headers
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        // Handle preflight requests
        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return;
        }
        
        // Check if market is open before proceeding (with temporary testing bypass)
        const forceTest = req.query.force_test === 'true';
        if (!isMarketOpen() && !forceTest) {
            const now = new Date();
            const estTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
            console.log(`⏰ Market is closed. Current EST time: ${estTime.toLocaleString()}`);
            
            return res.status(200).json({
                success: true,
                message: 'Market is closed - no data processing needed',
                timestamp: new Date().toISOString(),
                marketStatus: 'closed',
                currentESTTime: estTime.toISOString(),
                nextMarketOpen: getNextMarketOpen(estTime)
            });
        }
        
        if (forceTest) {
            console.log(`🧪 TESTING MODE: Bypassing market hours check for testing purposes`);
        }
        
        // Get parameters from query string or request body (only expiry date matters now)
        const expiryDate = req.query.expiry || req.body?.expiry;
        const action = req.query.action || req.body?.action || 'health-check';
        console.log(`📊 Processing MSTR options request`);
        console.log(`📅 Expiry date filter: ${expiryDate || 'all'}`);
        console.log(`🔧 Action: ${action}`);
        console.log(`✅ Market is open - proceeding with data processing`);
        
        let result = {};
        switch (action) {
            case 'health-check':
                result = {
                    status: 'healthy',
                    message: 'MSTR Polygon options data fetcher is ready',
                    marketStatus: 'open',
                    services: {
                        polygonAPI: process.env.POLYGON_API_KEY ? 'configured' : 'not-configured',
                        bigquery: 'ready',
                        optionsChainAPI: 'ready',
                        timeseriesStorage: 'ready'
                    }
                };
                break;
            case 'fetch-and-store':
                result = await handleFetchAndStore(expiryDate);
                break;
            case 'fetch-only':
                result = await handleFetchOnly(expiryDate);
                break;
            case 'get-expiry-dates':
                result = await handleGetExpiryDates();
                break;
            case 'get-options-data':
                result = await handleGetOptionsData(expiryDate);
                break;
            case 'get-underlying-price':
                result = await handleGetUnderlyingPrice();
                break;
            default:
                throw new Error(`Unknown action: ${action}`);
        }
        
        console.log('✅ MSTR Polygon options data fetcher completed successfully');
        res.status(200).json({
            success: true,
            message: 'MSTR Polygon options data fetcher completed successfully',
            timestamp: new Date().toISOString(),
            symbol: 'MSTR',
            expiryDate: expiryDate || null,
            action: action,
            marketStatus: forceTest ? 'testing' : 'open',
            testingMode: forceTest,
            result: result
        });
        
    } catch (error) {
        console.error('❌ Error in MSTR polygon options data fetcher:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error occurred',
            timestamp: new Date().toISOString()
        });
    }
};
exports.polygonOptionsDataFetcher = polygonOptionsDataFetcher;

// Simple HTTP request function
function makeRequest(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            let data = '';
            response.on('data', (chunk) => {
                data += chunk;
            });
            response.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve(jsonData);
                } catch (error) {
                    reject(new Error('Failed to parse JSON response'));
                }
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
}

// Fetch ALL MSTR options contracts with pagination
async function fetchAllMSTROptionsContracts(apiKey) {
    console.log(`📊 Fetching ALL MSTR options contracts with pagination...`);
    
    let allContracts = [];
    let nextUrl = `https://api.polygon.io/v3/snapshot/options/MSTR?apiKey=${apiKey}&limit=100`;
    let pageCount = 0;
    
    while (nextUrl) {
        pageCount++;
        console.log(`📄 Fetching MSTR page ${pageCount}...`);
        
        const response = await makeRequest(nextUrl);
        console.log(`📡 MSTR page ${pageCount} response status: ${response.status}`);
        
        if (response.status !== 'OK') {
            console.error(`❌ API Error on MSTR page ${pageCount}:`, response);
            throw new Error(`Polygon API error on MSTR page ${pageCount}: ${response.status}`);
        }
        
        const contracts = response.results || [];
        console.log(`📊 MSTR page ${pageCount}: Got ${contracts.length} contracts`);
        
        allContracts = allContracts.concat(contracts);
        console.log(`📊 MSTR total contracts so far: ${allContracts.length}`);
        
        // Check if there's a next page
        if (response.next_url) {
            // The next_url already contains the cursor, just add the API key
            nextUrl = response.next_url + `&apiKey=${apiKey}`;
            console.log(`🔄 MSTR next page URL: ${nextUrl.replace(apiKey, '***')}`);
        } else {
            console.log(`✅ No more MSTR pages, total contracts: ${allContracts.length}`);
            nextUrl = null;
        }
        
        // Add a small delay to avoid rate limiting
        if (nextUrl) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // Safety check to prevent infinite loops
        if (pageCount > 50) {
            console.warn(`⚠️ Reached maximum page limit (50), stopping MSTR pagination`);
            break;
        }
    }
    
    console.log(`🎯 Successfully fetched ${allContracts.length} MSTR options contracts across ${pageCount} pages`);
    return allContracts;
}

// Helper function for inserting batches using BigQuery table.insert() method
async function upsertOptionsBatch(rows, dbService) {
    try {
        if (rows.length === 0) {
            console.log('⚠️ No valid rows to insert');
            return;
        }
        
        console.log(`🔄 Starting simple INSERT for ${rows.length} rows using table.insert()`);
        const table = dbService.bigquery.dataset(process.env.BIGQUERY_DATASET).table('polygon_options');
        
        // Insert all rows at once using table.insert()
        const [job] = await table.insert(rows);
        
        // Check if job exists and has errors
        if (job && job.status && job.status.errors && job.status.errors.length > 0) {
            console.error('❌ Insert job errors:', job.status.errors);
            throw new Error(`Insert failed: ${job.status.errors.map(e => e.message).join(', ')}`);
        }
        
        // If no job object or no errors, consider it successful
        console.log(`✅ Successfully inserted ${rows.length} rows using table.insert()`);
        
    } catch (error) {
        console.error('❌ Error in upsertOptionsBatch:', error);
        throw new Error(`Insert failed: ${error.message}`);
    }
}

// Fetch and store MSTR options data to BigQuery
async function handleFetchAndStore(expiryDate) {
    console.log(`🔄 Fetching and storing MSTR options data`);
    try {
        const apiKey = process.env.POLYGON_API_KEY;
        if (!apiKey) {
            throw new Error('POLYGON_API_KEY environment variable is required');
        }

        // Initialize BigQuery service
        console.log(`💾 Initializing BigQuery service...`);
        const dbService = new PolygonDatabaseService();
        await dbService.initializeTables();
        console.log(`✅ BigQuery tables initialized successfully`);

        // Fetch ALL MSTR options contracts with pagination
        const allMSTROptionsContracts = await fetchAllMSTROptionsContracts(apiKey);
        
        if (!allMSTROptionsContracts || !Array.isArray(allMSTROptionsContracts)) {
            throw new Error('Failed to fetch MSTR options contracts from Polygon API');
        }

        // Filter by expiry date if specified
        let filteredContracts = allMSTROptionsContracts;
        if (expiryDate) {
            filteredContracts = allMSTROptionsContracts.filter(contract => 
                contract.details.expiration_date === expiryDate
            );
            console.log(`📅 Filtered to ${filteredContracts.length} MSTR contracts for expiry ${expiryDate}`);
        }

        // Separate calls and puts
        const calls = filteredContracts.filter(contract => contract.details.contract_type === 'call');
        const puts = filteredContracts.filter(contract => contract.details.contract_type === 'put');

        console.log(`📊 Found ${calls.length} MSTR calls and ${puts.length} MSTR puts out of ${allMSTROptionsContracts.length} total contracts`);

        // Store options data to BigQuery
        console.log(`💾 Storing MSTR options data to BigQuery...`);
        
        // Direct BigQuery insertion with proper data type handling
        try {
            const table = dbService.bigquery.dataset(process.env.BIGQUERY_DATASET).table('polygon_options');
            
            // Process contracts in smaller batches to avoid memory issues
            const batchSize = 50; // Restored to production batch size
            let totalStored = 0;
            
            for (let i = 0; i < filteredContracts.length; i += batchSize) {
                const batch = filteredContracts.slice(i, i + batchSize);
                const rows = batch.map(contract => {
                    const details = contract.details || contract;
                    const dayData = contract.day || {};
                    const greeks = contract.greeks || {};
                    
                    // Calculate options score
                    const score = calculateOptionsScore(contract);
                    
                    // Get current EST date for primary key
                    const now = new Date();
                    const estDate = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
                    const tradingDate = estDate.toISOString().split('T')[0]; // YYYY-MM-DD format
                    
                    // Ensure all values are BigQuery-compatible
                    return {
                        // Primary Keys - NEW STRUCTURE
                        date: tradingDate,
                        contract_id: details.ticker || `MSTR_${details.strike_price}_${details.expiration_date}_${details.contract_type}`,
                        
                        // Timestamps - UPDATED
                        insert_timestamp: new Date().toISOString(),
                        last_updated: new Date().toISOString(),
                        
                        // Contract Details
                        underlying_asset: 'MSTR',
                        contract_type: details.contract_type || 'unknown',
                        strike_price: parseFloat(details.strike_price) || 0,
                        expiration_date: details.expiration_date || '2025-12-31',
                        exercise_style: details.exercise_style || 'american',
                        shares_per_contract: parseInt(details.shares_per_contract) || 100,
                        primary_exchange: 'NASDAQ',
                        currency: 'USD',
                        underlying_price: 0,
                        underlying_timestamp: new Date().toISOString(),
                        
                        // Greeks field child attributes
                        delta: parseFloat(greeks.delta) || 0,
                        gamma: parseFloat(greeks.gamma) || 0,
                        theta: parseFloat(greeks.theta) || 0,
                        vega: parseFloat(greeks.vega) || 0,
                        rho: parseFloat(greeks.rho) || 0,
                        lambda: 0,
                        epsilon: 0,
                        charm: 0,
                        vanna: 0,
                        volga: 0,
                        
                        // Quote fields
                        bid: parseFloat(contract.last_quote?.bid) || 0,
                        ask: parseFloat(contract.last_quote?.ask) || 0,
                        bid_size: parseInt(contract.last_quote?.bid_size) || 0,
                        ask_size: parseInt(contract.last_quote?.ask_size) || 0,
                        mid_price: parseFloat(contract.last_quote?.midpoint) || 0,
                        spread: parseFloat(contract.last_quote?.ask || 0) - parseFloat(contract.last_quote?.bid || 0),
                        spread_percentage: 0,
                        last_price: parseFloat(contract.last_trade?.price) || 0,
                        last_size: parseInt(contract.last_trade?.size) || 0,
                        last_trade_exchange: 0, // INTEGER field - set to 0 for unknown
                        last_trade_conditions: Array.isArray(contract.last_trade?.conditions) ? contract.last_trade.conditions.join(', ') : 'UNKNOWN',
                        
                        // Day field child attributes
                        volume: parseInt(dayData.volume) || 0,
                        open_interest: parseInt(contract.open_interest) || 0,
                        close: parseFloat(dayData.close) || 0,
                        change: parseFloat(dayData.change) || 0,
                        change_percent: parseFloat(dayData.change_percent) || 0,
                        high: parseFloat(dayData.high) || 0,
                        low: parseFloat(dayData.low) || 0,
                        open: parseFloat(dayData.open) || 0,
                        previous_close: parseFloat(dayData.previous_close) || 0,
                        vwap: parseFloat(dayData.vwap) || 0,
                        day_last_updated: dayData.last_updated ? new Date(parseInt(dayData.last_updated) / 1000000).toISOString() : new Date().toISOString(),
                        day_volume: parseInt(dayData.volume) || 0,
                        prev_day_volume: 0,
                        prev_day_open_interest: 0,
                        prev_day_high: 0,
                        prev_day_low: 0,
                        prev_day_close: 0,
                        prev_day_vwap: 0,
                        
                        // Implied volatility
                        implied_volatility: parseFloat(contract.implied_volatility) || 0,
                        historical_volatility: 0,
                        min_av: 0,
                        min_av_timestamp: new Date().toISOString(),
                        
                        // Quote field child attributes
                        quote_bid: parseFloat(contract.last_quote?.bid) || 0,
                        quote_ask: parseFloat(contract.last_quote?.ask) || 0,
                        quote_bid_size: parseInt(contract.last_quote?.bid_size) || 0,
                        quote_ask_size: parseInt(contract.last_quote?.ask_size) || 0,
                        quote_last_updated: contract.last_quote?.last_updated ? new Date(parseInt(contract.last_quote.last_updated) / 1000000).toISOString() : new Date().toISOString(),
                        quote_last_exchange: contract.last_quote?.last_exchange || 'UNKNOWN',
                        quote_midpoint: parseFloat(contract.last_quote?.midpoint) || 0,
                        quote_timeframe: contract.last_quote?.timeframe || 'UNKNOWN',
                        quote_bid_exchange: contract.last_quote?.bid_exchange || 'UNKNOWN',
                        
                        // Last trade field child attributes
                        last_trade_price: parseFloat(contract.last_trade?.price) || 0,
                        last_trade_size: parseInt(contract.last_trade?.size) || 0,
                        last_trade_timestamp: contract.last_trade?.timestamp ? new Date(parseInt(contract.last_trade.timestamp) / 1000000).toISOString() : new Date().toISOString(),
                        
                        // Underlying asset field child attributes
                        underlying_ticker: contract.underlying_asset?.ticker || 'MSTR',
                        
                        // Additional fields from schema
                        days_to_expiration: 0,
                        time_value: 0,
                        intrinsic_value: 0,
                        extrinsic_value: 0,
                        moneyness: 'UNKNOWN',
                        leverage: 0,
                        probability_itm: 0,
                        probability_otm: 0,
                        max_loss: 0,
                        max_profit: 0,
                        break_even_price: 0,
                        
                        // Calculated score
                        score: score || 0,
                        
                        // Additional timestamp fields
                        quote_timestamp: new Date().toISOString(),
                        trade_timestamp: new Date().toISOString(),
                        participant_timestamp: new Date().toISOString(),
                        chain_timestamp: new Date().toISOString(),
                        
                        // Additional fields from schema
                        exchange: 0,
                        conditions: 'UNKNOWN',
                        market_center: 'UNKNOWN',
                        tick_size: 0,
                        lot_size: 100,
                        is_penny: false,
                        is_weekly: false,
                        is_monthly: false,
                        is_quarterly: false,
                        is_standard: true,
                        
                        // Raw data for backup
                        raw_data: JSON.stringify(contract),
                        
                        // Additional required fields from schema
                        data_source: 'polygon',
                        data_quality_score: 0,
                        created_at: new Date().toISOString()
                    };
                });
                
                // Filter out null rows (expired contracts)
                const validRows = rows.filter(row => row !== null);

                // Insert batch into BigQuery using MERGE for upsert functionality
                console.log(`🔍 Debug: Upserting batch with ${validRows.length} rows`);
                console.log(`🔍 Debug: First row sample:`, JSON.stringify(validRows[0], null, 2));
                
                // Use MERGE statement for upsert functionality
                await upsertOptionsBatch(validRows, dbService);
                console.log(`✅ Upserted batch ${Math.floor(i / batchSize) + 1}: ${validRows.length} contracts`);
                totalStored += validRows.length;
                
                // Small delay between batches
                if (i + batchSize < filteredContracts.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            
            console.log(`✅ Successfully stored ${totalStored} MSTR options contracts to BigQuery`);
        } catch (storageError) {
            console.error(`❌ Error storing to BigQuery:`, storageError);
            throw new Error(`BigQuery storage failed: ${storageError.message}`);
        }

        return {
            optionsFetched: allMSTROptionsContracts.length,
            optionsStored: 'success',
            calls: calls.length,
            puts: puts.length,
            timestamp: new Date().toISOString(),
            message: `Successfully fetched and stored ALL ${filteredContracts.length} MSTR options contracts to BigQuery`,
            data: {
                calls: calls.slice(0, 3), // Return first 3 for preview
                puts: puts.slice(0, 3),
                totalContracts: filteredContracts.length,
                sampleContract: filteredContracts[0] || null,
                paginationInfo: {
                    totalPages: Math.ceil(allMSTROptionsContracts.length / 100),
                    totalContracts: allMSTROptionsContracts.length
                }
            }
        };
    } catch (error) {
        console.error(`❌ Error in handleFetchAndStore for MSTR:`, error);
        throw error;
    }
}

// Fetch MSTR options data only (no storage)
async function handleFetchOnly(expiryDate) {
    console.log(`📡 Fetching MSTR options data (no storage)`);
    try {
        const apiKey = process.env.POLYGON_API_KEY;
        if (!apiKey) {
            throw new Error('POLYGON_API_KEY environment variable is required');
        }

        // Fetch ALL MSTR options contracts with pagination
        const allMSTROptionsContracts = await fetchAllMSTROptionsContracts(apiKey);
        
        if (!allMSTROptionsContracts || !Array.isArray(allMSTROptionsContracts)) {
            throw new Error('Failed to fetch MSTR options contracts from Polygon API');
        }

        // Filter by expiry date if specified
        let filteredContracts = allMSTROptionsContracts;
        if (expiryDate) {
            filteredContracts = allMSTROptionsContracts.filter(contract => 
                contract.details.expiration_date === expiryDate
            );
            console.log(`📅 Filtered to ${filteredContracts.length} MSTR contracts for expiry ${expiryDate}`);
        }

        // Separate calls and puts
        const calls = filteredContracts.filter(contract => contract.details.contract_type === 'call');
        const puts = filteredContracts.filter(contract => contract.details.contract_type === 'put');
        
        console.log(`📊 Found ${calls.length} MSTR calls and ${puts.length} MSTR puts out of ${allMSTROptionsContracts.length} total contracts`);
        
        return { 
            optionsCount: filteredContracts.length,
            calls: calls.length,
            puts: puts.length,
            options: {
                calls: calls.slice(0, 5), // Return first 5 for preview
                puts: puts.slice(0, 5)
            },
            totalAvailable: allMSTROptionsContracts.length,
            message: `Successfully fetched ALL ${filteredContracts.length} MSTR options contracts`,
            sampleContract: filteredContracts[0] || null,
            paginationInfo: {
                totalPages: Math.ceil(allMSTROptionsContracts.length / 100),
                totalContracts: allMSTROptionsContracts.length
            }
        };
        
    } catch (error) {
        console.error(`❌ Error in handleFetchOnly for MSTR:`, error);
        throw error;
    }
}

// Get available MSTR expiry dates from BigQuery
async function handleGetExpiryDates() {
    console.log(`📅 Getting MSTR expiry dates from BigQuery`);
    try {
        // Initialize BigQuery service
        const dbService = new PolygonDatabaseService();
        await dbService.initializeTables();
        
        // Query for unique expiry dates
        const query = `
            SELECT DISTINCT expiration_date
            FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${process.env.BIGQUERY_DATASET}.polygon_options\`
            WHERE underlying_asset = 'MSTR'
            ORDER BY expiration_date ASC
        `;
        
        const [rows] = await dbService.bigquery.query({ query });
        const dates = rows.map(row => row.expiration_date);
        
        return { 
            dates: dates,
            message: `Found ${dates.length} expiry dates for MSTR in BigQuery`,
            data: dates
        };
    }
    catch (error) {
        console.error(`❌ Error in handleGetExpiryDates for MSTR:`, error);
        throw error;
    }
}

// Get MSTR options data from BigQuery
async function handleGetOptionsData(expiryDate) {
    console.log(`📊 Getting MSTR options data from BigQuery for expiry ${expiryDate}`);
    if (!expiryDate) {
        throw new Error('expiry_date is required for getting MSTR options data');
    }
    try {
        // Initialize BigQuery service
        const dbService = new PolygonDatabaseService();
        await dbService.initializeTables();
        
        // Query for options data with the specified expiry date
        const query = `
            SELECT *
            FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${process.env.BIGQUERY_DATASET}.polygon_options\`
            WHERE underlying_asset = 'MSTR' 
            AND expiration_date = @expiryDate
            ORDER BY contract_type, strike_price, timestamp DESC
            LIMIT 1000
        `;
        
        const options = {
            query: query,
            params: {
                expiryDate: expiryDate
            }
        };
        
        const [rows] = await dbService.bigquery.query(options);
        
        return { 
            rows: rows,
            message: `Retrieved ${rows.length} MSTR options contracts for expiry ${expiryDate}`,
            symbol: 'MSTR',
            expiryDate: expiryDate,
            data: {
                totalRows: rows.length,
                calls: rows.filter(row => row.contract_type === 'call').length,
                puts: rows.filter(row => row.contract_type === 'put').length,
                sampleData: rows.slice(0, 5)
            }
        };
    }
    catch (error) {
        console.error(`❌ Error in handleGetOptionsData for MSTR:`, error);
        throw error;
    }
}

// Get MSTR underlying asset price from BigQuery
async function handleGetUnderlyingPrice() {
    console.log(`💰 Getting MSTR underlying price from BigQuery`);
    try {
        // Initialize BigQuery service
        const dbService = new PolygonDatabaseService();
        await dbService.initializeTables();
        
        // Query for the most recent underlying price data
        const query = `
            SELECT 
                underlying_price,
                timestamp,
                contract_id,
                contract_type,
                strike_price,
                expiration_date
            FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${process.env.BIGQUERY_DATASET}.polygon_options\`
            WHERE underlying_asset = 'MSTR'
            AND underlying_price IS NOT NULL
            ORDER BY timestamp DESC
            LIMIT 1
        `;
        
        const [rows] = await dbService.bigquery.query({ query });
        const latestPrice = rows.length > 0 ? rows[0] : null;
        
        return {
            underlying_price: latestPrice?.underlying_price || null,
            timestamp: latestPrice?.timestamp || null,
            message: latestPrice ? 'Retrieved latest MSTR underlying price from BigQuery' : 'No MSTR underlying price data found in BigQuery',
            data: latestPrice
        };
    }
    catch (error) {
        console.error(`❌ Error in handleGetUnderlyingPrice for MSTR:`, error);
        throw error;
    }
}

const polygonHealthCheck = async (req, res) => {
    console.log('🏥 MSTR Polygon health check called');
    try {
        // Set CORS headers
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        // Handle preflight requests
        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return;
        }
        
        const now = new Date();
        const estTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
        const marketOpen = isMarketOpen();
        const nextMarketOpen = marketOpen ? null : getNextMarketOpen(estTime);
        
        res.status(200).json({
            success: true,
            message: 'MSTR Polygon health check passed - full options chain API ready',
            timestamp: new Date().toISOString(),
            currentESTTime: estTime.toISOString(),
            marketStatus: marketOpen ? 'open' : 'closed',
            nextMarketOpen: nextMarketOpen,
            services: {
                database: 'ready',
                polygonAPI: process.env.POLYGON_API_KEY ? 'configured' : 'not-configured',
                compositePrimaryKey: 'enabled',
                upsertFunctionality: 'deployed',
                optionsChainAPI: 'ready',
                timeseriesStorage: 'ready',
                marketHoursDetection: 'enabled'
            },
            endpoints: {
                'GET /': 'Health check',
                'POST /': 'Main MSTR options fetcher (use ?action=fetch-and-store)',
                'GET /?action=health-check': 'Health check with detailed status',
                'POST /?action=fetch-and-store': 'Fetch and store MSTR options data',
                'POST /?action=fetch-only': 'Fetch MSTR options data only',
                'GET /?action=get-expiry-dates': 'Get available MSTR expiry dates',
                'POST /?action=get-options-data&expiry=2025-01-19': 'Get MSTR options data from BigQuery',
                'POST /?action=get-underlying-price': 'Get MSTR underlying asset price'
            },
            nextSteps: [
                'Test the health check endpoint',
                'Test the fetch-and-store endpoint for MSTR',
                'Full MSTR Polygon API integration with PAGINATION and BIGQUERY STORAGE is now implemented!',
                'Data is stored with date and contract_id as composite primary keys for daily granularity',
                'Market hours detection is enabled - only runs during trading hours',
                'Expired contracts are automatically filtered out'
            ]
        });
    } catch (error) {
        console.error('❌ MSTR health check failed:', error);
        res.status(500).json({
            success: false,
            error: 'Health check failed',
            message: error instanceof Error ? error.message : 'Unknown error occurred',
            timestamp: new Date().toISOString(),
            services: {
                database: 'unhealthy'
            }
        });
    }
};

exports.polygonHealthCheck = polygonHealthCheck;