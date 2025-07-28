import { Request, Response } from '@google-cloud/functions-framework';
import { databaseService } from '../services/databaseService';

export const historicalDataRetriever = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  
  try {
    const { 
      metric, 
      startTime: startTimeParam, 
      endTime: endTimeParam, 
      limit = 1000,
      aggregation = 'raw',
      period 
    } = req.query;

    if (!metric) {
      res.status(400).json({
        success: false,
        error: 'Metric parameter is required'
      });
      return;
    }

    // Handle different request types
    if (period) {
      // Trend analysis request
      const analysis = await databaseService.getTrendAnalysis(
        metric as string, 
        period as '1d' | '7d' | '30d' | '90d' | '1y'
      );
      
      res.status(200).json({
        success: true,
        timestamp: Date.now(),
        metric,
        period,
        analysis,
        queryTime: Date.now() - startTime
      });
      
    } else {
      // Historical data request
      const options = {
        startTime: startTimeParam ? new Date(startTimeParam as string) : undefined,
        endTime: endTimeParam ? new Date(endTimeParam as string) : undefined,
        limit: parseInt(limit as string),
        aggregation: aggregation as 'raw' | 'hourly' | 'daily' | 'weekly' | 'monthly'
      };

      const data = await databaseService.getHistoricalFREDData(metric as string, options);
      
      res.status(200).json({
        success: true,
        timestamp: Date.now(),
        metric,
        dataPoints: data.length,
        data,
        queryTime: Date.now() - startTime,
        options
      });
    }
    
  } catch (error) {
    console.error('Error in historical data retriever:', error);
    
    res.status(500).json({
      success: false,
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
      queryTime: Date.now() - startTime
    });
  }
};

// Multi-metric trend analysis endpoint
export const multiMetricTrendAnalysis = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  
  try {
    const { metrics, period = '30d' } = req.body;

    if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Metrics array is required'
      });
      return;
    }

    const analysis = await databaseService.getMultiMetricTrendAnalysis(
      metrics, 
      period as '1d' | '7d' | '30d' | '90d' | '1y'
    );
    
    res.status(200).json({
      success: true,
      timestamp: Date.now(),
      metrics,
      period,
      analysis,
      queryTime: Date.now() - startTime
    });
    
  } catch (error) {
    console.error('Error in multi-metric trend analysis:', error);
    
    res.status(500).json({
      success: false,
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
      queryTime: Date.now() - startTime
    });
  }
};

// Correlation analysis endpoint
export const correlationAnalysis = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  
  try {
    const { metric1, metric2, period = '30d' } = req.body;

    if (!metric1 || !metric2) {
      res.status(400).json({
        success: false,
        error: 'Both metric1 and metric2 are required'
      });
      return;
    }

    const correlation = await databaseService.getCorrelationAnalysis(
      metric1,
      metric2,
      period as '30d' | '90d' | '1y'
    );
    
    res.status(200).json({
      success: true,
      timestamp: Date.now(),
      correlation,
      queryTime: Date.now() - startTime
    });
    
  } catch (error) {
    console.error('Error in correlation analysis:', error);
    
    res.status(500).json({
      success: false,
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
      queryTime: Date.now() - startTime
    });
  }
}; 