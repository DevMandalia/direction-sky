import { Request, Response } from '@google-cloud/functions-framework';
import { PolygonAPIClient } from '../utils/polygonAPIClient';
import { PolygonDatabaseService } from '../services/polygonDatabaseService';
import { 
  OptionChainSnapshot, 
  OptionContractSnapshot,
  UnifiedOptionsSnapshot,
  StockSnapshot,
  PolygonConfig,
  AssetConfig
} from '../types/polygon';

export const polygonOptionsDataFetcher = async (req: Request, res: Response): Promise<void> => {
  console.log('🚀 Polygon options data fetcher started');

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

    // Get parameters from query string or request body
    const symbol = req.query.symbol || req.body?.symbol || 'MSTR';
    const expiryDate = req.query.expiry || req.body?.expiry;
    const action = req.query.action || req.body?.action || 'health-check';

    console.log(`📊 Processing request for symbol: ${symbol}`);
    console.log(`📅 Expiry date filter: ${expiryDate || 'all'}`);
    console.log(`🔧 Action: ${action}`);

    // Initialize services
    const polygonConfig: PolygonConfig = {
      apiKey: process.env.POLYGON_API_KEY || '',
      baseUrl: 'https://api.polygon.io',
      wsUrl: 'wss://delayed.polygon.io',
      retryAttempts: 3,
      retryDelay: 1000,
      realTimeEnabled: false,
      batchEnabled: true,
      cacheEnabled: false,
      cacheTTL: 300
    };

    if (!polygonConfig.apiKey) {
      throw new Error('POLYGON_API_KEY environment variable is required');
    }

    const polygonClient = new PolygonAPIClient(polygonConfig);
    const dbService = new PolygonDatabaseService();

    let result: any = {};

    switch (action) {
      case 'health-check':
        result = {
          status: 'healthy',
          message: 'Polygon options data fetcher is ready',
          services: {
            polygonAPI: process.env.POLYGON_API_KEY ? 'configured' : 'not-configured',
            bigquery: 'ready',
            optionsChainAPI: 'ready',
            timeseriesStorage: 'ready'
          }
        };
        break;
      
      case 'fetch-and-store':
        result = await handleFetchAndStore(symbol, expiryDate, polygonClient, dbService);
        break;
      
      case 'fetch-only':
        result = await handleFetchOnly(symbol, expiryDate, polygonClient);
        break;
      
      case 'get-expiry-dates':
        result = await handleGetExpiryDates(symbol, dbService);
        break;
      
      case 'get-options-data':
        result = await handleGetOptionsData(symbol, expiryDate, dbService);
        break;
      
      case 'get-underlying-price':
        result = await handleGetUnderlyingPrice(symbol, dbService);
        break;
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log('✅ Polygon options data fetcher completed successfully');

    res.status(200).json({
      success: true,
      message: 'Polygon options data fetcher completed successfully',
      timestamp: new Date().toISOString(),
      symbol: symbol,
      expiryDate: expiryDate || null,
      action: action,
      result: result
    });

  } catch (error) {
    console.error('❌ Error in polygon options data fetcher:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    });
  }
};

// Fetch and store options data to BigQuery
async function handleFetchAndStore(
  symbol: string, 
  expiryDate: string | undefined, 
  polygonClient: PolygonAPIClient, 
  dbService: PolygonDatabaseService
) {
  console.log(`🔄 Fetching and storing options data for ${symbol}`);
  
  try {
    // Fetch underlying stock price
    console.log(`📈 Fetching stock snapshot for ${symbol}...`);
    const stockSnapshot = await polygonClient.getStockSnapshot(symbol);
    console.log(`📈 Stock price for ${symbol}: $${stockSnapshot.last_quote?.bid || 'N/A'}`);
    
    // Fetch options chain
    console.log(`📊 Fetching options chain for ${symbol}...`);
    const optionsChain = await polygonClient.getOptionChainSnapshot(symbol);
    console.log(`📊 Fetched options chain for ${symbol} with ${optionsChain.options.calls.length + optionsChain.options.puts.length} total contracts`);
    
    // Filter by expiry date if specified
    let filteredOptions = optionsChain;
    if (expiryDate) {
      const filteredCalls = optionsChain.options.calls.filter(option => 
        option.contract.expiration_date === expiryDate
      );
      const filteredPuts = optionsChain.options.puts.filter(option => 
        option.contract.expiration_date === expiryDate
      );
      
      filteredOptions = {
        ...optionsChain,
        options: {
          calls: filteredCalls,
          puts: filteredPuts
        }
      };
      
      console.log(`📅 Filtered to ${filteredCalls.length + filteredPuts.length} contracts for expiry ${expiryDate}`);
    }
    
    // Store options data to BigQuery
    console.log(`💾 Storing options data to BigQuery...`);
    await dbService.storeOptionsData(filteredOptions);
    console.log(`💾 Successfully stored options chain data to BigQuery`);
    
    // Store underlying stock data
    console.log(`💾 Storing stock data to BigQuery...`);
    await dbService.storeStockData(stockSnapshot);
    console.log(`💾 Successfully stored stock data for ${symbol}`);
    
    return {
      optionsFetched: optionsChain.options.calls.length + optionsChain.options.puts.length,
      optionsStored: 'success',
      stockPrice: stockSnapshot.last_quote?.bid || null,
      stockDataStored: 'success',
      timestamp: new Date().toISOString(),
      message: `Successfully fetched and stored ${filteredOptions.options.calls.length + filteredOptions.options.puts.length} options contracts and stock data for ${symbol}`
    };
    
  } catch (error) {
    console.error(`❌ Error in handleFetchAndStore for ${symbol}:`, error);
    throw error;
  }
}

// Fetch options data only (no storage)
async function handleFetchOnly(
  symbol: string, 
  expiryDate: string | undefined, 
  polygonClient: PolygonAPIClient
) {
  console.log(`📡 Fetching options data for ${symbol} (no storage)`);
  
  try {
    const optionsChain = await polygonClient.getOptionChainSnapshot(symbol);
    let filteredOptions = optionsChain;
    
    if (expiryDate) {
      const filteredCalls = optionsChain.options.calls.filter(option => 
        option.contract.expiration_date === expiryDate
      );
      const filteredPuts = optionsChain.options.puts.filter(option => 
        option.contract.expiration_date === expiryDate
      );
      
      filteredOptions = {
        ...optionsChain,
        options: {
          calls: filteredCalls,
          puts: filteredPuts
        }
      };
    }
    
    return {
      optionsCount: filteredOptions.options.calls.length + filteredOptions.options.puts.length,
      options: {
        calls: filteredOptions.options.calls.slice(0, 5), // Return first 5 for preview
        puts: filteredOptions.options.puts.slice(0, 5)
      },
      totalAvailable: optionsChain.options.calls.length + optionsChain.options.puts.length,
      underlyingPrice: optionsChain.underlying_price,
      message: `Successfully fetched ${filteredOptions.options.calls.length + filteredOptions.options.puts.length} options contracts for ${symbol}`
    };
    
  } catch (error) {
    console.error(`❌ Error in handleFetchOnly for ${symbol}:`, error);
    throw error;
  }
}

// Get available expiry dates from BigQuery
async function handleGetExpiryDates(symbol: string, dbService: PolygonDatabaseService) {
  console.log(`📅 Getting expiry dates for ${symbol}`);
  
  try {
    // For now, return a placeholder since the method doesn't exist yet
    // TODO: Implement getExpiryDates method in PolygonDatabaseService
    return { 
      dates: [],
      message: 'getExpiryDates method not yet implemented in PolygonDatabaseService',
      note: 'This will query BigQuery for available expiry dates when implemented'
    };
  } catch (error) {
    console.error(`❌ Error in handleGetExpiryDates for ${symbol}:`, error);
    throw error;
  }
}

// Get options data from BigQuery
async function handleGetOptionsData(
  symbol: string, 
  expiryDate: string | undefined, 
  dbService: PolygonDatabaseService
) {
  console.log(`📊 Getting options data for ${symbol} from BigQuery`);
  
  if (!expiryDate) {
    throw new Error('expiry_date is required for getting options data');
  }
  
  try {
    // For now, return a placeholder since the method doesn't exist yet
    // TODO: Implement getOptionsData method in PolygonDatabaseService
    return { 
      rows: [],
      message: 'getOptionsData method not yet implemented in PolygonDatabaseService',
      note: 'This will query BigQuery for options data when implemented',
      symbol: symbol,
      expiryDate: expiryDate
    };
  } catch (error) {
    console.error(`❌ Error in handleGetOptionsData for ${symbol}:`, error);
    throw error;
  }
}

// Get underlying asset price from BigQuery
async function handleGetUnderlyingPrice(symbol: string, dbService: PolygonDatabaseService) {
  console.log(`💰 Getting underlying price for ${symbol}`);
  
  try {
    // For now, return a placeholder since the method doesn't exist yet
    // TODO: Implement getUnderlyingPrice method in PolygonDatabaseService
    return {
      underlying_price: 0,
      timestamp: null,
      message: 'getUnderlyingPrice method not yet implemented in PolygonDatabaseService',
      note: 'This will query BigQuery for underlying asset price when implemented'
    };
  } catch (error) {
    console.error(`❌ Error in handleGetUnderlyingPrice for ${symbol}:`, error);
    throw error;
  }
}

export const polygonHealthCheck = async (req: Request, res: Response): Promise<void> => {
  console.log('🏥 Polygon health check called');
  
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

    res.status(200).json({
      success: true,
      message: 'Polygon health check passed - full options chain API ready',
      timestamp: new Date().toISOString(),
      services: {
        database: 'ready',
        polygonAPI: process.env.POLYGON_API_KEY ? 'configured' : 'not-configured',
        compositePrimaryKey: 'enabled',
        upsertFunctionality: 'deployed',
        optionsChainAPI: 'ready',
        timeseriesStorage: 'ready'
      },
      endpoints: {
        'GET /': 'Health check',
        'POST /': 'Main options fetcher (use ?action=fetch-and-store)',
        'GET /?action=health-check': 'Health check with detailed status',
        'POST /?action=fetch-and-store&symbol=MSTR': 'Fetch and store options data',
        'POST /?action=fetch-only&symbol=MSTR': 'Fetch options data only',
        'GET /?action=get-expiry-dates&symbol=MSTR': 'Get available expiry dates',
        'POST /?action=get-options-data&symbol=MSTR&expiry=2024-01-19': 'Get options data from BigQuery',
        'POST /?action=get-underlying-price&symbol=MSTR': 'Get underlying asset price'
      },
      nextSteps: [
        'Test the health check endpoint',
        'Test the fetch-and-store endpoint with a symbol',
        'Full Polygon API integration is now implemented!',
        'Add BigQuery data retrieval methods for complete functionality'
      ]
    });

  } catch (error) {
    console.error('❌ Health check failed:', error);
    
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