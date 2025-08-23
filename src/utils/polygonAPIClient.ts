import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import WebSocket from 'ws';
import { 
  PolygonConfig, 
  AssetConfig, 
  OptionContractSnapshot, 
  OptionChainSnapshot, 
  UnifiedOptionsSnapshot, 
  StockSnapshot, 
  CryptoSnapshot,
  RealTimeOptionsData,
  PolygonDataCollection
} from '../types/polygon';

export class PolygonAPIClient {
  private client: AxiosInstance;
  private ws: WebSocket | null = null;
  private config: PolygonConfig;
  private assets: AssetConfig[];
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 5000;
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  constructor(config: PolygonConfig, assets: AssetConfig[] = []) {
    this.config = config;
    this.assets = assets.length > 0 ? assets : [];
    
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'DirectionSky-PolygonAPI/1.0'
      }
    });

    // Add request interceptor for API key
    this.client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      if (config.params) {
        config.params = {
          ...config.params,
          apiKey: this.config.apiKey
        };
      } else {
        config.params = { apiKey: this.config.apiKey };
      }
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: any) => {
        if (error.response?.status === 429) {
          // Rate limit hit, wait and retry
          await new Promise(resolve => setTimeout(resolve, 1000));
          return this.client.request(error.config);
        }
        return Promise.reject(error);
      }
    );
  }

  // REST API Methods
  async getOptionContractSnapshot(underlyingAsset: string, optionContract: string): Promise<OptionContractSnapshot> {
    try {
      const response = await this.client.get(`/v3/snapshot/options/${underlyingAsset}/${optionContract}`);
      return response.data.results;
    } catch (error) {
      console.error(`Error fetching option contract snapshot for ${optionContract}:`, error);
      throw error;
    }
  }

  async getOptionChainSnapshot(underlyingAsset: string): Promise<OptionChainSnapshot> {
    try {
      const response = await this.client.get(`/v3/snapshot/options/${underlyingAsset}`);
      return response.data.results;
    } catch (error) {
      console.error(`Error fetching option chain snapshot for ${underlyingAsset}:`, error);
      throw error;
    }
  }

  async getUnifiedOptionsSnapshot(underlyingAsset: string): Promise<UnifiedOptionsSnapshot> {
    try {
      const response = await this.client.get(`/v3/snapshot/options/${underlyingAsset}/unified`);
      return response.data.results;
    } catch (error) {
      console.error(`Error fetching unified options snapshot for ${underlyingAsset}:`, error);
      throw error;
    }
  }

  async getStockSnapshot(ticker: string): Promise<StockSnapshot> {
    try {
      const response = await this.client.get(`/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}`);
      return response.data.results;
    } catch (error) {
      console.error(`Error fetching stock snapshot for ${ticker}:`, error);
      throw error;
    }
  }

  async getCryptoSnapshot(ticker: string): Promise<CryptoSnapshot> {
    try {
      const response = await this.client.get(`/v2/snapshot/locale/global/markets/crypto/tickers/${ticker}`);
      return response.data.results;
    } catch (error) {
      console.error(`Error fetching crypto snapshot for ${ticker}:`, error);
      throw error;
    }
  }

  // WebSocket Methods for Real-time Data
  async connectWebSocket(): Promise<void> {
    if (this.ws && this.isConnected) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      this.ws = new WebSocket(this.config.wsUrl);
      
      this.ws.on('open', () => {
        console.log('Polygon.io WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.subscribeToAssets();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      this.ws.on('close', () => {
        console.log('Polygon.io WebSocket disconnected');
        this.isConnected = false;
        this.handleReconnection();
      });

      this.ws.on('error', (error) => {
        console.error('Polygon.io WebSocket error:', error);
        this.isConnected = false;
      });

    } catch (error) {
      console.error('Error connecting to Polygon.io WebSocket:', error);
      throw error;
    }
  }

  private subscribeToAssets(): void {
    if (!this.ws || !this.isConnected) return;

    const subscriptions: string[] = [];

    // Subscribe to stock data
    this.assets
      .filter(asset => asset.asset_type === 'stock' && asset.real_time_enabled)
      .forEach(asset => {
        subscriptions.push(`T.${asset.symbol}`); // Trades
        subscriptions.push(`Q.${asset.symbol}`); // Quotes
      });

    // Subscribe to crypto data
    this.assets
      .filter(asset => asset.asset_type === 'crypto' && asset.real_time_enabled)
      .forEach(asset => {
        subscriptions.push(`XT.${asset.symbol}`); // Crypto trades
        subscriptions.push(`XQ.${asset.symbol}`); // Crypto quotes
      });

    // Subscribe to options data (for MSTR)
    this.assets
      .filter(asset => asset.asset_type === 'stock' && asset.options_enabled && asset.real_time_enabled)
      .forEach(asset => {
        // Subscribe to options trades and quotes
        subscriptions.push(`OT.${asset.symbol}`); // Options trades
        subscriptions.push(`OQ.${asset.symbol}`); // Options quotes
        subscriptions.push(`OG.${asset.symbol}`); // Options Greeks
      });

    if (subscriptions.length > 0) {
      const subscribeMessage = {
        action: 'subscribe',
        params: subscriptions.join(',')
      };

      this.ws.send(JSON.stringify(subscribeMessage));
      console.log(`Subscribed to ${subscriptions.length} data streams:`, subscriptions);
    }
  }

  private handleWebSocketMessage(message: any): void {
    try {
      if (message.ev === 'T' || message.ev === 'XT') {
        // Trade event
        this.handleTradeEvent(message);
      } else if (message.ev === 'Q' || message.ev === 'XQ') {
        // Quote event
        this.handleQuoteEvent(message);
      } else if (message.ev === 'OG') {
        // Options Greeks event
        this.handleOptionsGreeksEvent(message);
      } else if (message.ev === 'OT') {
        // Options trade event
        this.handleOptionsTradeEvent(message);
      } else if (message.ev === 'OQ') {
        // Options quote event
        this.handleOptionsQuoteEvent(message);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  private handleTradeEvent(message: any): void {
    const tradeData: RealTimeOptionsData = {
      event: 'T',
      contract_id: message.sym || message.pair || '',
      underlying_asset: message.sym || message.pair || '',
      timestamp: message.t || Date.now(),
      data: {
        price: message.p,
        size: message.s
      }
    };

    this.notifyMessageHandlers('trade', tradeData);
  }

  private handleQuoteEvent(message: any): void {
    const quoteData: RealTimeOptionsData = {
      event: 'Q',
      contract_id: message.sym || message.pair || '',
      underlying_asset: message.sym || message.pair || '',
      timestamp: message.t || Date.now(),
      data: {
        bid: message.bp,
        ask: message.ap,
        bid_size: message.bs,
        ask_size: message.as
      }
    };

    this.notifyMessageHandlers('quote', quoteData);
  }

  private handleOptionsGreeksEvent(message: any): void {
    const greeksData: RealTimeOptionsData = {
      event: 'G',
      contract_id: message.c || '',
      underlying_asset: message.u || '',
      timestamp: message.t || Date.now(),
      data: {
        delta: message.d,
        gamma: message.g,
        theta: message.t,
        vega: message.v,
        rho: message.r,
        implied_volatility: message.iv
      }
    };

    this.notifyMessageHandlers('greeks', greeksData);
  }

  private handleOptionsTradeEvent(message: any): void {
    const optionsTradeData: RealTimeOptionsData = {
      event: 'T',
      contract_id: message.c || '',
      underlying_asset: message.u || '',
      timestamp: message.t || Date.now(),
      data: {
        price: message.p,
        size: message.s
      }
    };

    this.notifyMessageHandlers('options_trade', optionsTradeData);
  }

  private handleOptionsQuoteEvent(message: any): void {
    const optionsQuoteData: RealTimeOptionsData = {
      event: 'Q',
      contract_id: message.c || '',
      underlying_asset: message.u || '',
      timestamp: message.t || Date.now(),
      data: {
        bid: message.bp,
        ask: message.ap,
        bid_size: message.bs,
        ask_size: message.as
      }
    };

    this.notifyMessageHandlers('options_quote', optionsQuoteData);
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connectWebSocket();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached. Falling back to REST API only.');
    }
  }

  // Message Handler Management
  on(event: string, handler: (data: any) => void): void {
    this.messageHandlers.set(event, handler);
  }

  off(event: string): void {
    this.messageHandlers.delete(event);
  }

  private notifyMessageHandlers(event: string, data: any): void {
    const handler = this.messageHandlers.get(event);
    if (handler) {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in message handler for event ${event}:`, error);
      }
    }
  }

  // Utility Methods
  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  isWebSocketConnected(): boolean {
    return this.isConnected;
  }

  // Batch Data Collection for 5-minute intervals
  async collectBatchData(): Promise<PolygonDataCollection[]> {
    const results: PolygonDataCollection[] = [];
    const timestamp = Date.now();

    for (const asset of this.assets) {
      try {
        if (asset.asset_type === 'stock') {
          // Get stock snapshot
          const stockData = await this.getStockSnapshot(asset.symbol);
          results.push({
            timestamp,
            source: 'polygon_stock',
            data_type: 'snapshot',
            underlying_asset: asset.symbol,
            data: {
              contract_type: 'stock',
              response: stockData
            },
            status: 'success'
          });

          // Get options data if enabled
          if (asset.options_enabled) {
            try {
              const optionsData = await this.getUnifiedOptionsSnapshot(asset.symbol);
              results.push({
                timestamp,
                source: 'polygon_options',
                data_type: 'snapshot',
                underlying_asset: asset.symbol,
                data: {
                  response: optionsData
                },
                status: 'success'
              });
            } catch (error) {
              console.error(`Error fetching options data for ${asset.symbol}:`, error);
              results.push({
                timestamp,
                source: 'polygon_options',
                data_type: 'snapshot',
                underlying_asset: asset.symbol,
                data: {
                  response: {} as any // Temporary empty response for error cases
                },
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }
        } else if (asset.asset_type === 'crypto') {
          // Get crypto snapshot
          const cryptoData = await this.getCryptoSnapshot(asset.symbol);
          results.push({
            timestamp,
            source: 'polygon_crypto',
            data_type: 'snapshot',
            underlying_asset: asset.symbol,
            data: {
              contract_type: 'crypto',
              response: cryptoData
            },
            status: 'success'
          });
        }
      } catch (error) {
        console.error(`Error collecting batch data for ${asset.symbol}:`, error);
        results.push({
          timestamp,
          source: asset.asset_type === 'stock' ? 'polygon_stock' : 'polygon_crypto',
          data_type: 'snapshot',
          underlying_asset: asset.symbol,
          data: {
            response: {} as any // Temporary empty response for error cases
          },
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }
} 