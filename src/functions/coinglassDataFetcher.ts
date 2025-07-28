import { Request, Response } from '@google-cloud/functions-framework';
import { apiClient } from '../utils/apiClient';
import { RawDataCollection } from '../types/data';

// CoinGlass endpoints and metrics
const COINGLASS_ENDPOINTS = [
  {
    name: 'futures_funding_rate',
    endpoint: '/api/pro/v1/futures/fundingRate',
    description: 'Futures funding rates',
    category: 'market'
  },
  {
    name: 'open_interest',
    endpoint: '/api/pro/v1/futures/openInterest',
    description: 'Open interest data',
    category: 'market'
  },
  {
    name: 'long_short_ratio',
    endpoint: '/api/pro/v1/futures/longShortRatio',
    description: 'Long/short ratio',
    category: 'market'
  },
  {
    name: 'liquidations',
    endpoint: '/api/pro/v1/futures/liquidations',
    description: 'Liquidation data',
    category: 'market'
  }
];

export const coinglassDataFetcher = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  
  console.log('Starting CoinGlass data ingestion at:', new Date().toISOString());
  
  try {
    const results: RawDataCollection[] = [];
    
    // Fetch data for each endpoint
    for (const endpoint of COINGLASS_ENDPOINTS) {
      try {
        console.log(`Fetching ${endpoint.name} from CoinGlass...`);
        
        const data = await apiClient.fetchCoinGlassData(endpoint.endpoint, {
          symbol: 'BTCUSDT'
        });
        
        const collection: RawDataCollection = {
          timestamp: Date.now(),
          source: 'coinglass',
          data: {
            metric: endpoint.name,
            description: endpoint.description,
            category: endpoint.category,
            endpoint: endpoint.endpoint,
            response: data
          },
          status: 'success'
        };
        
        results.push(collection);
        console.log(`Successfully fetched ${endpoint.name}`);
        
      } catch (error) {
        console.error(`Error fetching ${endpoint.name}:`, error);
        
        const errorCollection: RawDataCollection = {
          timestamp: Date.now(),
          source: 'coinglass',
          data: {
            metric: endpoint.name,
            endpoint: endpoint.endpoint
          },
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        
        results.push(errorCollection);
      }
    }
    
    const processingTime = Date.now() - startTime;
    
    // Send data to processing layer
    try {
      await apiClient.sendToProcessingLayer({
        source: 'coinglass',
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
    
    console.log(`CoinGlass data ingestion completed. Success: ${successCount}, Errors: ${errorCount}, Time: ${processingTime}ms`);
    
    res.status(200).json({
      success: true,
      timestamp: Date.now(),
      source: 'coinglass',
      endpointsProcessed: COINGLASS_ENDPOINTS.length,
      successfulFetches: successCount,
      failedFetches: errorCount,
      processingTime,
      results
    });
    
  } catch (error) {
    console.error('Fatal error in CoinGlass data fetcher:', error);
    
    res.status(500).json({
      success: false,
      timestamp: Date.now(),
      source: 'coinglass',
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: Date.now() - startTime
    });
  }
}; 