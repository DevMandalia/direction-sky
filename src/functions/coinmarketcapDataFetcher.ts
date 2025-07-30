import { Request, Response } from '@google-cloud/functions-framework';
import { apiClient } from '../utils/apiClient';
import { databaseService } from '../services/databaseService';
import { RawDataCollection } from '../types/data';

// CoinMarketCap Fear and Greed Index metrics
const COINMARKETCAP_METRICS = [
  {
    name: 'fear_greed_index',
    description: 'Crypto Fear and Greed Index',
    unit: 'index',
    category: 'sentiment',
    source: 'coinmarketcap',
    endpoint: '/v1/tools/fear-greed-index'
  }
];

export const coinmarketcapDataFetcher = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  
  console.log('Starting CoinMarketCap Fear and Greed data ingestion at:', new Date().toISOString());
  
  try {
    // Initialize database table if needed
    await databaseService.initializeCoinMarketCapTable();
    
    const results: RawDataCollection[] = [];
    const storageResults: { metric: string; stored: boolean; error?: string }[] = [];
    
    // Fetch data for each metric
    for (const metric of COINMARKETCAP_METRICS) {
      try {
        console.log(`Fetching ${metric.name} from CoinMarketCap...`);
        
        const data = await apiClient.fetchCoinMarketCapFearGreedData();
        
        // Store data in BigQuery
        try {
          await databaseService.storeCoinMarketCapData(data, metric.name, {
            description: metric.description,
            unit: metric.unit,
            category: metric.category
          });
          
          storageResults.push({ metric: metric.name, stored: true });
          console.log(`Successfully stored ${metric.name} in BigQuery`);
          
        } catch (storageError) {
          console.error(`Error storing ${metric.name} in BigQuery:`, storageError);
          storageResults.push({ 
            metric: metric.name, 
            stored: false, 
            error: storageError instanceof Error ? storageError.message : 'Unknown error' 
          });
        }
        
        const collection: RawDataCollection = {
          timestamp: Date.now(),
          source: 'coinmarketcap',
          data: {
            metric: metric.name,
            description: metric.description,
            unit: metric.unit,
            category: metric.category,
            endpoint: metric.endpoint,
            response: data,
            metadata: {
              value: data.data.value,
              value_classification: data.data.value_classification,
              timestamp: data.data.timestamp,
              time_until_update: data.data.time_until_update,
              api_credits_used: data.status.credit_count,
              stored_in_database: storageResults.find(r => r.metric === metric.name)?.stored || false
            }
          },
          status: 'success'
        };
        
        results.push(collection);
        console.log(`Successfully fetched ${metric.name}: value=${data.data.value}, classification=${data.data.value_classification}`);
        
      } catch (error) {
        console.error(`Error fetching ${metric.name}:`, error);
        
        const errorCollection: RawDataCollection = {
          timestamp: Date.now(),
          source: 'coinmarketcap',
          data: {
            metric: metric.name,
            endpoint: metric.endpoint
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
    
    // Send data to processing layer
    try {
      await apiClient.sendToProcessingLayer({
        source: 'coinmarketcap',
        timestamp: Date.now(),
        data: results,
        processingTime,
        storageResults,
        summary: {
          totalMetrics: COINMARKETCAP_METRICS.length,
          successfulFetches: results.filter(r => r.status === 'success').length,
          failedFetches: results.filter(r => r.status === 'error').length,
          successfulStores: storageResults.filter(r => r.stored).length,
          failedStores: storageResults.filter(r => !r.stored).length,
          categories: [...new Set(COINMARKETCAP_METRICS.map(m => m.category))]
        }
      });
      console.log('Data sent to processing layer successfully');
    } catch (error) {
      console.error('Error sending data to processing layer:', error);
    }
    
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    const storedCount = storageResults.filter(r => r.stored).length;
    
    console.log(`CoinMarketCap data ingestion completed. Success: ${successCount}, Errors: ${errorCount}, Stored: ${storedCount}, Time: ${processingTime}ms`);
    
    res.status(200).json({
      success: true,
      timestamp: Date.now(),
      source: 'coinmarketcap',
      metricsProcessed: COINMARKETCAP_METRICS.length,
      successfulFetches: successCount,
      failedFetches: errorCount,
      successfulStores: storedCount,
      failedStores: storageResults.length - storedCount,
      processingTime,
      categories: [...new Set(COINMARKETCAP_METRICS.map(m => m.category))],
      results: results.map(r => ({
        metric: r.data.metric,
        status: r.status,
        value: r.data.metadata?.value,
        valueClassification: r.data.metadata?.value_classification,
        timestamp: r.data.metadata?.timestamp,
        storedInDatabase: r.data.metadata?.stored_in_database || false
      }))
    });
    
  } catch (error) {
    console.error('Fatal error in CoinMarketCap data fetcher:', error);
    
    res.status(500).json({
      success: false,
      timestamp: Date.now(),
      source: 'coinmarketcap',
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: Date.now() - startTime
    });
  }
}; 