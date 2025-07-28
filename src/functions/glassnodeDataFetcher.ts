import { Request, Response } from '@google-cloud/functions-framework';
import { apiClient } from '../utils/apiClient';
import { GLASSNODE_METRICS, RawDataCollection } from '../types/data';

export const glassnodeDataFetcher = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const timestamp = Math.floor(Date.now() / 1000);
  
  console.log('Starting Glassnode data ingestion at:', new Date().toISOString());
  
  try {
    const results: RawDataCollection[] = [];
    
    // Fetch data for each metric
    for (const metric of GLASSNODE_METRICS) {
      try {
        console.log(`Fetching ${metric.name} from Glassnode...`);
        
        const data = await apiClient.fetchGlassnodeData(metric.endpoint, {
          a: 'BTC', // Bitcoin
          i: '24h', // 24-hour intervals
          timestamp: timestamp.toString()
        });
        
        const collection: RawDataCollection = {
          timestamp: Date.now(),
          source: 'glassnode',
          data: {
            metric: metric.name,
            description: metric.description,
            unit: metric.unit,
            category: metric.category,
            endpoint: metric.endpoint,
            response: data
          },
          status: 'success'
        };
        
        results.push(collection);
        console.log(`Successfully fetched ${metric.name}: ${data.v?.length || 0} data points`);
        
      } catch (error) {
        console.error(`Error fetching ${metric.name}:`, error);
        
        const errorCollection: RawDataCollection = {
          timestamp: Date.now(),
          source: 'glassnode',
          data: {
            metric: metric.name,
            endpoint: metric.endpoint
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
        source: 'glassnode',
        timestamp: Date.now(),
        data: results,
        processingTime
      });
      console.log('Data sent to processing layer successfully');
    } catch (error) {
      console.error('Error sending data to processing layer:', error);
      // Don't fail the entire function if processing layer is down
    }
    
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    console.log(`Glassnode data ingestion completed. Success: ${successCount}, Errors: ${errorCount}, Time: ${processingTime}ms`);
    
    res.status(200).json({
      success: true,
      timestamp: Date.now(),
      source: 'glassnode',
      metricsProcessed: GLASSNODE_METRICS.length,
      successfulFetches: successCount,
      failedFetches: errorCount,
      processingTime,
      results
    });
    
  } catch (error) {
    console.error('Fatal error in Glassnode data fetcher:', error);
    
    res.status(500).json({
      success: false,
      timestamp: Date.now(),
      source: 'glassnode',
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: Date.now() - startTime
    });
  }
}; 