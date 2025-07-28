import { Request, Response } from '@google-cloud/functions-framework';
import { apiClient } from '../utils/apiClient';
import { RawDataCollection } from '../types/data';

// Binance endpoints and symbols
const BINANCE_ENDPOINTS = [
  {
    name: 'ticker_24hr',
    endpoint: '/api/v3/ticker/24hr',
    description: '24hr ticker price change statistics',
    category: 'price'
  },
  {
    name: 'klines',
    endpoint: '/api/v3/klines',
    description: 'Kline/candlestick data',
    category: 'price'
  },
  {
    name: 'trades',
    endpoint: '/api/v3/trades',
    description: 'Recent trades',
    category: 'market'
  },
  {
    name: 'depth',
    endpoint: '/api/v3/depth',
    description: 'Order book',
    category: 'market'
  }
];

const BINANCE_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];

export const binanceDataFetcher = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  
  console.log('Starting Binance data ingestion at:', new Date().toISOString());
  
  try {
    const results: RawDataCollection[] = [];
    
    // Fetch data for each endpoint and symbol combination
    for (const endpoint of BINANCE_ENDPOINTS) {
      for (const symbol of BINANCE_SYMBOLS) {
        try {
          console.log(`Fetching ${endpoint.name} for ${symbol} from Binance...`);
          
          let data;
          const params: Record<string, any> = { symbol };
          
          // Add specific parameters for different endpoints
          if (endpoint.name === 'klines') {
            params.interval = '1h';
            params.limit = 100;
          } else if (endpoint.name === 'trades') {
            params.limit = 50;
          } else if (endpoint.name === 'depth') {
            params.limit = 100;
          }
          
          data = await apiClient.fetchBinanceData(endpoint.endpoint, params);
          
          const collection: RawDataCollection = {
            timestamp: Date.now(),
            source: 'binance',
            data: {
              metric: endpoint.name,
              description: endpoint.description,
              category: endpoint.category,
              endpoint: endpoint.endpoint,
              symbol,
              parameters: params,
              response: data
            },
            status: 'success'
          };
          
          results.push(collection);
          console.log(`Successfully fetched ${endpoint.name} for ${symbol}`);
          
        } catch (error) {
          console.error(`Error fetching ${endpoint.name} for ${symbol}:`, error);
          
          const errorCollection: RawDataCollection = {
            timestamp: Date.now(),
            source: 'binance',
            data: {
              metric: endpoint.name,
              endpoint: endpoint.endpoint,
              symbol
            },
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
          
          results.push(errorCollection);
        }
      }
    }
    
    const processingTime = Date.now() - startTime;
    
    // Send data to processing layer
    try {
      await apiClient.sendToProcessingLayer({
        source: 'binance',
        timestamp: Date.now(),
        data: results,
        processingTime
      });
      console.log('Data sent to processing layer successfully');
    } catch (error) {
      console.error('Error sending data to processing layer:', error);
    }
    
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    console.log(`Binance data ingestion completed. Success: ${successCount}, Errors: ${errorCount}, Time: ${processingTime}ms`);
    
    res.status(200).json({
      success: true,
      timestamp: Date.now(),
      source: 'binance',
      endpointsProcessed: BINANCE_ENDPOINTS.length,
      symbolsProcessed: BINANCE_SYMBOLS.length,
      successfulFetches: successCount,
      failedFetches: errorCount,
      processingTime,
      results
    });
    
  } catch (error) {
    console.error('Fatal error in Binance data fetcher:', error);
    
    res.status(500).json({
      success: false,
      timestamp: Date.now(),
      source: 'binance',
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: Date.now() - startTime
    });
  }
}; 