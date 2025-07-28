import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { DataSource, GlassnodeResponse, CoinGlassResponse, FREDResponse, BinanceResponse } from '../types/data';

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