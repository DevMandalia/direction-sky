import { Request, Response } from '@google-cloud/functions-framework';
import { IngestionResult } from '../types/data';

export const dataIngestion = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const timestamp = Date.now();
  
  console.log('Starting FRED-only data ingestion orchestration at:', new Date().toISOString());
  
  try {
    // Process FRED and X sentiment data
    const dataSources = ['fred', 'x_sentiment'];
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
    
    // Process X sentiment data source
    try {
      console.log('Processing X sentiment data source...');
      
      const sourceStartTime = Date.now();
      
      // Simulate X sentiment data processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const sourceProcessingTime = Date.now() - sourceStartTime;
      
      // Simulate successful X sentiment data collection
      const dataPoints = 25; // Number of sentiment metrics we're collecting
      totalDataPoints += dataPoints;
      
      results['x_sentiment'] = {
        status: 'success',
        dataPoints
      };
      
      console.log(`Successfully processed X sentiment: ${dataPoints} metrics in ${sourceProcessingTime}ms`);
      
    } catch (error) {
      console.error(`Error processing X sentiment:`, error);
      
      results['x_sentiment'] = {
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
        ingestionId: `multi_source_ingestion_${timestamp}`,
        note: 'Multi-source ingestion including FRED and X sentiment data'
      };
      
      // In a real implementation, you would send this to your processing layer
      console.log('Sending aggregated FRED data to processing layer:', aggregatedData);
      
    } catch (error) {
      console.error('Error sending aggregated data to processing layer:', error);
    }
    
    const successCount = Object.values(results).filter(r => r.status === 'success').length;
    const errorCount = Object.values(results).filter(r => r.status === 'error').length;
    
    console.log(`Multi-source data ingestion completed. Success: ${successCount}, Errors: ${errorCount}, Total Time: ${processingTime}ms`);
    
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
          note: 'Multi-source ingestion including FRED economic data and X social sentiment analysis'
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
        ],
        xSentimentMetrics: [
          'bitcoin_sentiment_score', 'overall_sentiment_label', 'total_tweets_analyzed',
          'positive_tweet_count', 'negative_tweet_count', 'neutral_tweet_count',
          'engagement_metrics', 'keyword_frequency', 'trending_keywords',
          'top_influential_tweets', 'account_sentiment_analysis'
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