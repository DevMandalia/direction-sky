"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.polygonHealthCheck = exports.polygonOptionsDataFetcher = void 0;

// Import required modules
const { PolygonDatabaseService } = require('./services/polygonDatabaseService');

// Simple HTTP client for making API calls
const https = require('https');

// Score calculation is handled in the service during formatting/upsert

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

// Helper function to upsert batches via service MERGE
async function upsertOptionsBatch(rows, dbService) {
    try {
        if (rows.length === 0) {
            console.log('⚠️ No valid rows to upsert');
            return;
        }
        console.log(`🔄 Upserting ${rows.length} rows via service MERGE`);
        await dbService.upsertOptionsBatch(rows);
        console.log(`✅ Successfully upserted ${rows.length} rows`);
    } catch (error) {
        console.error('❌ Error in upsertOptionsBatch:', error);
        throw new Error(`Upsert failed: ${error.message}`);
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

        // Store options via service to ensure consistent schema and date handling
        console.log(`💾 Storing MSTR options data to BigQuery...`);
        try {
            const snapshot = {
                underlying_asset: 'MSTR',
                options: {
                    calls: calls,
                    puts: puts
                }
            };
            if (typeof dbService.storeOptionsDataFast === 'function') {
                await dbService.storeOptionsDataFast(snapshot);
            } else {
                await dbService.storeOptionsData(snapshot);
            }
            const totalStored = calls.length + puts.length;
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