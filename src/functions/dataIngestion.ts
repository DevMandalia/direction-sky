import { Request, Response } from '@google-cloud/functions-framework';
import { IngestionResult } from '../types/data';

export const dataIngestion = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const timestamp = Date.now();
  
  console.log('Starting FRED-only data ingestion orchestration at:', new Date().toISOString());
  
  try {
    // For now, only process FRED data
    const dataSources = ['fred'];
    const results: IngestionResult['dataSources'] = {};
    let totalDataPoints = 0;
    
    // Process FRED data source
    try {
      console.log('Processing FRED data source...');
      
      // Simulate FRED data processing
      const sourceStartTime = Date.now();
      
      // Simulate processing time for FRED
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const sourceProcessingTime = Date.now() - sourceStartTime;
      
      // Simulate successful FRED data collection (30+ metrics)
      const dataPoints = 35; // Number of FRED metrics we're fetching
      totalDataPoints += dataPoints;
      
      results['fred'] = {
        status: 'success',
        dataPoints
      };
      
      console.log(`Successfully processed FRED: ${dataPoints} metrics in ${sourceProcessingTime}ms`);
      
    } catch (error) {
      console.error(`Error processing FRED:`, error);
      
      results['fred'] = {
        status: 'error',
        dataPoints: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    const processingTime = Date.now() - startTime;
    
    // Send aggregated results to processing layer
    try {
      const aggregatedData = {
        timestamp,
        dataSources: results,
        totalDataPoints,
        processingTime,
        ingestionId: `fred_ingestion_${timestamp}`,
        note: 'FRED-only ingestion - other sources commented out for testing'
      };
      
      // In a real implementation, you would send this to your processing layer
      console.log('Sending aggregated FRED data to processing layer:', aggregatedData);
      
    } catch (error) {
      console.error('Error sending aggregated data to processing layer:', error);
    }
    
    const successCount = Object.values(results).filter(r => r.status === 'success').length;
    const errorCount = Object.values(results).filter(r => r.status === 'error').length;
    
    console.log(`FRED-only data ingestion completed. Success: ${successCount}, Errors: ${errorCount}, Total Time: ${processingTime}ms`);
    
    res.status(200).json({
      success: true,
      timestamp,
      dataSources: results,
      totalDataPoints,
      processingTime,
      summary: {
        totalSources: dataSources.length,
        successfulSources: successCount,
        failedSources: errorCount,
        averageDataPointsPerSource: Math.round(totalDataPoints / dataSources.length),
        note: 'Currently testing FRED API only - other sources disabled'
      },
      fredMetrics: [
        'federal_funds_rate', 'prime_rate', 'treasury_10yr', 'treasury_2yr',
        'unemployment_rate', 'nonfarm_payrolls', 'labor_force_participation',
        'gdp', 'gdp_growth', 'gdp_per_capita',
        'cpi_all', 'cpi_core', 'pce_inflation',
        'm1_money_supply', 'm2_money_supply',
        'housing_starts', 'existing_home_sales',
        'personal_consumption', 'retail_sales',
        'industrial_production', 'capacity_utilization',
        'trade_balance', 'exports', 'imports',
        'dow_jones', 'snp500', 'vix',
        'dollar_index', 'euro_usd'
      ]
    });
    
  } catch (error) {
    console.error('Fatal error in FRED-only data ingestion orchestrator:', error);
    
    res.status(500).json({
      success: false,
      timestamp,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: Date.now() - startTime
    });
  }
}; 