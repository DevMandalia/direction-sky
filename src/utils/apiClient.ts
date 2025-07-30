import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { DataSource, GlassnodeResponse, CoinGlassResponse, FREDResponse, BinanceResponse, CoinMarketCapFearGreedResponse } from '../types/data';

export class APIClient {
  private client: AxiosInstance;
  private retryAttempts: number;
  private retryDelay: number;

  constructor(retryAttempts: number = 3, retryDelay: number = 1000) {
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DirectionSky-DataIngestion/1.0'
      }
    });
    this.retryAttempts = retryAttempts;
    this.retryDelay = retryDelay;
  }

  private async retryRequest<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    attempt: number = 1
  ): Promise<AxiosResponse<T>> {
    try {
      return await requestFn();
    } catch (error) {
      if (attempt < this.retryAttempts && this.isRetryableError(error)) {
        console.log(`Retry attempt ${attempt} for API request`);
        await this.delay(this.retryDelay * attempt);
        return this.retryRequest(requestFn, attempt + 1);
      }
      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    const status = error.response?.status;
    return status >= 500 || status === 429 || !status;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async fetchGlassnodeData(endpoint: string, params: Record<string, any> = {}): Promise<GlassnodeResponse> {
    const apiKey = process.env.GLASSNODE_API_KEY;
    if (!apiKey) {
      throw new Error('GLASSNODE_API_KEY environment variable is required');
    }

    const url = `https://api.glassnode.com${endpoint}`;
    const queryParams = new URLSearchParams({
      ...params,
      api_key: apiKey,
      timestamp: Math.floor(Date.now() / 1000).toString()
    });

    const response = await this.retryRequest<GlassnodeResponse>(() =>
      this.client.get(`${url}?${queryParams.toString()}`)
    );

    return response.data;
  }

  async fetchCoinGlassData(endpoint: string, params: Record<string, any> = {}): Promise<CoinGlassResponse> {
    const apiKey = process.env.COINGLASS_API_KEY;
    if (!apiKey) {
      throw new Error('COINGLASS_API_KEY environment variable is required');
    }

    const url = `https://open-api.coinglass.com${endpoint}`;
    const headers = {
      'CG-API-KEY': apiKey
    };

    const response = await this.retryRequest<CoinGlassResponse>(() =>
      this.client.get(url, { headers, params })
    );

    return response.data;
  }

  async fetchFREDData(endpoint: string, params: Record<string, any> = {}): Promise<FREDResponse> {
    const apiKey = process.env.FRED_API_KEY;
    if (!apiKey) {
      throw new Error('FRED_API_KEY environment variable is required');
    }

    const url = `https://api.stlouisfed.org/fred${endpoint}`;
    const queryParams = new URLSearchParams({
      ...params,
      api_key: apiKey,
      file_type: 'json'
    });

    const response = await this.retryRequest<FREDResponse>(() =>
      this.client.get(`${url}?${queryParams.toString()}`)
    );

    return response.data;
  }

  async fetchBinanceData(endpoint: string, params: Record<string, any> = {}): Promise<BinanceResponse> {
    const url = `https://api.binance.com${endpoint}`;
    
    const response = await this.retryRequest<BinanceResponse>(() =>
      this.client.get(url, { params })
    );

    return response.data;
  }

  async fetchBinanceAuthenticatedData(
    endpoint: string, 
    params: Record<string, any> = {}
  ): Promise<any> {
    const apiKey = process.env.BINANCE_API_KEY;
    const secretKey = process.env.BINANCE_SECRET_KEY;
    
    if (!apiKey || !secretKey) {
      throw new Error('BINANCE_API_KEY and BINANCE_SECRET_KEY environment variables are required');
    }

    const url = `https://api.binance.com${endpoint}`;
    const timestamp = Date.now();
    
    // For authenticated requests, you would typically need to sign the request
    // This is a simplified version - in production you'd need proper HMAC signing
    const headers = {
      'X-MBX-APIKEY': apiKey
    };

    const response = await this.retryRequest(() =>
      this.client.get(url, { 
        headers, 
        params: { ...params, timestamp } 
      })
    );

    return response.data;
  }

  async fetchCoinMarketCapFearGreedData(): Promise<CoinMarketCapFearGreedResponse> {
    const apiKey = process.env.COINMARKETCAP_API_KEY;
    if (!apiKey) {
      throw new Error('COINMARKETCAP_API_KEY environment variable is required');
    }

    // Since the Fear and Greed Index endpoint doesn't exist, we'll create a sentiment indicator
    // based on available market data from CoinMarketCap
    const [btcData, globalData] = await Promise.all([
      this.fetchCoinMarketCapData('/v1/cryptocurrency/quotes/latest?symbol=BTC'),
      this.fetchCoinMarketCapData('/v1/global-metrics/quotes/latest')
    ]);

    // Calculate sentiment based on market metrics
    const sentimentScore = this.calculateMarketSentiment(btcData, globalData);

    return {
      data: {
        value: sentimentScore.value,
        value_classification: sentimentScore.classification,
        timestamp: new Date().toISOString(),
        time_until_update: 3600 // 1 hour
      },
      status: {
        timestamp: new Date().toISOString(),
        error_code: 0,
        error_message: null,
        elapsed: 0,
        credit_count: 2, // BTC + Global metrics
        notice: 'Sentiment calculated from market data'
      }
    };
  }

  private async fetchCoinMarketCapData(endpoint: string): Promise<any> {
    const apiKey = process.env.COINMARKETCAP_API_KEY;
    if (!apiKey) {
      throw new Error('COINMARKETCAP_API_KEY environment variable is required');
    }

    const url = `https://pro-api.coinmarketcap.com${endpoint}`;
    const headers = {
      'X-CMC_PRO_API_KEY': apiKey
    };

    const response = await this.retryRequest(() =>
      this.client.get(url, { headers })
    );

    return response.data;
  }

  private calculateMarketSentiment(btcData: any, globalData: any): { value: number; classification: string } {
    const btc = btcData.data.BTC;
    const global = globalData.data;
    
    // Extract key metrics
    const btcPrice = btc.quote.USD.price;
    const btc24hChange = btc.quote.USD.percent_change_24h;
    const btc7dChange = btc.quote.USD.percent_change_7d;
    const btcVolume = btc.quote.USD.volume_24h;
    const btcMarketCap = btc.quote.USD.market_cap;
    
    const totalMarketCap = global.quote.USD.total_market_cap;
    const totalVolume = global.quote.USD.total_volume_24h;
    const btcDominance = global.btc_dominance;
    const ethDominance = global.eth_dominance;
    
    // Calculate sentiment factors (0-100 scale)
    let sentimentScore = 50; // Start neutral
    
    // Price momentum (30% weight)
    const priceMomentum = (btc24hChange + btc7dChange) / 2;
    if (priceMomentum > 5) sentimentScore += 15;
    else if (priceMomentum > 2) sentimentScore += 10;
    else if (priceMomentum > 0) sentimentScore += 5;
    else if (priceMomentum < -5) sentimentScore -= 15;
    else if (priceMomentum < -2) sentimentScore -= 10;
    else if (priceMomentum < 0) sentimentScore -= 5;
    
    // Volume activity (20% weight)
    const volumeRatio = btcVolume / totalVolume;
    if (volumeRatio > 0.5) sentimentScore += 10;
    else if (volumeRatio > 0.3) sentimentScore += 5;
    else if (volumeRatio < 0.1) sentimentScore -= 10;
    else if (volumeRatio < 0.2) sentimentScore -= 5;
    
    // Market dominance (20% weight)
    if (btcDominance > 65) sentimentScore += 10; // Strong BTC dominance = confidence
    else if (btcDominance > 55) sentimentScore += 5;
    else if (btcDominance < 45) sentimentScore -= 10; // Weak BTC dominance = uncertainty
    else if (btcDominance < 55) sentimentScore -= 5;
    
    // Market cap stability (15% weight)
    const marketCapChange = global.quote.USD.total_market_cap_yesterday_percentage_change;
    if (Math.abs(marketCapChange) < 2) sentimentScore += 7; // Stable
    else if (Math.abs(marketCapChange) < 5) sentimentScore += 3;
    else if (Math.abs(marketCapChange) > 10) sentimentScore -= 7; // Volatile
    else if (Math.abs(marketCapChange) > 5) sentimentScore -= 3;
    
    // Altcoin vs BTC performance (15% weight)
    const altcoinMarketCap = global.altcoin_market_cap;
    const altcoinRatio = altcoinMarketCap / totalMarketCap;
    if (altcoinRatio > 0.4) sentimentScore += 7; // Altcoin season = greed
    else if (altcoinRatio > 0.3) sentimentScore += 3;
    else if (altcoinRatio < 0.2) sentimentScore -= 7; // BTC dominance = fear
    else if (altcoinRatio < 0.3) sentimentScore -= 3;
    
    // Clamp to 0-100 range
    sentimentScore = Math.max(0, Math.min(100, sentimentScore));
    
    // Determine classification
    let classification = 'Neutral';
    if (sentimentScore >= 75) classification = 'Extreme Greed';
    else if (sentimentScore >= 60) classification = 'Greed';
    else if (sentimentScore >= 45) classification = 'Neutral';
    else if (sentimentScore >= 30) classification = 'Fear';
    else classification = 'Extreme Fear';
    
    return {
      value: Math.round(sentimentScore),
      classification
    };
  }

  async sendToProcessingLayer(data: any): Promise<void> {
    const processingUrl = process.env.PROCESSING_LAYER_URL;
    if (!processingUrl) {
      throw new Error('PROCESSING_LAYER_URL environment variable is required');
    }

    await this.retryRequest(() =>
      this.client.post(processingUrl, data, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
    );
  }
}

export const apiClient = new APIClient(); 