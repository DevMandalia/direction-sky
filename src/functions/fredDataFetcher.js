"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fredDataFetcher = void 0;
const apiClient_1 = require("./utils/apiClient");
const databaseService_1 = require("./services/databaseService");
const FRED_METRICS = [
    {
        name: 'federal_funds_rate',
        description: 'Federal Funds Rate',
        unit: 'percent',
        category: 'interest_rates',
        source: 'fred',
        endpoint: '/series/observations',
        parameters: { series_id: 'FEDFUNDS' }
    },
    {
        name: 'prime_rate',
        description: 'Bank Prime Loan Rate',
        unit: 'percent',
        category: 'interest_rates',
        source: 'fred',
        endpoint: '/series/observations',
        parameters: { series_id: 'DPRIME' }
    },
    {
        name: 'treasury_10yr',
        description: '10-Year Treasury Constant Maturity Rate',
        unit: 'percent',
        category: 'interest_rates',
        source: 'fred',
        endpoint: '/series/observations',
        parameters: { series_id: 'DGS10' }
    },
    {
        name: 'treasury_2yr',
        description: '2-Year Treasury Constant Maturity Rate',
        unit: 'percent',
        category: 'interest_rates',
        source: 'fred',
        endpoint: '/series/observations',
        parameters: { series_id: 'DGS2' }
    },
    {
        name: 'unemployment_rate',
        description: 'Unemployment Rate',
        unit: 'percent',
        category: 'employment',
        source: 'fred',
        endpoint: '/series/observations',
        parameters: { series_id: 'UNRATE' }
    },
    {
        name: 'nonfarm_payrolls',
        description: 'Total Nonfarm Payrolls',
        unit: 'thousands of persons',
        category: 'employment',
        source: 'fred',
        endpoint: '/series/observations',
        parameters: { series_id: 'PAYEMS' }
    },
    {
        name: 'labor_force_participation',
        description: 'Labor Force Participation Rate',
        unit: 'percent',
        category: 'employment',
        source: 'fred',
        endpoint: '/series/observations',
        parameters: { series_id: 'CIVPART' }
    },
    {
        name: 'gdp',
        description: 'Gross Domestic Product',
        unit: 'billions of dollars',
        category: 'gdp',
        source: 'fred',
        endpoint: '/series/observations',
        parameters: { series_id: 'GDP' }
    },
    {
        name: 'gdp_growth',
        description: 'Real GDP Growth Rate',
        unit: 'percent',
        category: 'gdp',
        source: 'fred',
        endpoint: '/series/observations',
        parameters: { series_id: 'A191RL1Q225SBEA' }
    },
    {
        name: 'gdp_per_capita',
        description: 'Real GDP per Capita',
        unit: 'chained 2012 dollars',
        category: 'gdp',
        source: 'fred',
        endpoint: '/series/observations',
        parameters: { series_id: 'A939RX0Q048SBEA' }
    },
    {
        name: 'cpi_all',
        description: 'Consumer Price Index for All Urban Consumers',
        unit: 'index 1982-84=100',
        category: 'inflation',
        source: 'fred',
        endpoint: '/series/observations',
        parameters: { series_id: 'CPIAUCSL' }
    },
    {
        name: 'cpi_core',
        description: 'Consumer Price Index for All Urban Consumers: All Items Less Food and Energy',
        unit: 'index 1982-84=100',
        category: 'inflation',
        source: 'fred',
        endpoint: '/series/observations',
        parameters: { series_id: 'CPILFESL' }
    },
    {
        name: 'pce_inflation',
        description: 'Personal Consumption Expenditures: Chain-type Price Index',
        unit: 'index 2012=100',
        category: 'inflation',
        source: 'fred',
        endpoint: '/series/observations',
        parameters: { series_id: 'PCEPI' }
    },
    {
        name: 'm1_money_supply',
        description: 'M1 Money Stock',
        unit: 'billions of dollars',
        category: 'money_supply',
        source: 'fred',
        endpoint: '/series/observations',
        parameters: { series_id: 'M1SL' }
    },
    {
        name: 'm2_money_supply',
        description: 'M2 Money Stock',
        unit: 'billions of dollars',
        category: 'money_supply',
        source: 'fred',
        endpoint: '/series/observations',
        parameters: { series_id: 'M2SL' }
    },
    {
        name: 'housing_starts',
        description: 'Housing Starts: Total: New Privately Owned Housing Units Started',
        unit: 'thousands of units',
        category: 'housing',
        source: 'fred',
        endpoint: '/series/observations',
        parameters: { series_id: 'HOUST' }
    },
    {
        name: 'existing_home_sales',
        description: 'Existing Home Sales',
        unit: 'millions',
        category: 'housing',
        source: 'fred',
        endpoint: '/series/observations',
        parameters: { series_id: 'EXHOSLUSM495S' }
    },
    {
        name: 'personal_consumption',
        description: 'Personal Consumption Expenditures',
        unit: 'billions of dollars',
        category: 'consumer',
        source: 'fred',
        endpoint: '/series/observations',
        parameters: { series_id: 'PCE' }
    },
    {
        name: 'retail_sales',
        description: 'Advance Retail Sales: Retail and Food Services',
        unit: 'millions of dollars',
        category: 'consumer',
        source: 'fred',
        endpoint: '/series/observations',
        parameters: { series_id: 'RSAFS' }
    },
    {
        name: 'industrial_production',
        description: 'Industrial Production: Total Index',
        unit: 'index 2017=100',
        category: 'manufacturing',
        source: 'fred',
        endpoint: '/series/observations',
        parameters: { series_id: 'INDPRO' }
    },
    {
        name: 'capacity_utilization',
        description: 'Capacity Utilization: Manufacturing',
        unit: 'percent of capacity',
        category: 'manufacturing',
        source: 'fred',
        endpoint: '/series/observations',
        parameters: { series_id: 'TCUM' }
    },
    {
        name: 'trade_balance',
        description: 'Trade Balance: Goods and Services',
        unit: 'millions of dollars',
        category: 'trade',
        source: 'fred',
        endpoint: '/series/observations',
        parameters: { series_id: 'BOPGSTB' }
    },
    {
        name: 'exports',
        description: 'Exports of Goods and Services',
        unit: 'billions of dollars',
        category: 'trade',
        source: 'fred',
        endpoint: '/series/observations',
        parameters: { series_id: 'EXPGS' }
    },
    {
        name: 'imports',
        description: 'Imports of Goods and Services',
        unit: 'billions of dollars',
        category: 'trade',
        source: 'fred',
        endpoint: '/series/observations',
        parameters: { series_id: 'IMPGS' }
    },
    {
        name: 'dow_jones',
        description: 'Dow Jones Industrial Average',
        unit: 'index',
        category: 'markets',
        source: 'fred',
        endpoint: '/series/observations',
        parameters: { series_id: 'DJIA' }
    },
    {
        name: 'snp500',
        description: 'S&P 500',
        unit: 'index',
        category: 'markets',
        source: 'fred',
        endpoint: '/series/observations',
        parameters: { series_id: 'SP500' }
    },
    {
        name: 'vix',
        description: 'CBOE Volatility Index: VIX',
        unit: 'index',
        category: 'markets',
        source: 'fred',
        endpoint: '/series/observations',
        parameters: { series_id: 'VIXCLS' }
    },
    {
        name: 'dollar_index',
        description: 'Trade Weighted U.S. Dollar Index: Broad',
        unit: 'index Jan 2006=100',
        category: 'currency',
        source: 'fred',
        endpoint: '/series/observations',
        parameters: { series_id: 'DTWEXBGS' }
    },
    {
        name: 'euro_usd',
        description: 'U.S. Dollars to Euro Spot Exchange Rate',
        unit: 'U.S. dollars to one euro',
        category: 'currency',
        source: 'fred',
        endpoint: '/series/observations',
        parameters: { series_id: 'DEXUSEU' }
    }
];
const fredDataFetcher = async (req, res) => {
    const startTime = Date.now();
    console.log('Starting comprehensive FRED data ingestion at:', new Date().toISOString());
    try {
        await databaseService_1.databaseService.initializeTable();
        const results = [];
        const storageResults = [];
        for (const metric of FRED_METRICS) {
            try {
                console.log(`Fetching ${metric.name} from FRED...`);
                const data = await apiClient_1.apiClient.fetchFREDData(metric.endpoint, {
                    ...metric.parameters,
                    limit: 100,
                    sort_order: 'desc'
                });
                try {
                    await databaseService_1.databaseService.storeFREDData(data, metric.name, {
                        series_id: metric.parameters.series_id,
                        description: metric.description,
                        unit: metric.unit,
                        category: metric.category
                    });
                    storageResults.push({ metric: metric.name, stored: true });
                    console.log(`Successfully stored ${metric.name} in BigQuery`);
                }
                catch (storageError) {
                    console.error(`Error storing ${metric.name} in BigQuery:`, storageError);
                    storageResults.push({
                        metric: metric.name,
                        stored: false,
                        error: storageError instanceof Error ? storageError.message : 'Unknown error'
                    });
                }
                const collection = {
                    timestamp: Date.now(),
                    source: 'fred',
                    data: {
                        metric: metric.name,
                        description: metric.description,
                        unit: metric.unit,
                        category: metric.category,
                        endpoint: metric.endpoint,
                        parameters: metric.parameters,
                        response: data,
                        metadata: {
                            series_id: metric.parameters.series_id,
                            observation_count: data.observations?.length || 0,
                            latest_value: data.observations?.[0]?.value,
                            latest_date: data.observations?.[0]?.date,
                            stored_in_database: storageResults.find(r => r.metric === metric.name)?.stored || false
                        }
                    },
                    status: 'success'
                };
                results.push(collection);
                console.log(`Successfully fetched ${metric.name}: ${data.observations?.length || 0} observations`);
            }
            catch (error) {
                console.error(`Error fetching ${metric.name}:`, error);
                const errorCollection = {
                    timestamp: Date.now(),
                    source: 'fred',
                    data: {
                        metric: metric.name,
                        endpoint: metric.endpoint,
                        parameters: metric.parameters
                    },
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
                results.push(errorCollection);
                storageResults.push({
                    metric: metric.name,
                    stored: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        const processingTime = Date.now() - startTime;
        try {
            await apiClient_1.apiClient.sendToProcessingLayer({
                source: 'fred',
                timestamp: Date.now(),
                data: results,
                processingTime,
                storageResults,
                summary: {
                    totalMetrics: FRED_METRICS.length,
                    successfulFetches: results.filter(r => r.status === 'success').length,
                    failedFetches: results.filter(r => r.status === 'error').length,
                    successfulStores: storageResults.filter(r => r.stored).length,
                    failedStores: storageResults.filter(r => !r.stored).length,
                    categories: [...new Set(FRED_METRICS.map(m => m.category))]
                }
            });
            console.log('Data sent to processing layer successfully');
        }
        catch (error) {
            console.error('Error sending data to processing layer:', error);
        }
        const successCount = results.filter(r => r.status === 'success').length;
        const errorCount = results.filter(r => r.status === 'error').length;
        const storedCount = storageResults.filter(r => r.stored).length;
        console.log(`FRED data ingestion completed. Success: ${successCount}, Errors: ${errorCount}, Stored: ${storedCount}, Time: ${processingTime}ms`);
        res.status(200).json({
            success: true,
            timestamp: Date.now(),
            source: 'fred',
            metricsProcessed: FRED_METRICS.length,
            successfulFetches: successCount,
            failedFetches: errorCount,
            successfulStores: storedCount,
            failedStores: storageResults.length - storedCount,
            processingTime,
            categories: [...new Set(FRED_METRICS.map(m => m.category))],
            results: results.map(r => ({
                metric: r.data.metric,
                status: r.status,
                observationCount: r.data.metadata?.observation_count || 0,
                latestValue: r.data.metadata?.latest_value,
                latestDate: r.data.metadata?.latest_date,
                storedInDatabase: r.data.metadata?.stored_in_database || false
            }))
        });
    }
    catch (error) {
        console.error('Fatal error in FRED data fetcher:', error);
        res.status(500).json({
            success: false,
            timestamp: Date.now(),
            source: 'fred',
            error: error instanceof Error ? error.message : 'Unknown error',
            processingTime: Date.now() - startTime
        });
    }
};
exports.fredDataFetcher = fredDataFetcher;
//# sourceMappingURL=fredDataFetcher.js.map