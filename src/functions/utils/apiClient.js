"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiClient = exports.APIClient = void 0;
const axios_1 = __importDefault(require("axios"));
class APIClient {
    client;
    retryAttempts;
    retryDelay;
    constructor(retryAttempts = 3, retryDelay = 1000) {
        this.client = axios_1.default.create({
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'DirectionSky-DataIngestion/1.0'
            }
        });
        this.retryAttempts = retryAttempts;
        this.retryDelay = retryDelay;
    }
    async retryRequest(requestFn, attempt = 1) {
        try {
            return await requestFn();
        }
        catch (error) {
            if (attempt < this.retryAttempts && this.isRetryableError(error)) {
                console.log(`Retry attempt ${attempt} for API request`);
                await this.delay(this.retryDelay * attempt);
                return this.retryRequest(requestFn, attempt + 1);
            }
            throw error;
        }
    }
    isRetryableError(error) {
        const status = error.response?.status;
        return status >= 500 || status === 429 || !status;
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async fetchGlassnodeData(endpoint, params = {}) {
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
        const response = await this.retryRequest(() => this.client.get(`${url}?${queryParams.toString()}`));
        return response.data;
    }
    async fetchCoinGlassData(endpoint, params = {}) {
        const apiKey = process.env.COINGLASS_API_KEY;
        if (!apiKey) {
            throw new Error('COINGLASS_API_KEY environment variable is required');
        }
        const url = `https://open-api.coinglass.com${endpoint}`;
        const headers = {
            'CG-API-KEY': apiKey
        };
        const response = await this.retryRequest(() => this.client.get(url, { headers, params }));
        return response.data;
    }
    async fetchFREDData(endpoint, params = {}) {
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
        const response = await this.retryRequest(() => this.client.get(`${url}?${queryParams.toString()}`));
        return response.data;
    }
    async fetchBinanceData(endpoint, params = {}) {
        const url = `https://api.binance.com${endpoint}`;
        const response = await this.retryRequest(() => this.client.get(url, { params }));
        return response.data;
    }
    async fetchBinanceAuthenticatedData(endpoint, params = {}) {
        const apiKey = process.env.BINANCE_API_KEY;
        const secretKey = process.env.BINANCE_SECRET_KEY;
        if (!apiKey || !secretKey) {
            throw new Error('BINANCE_API_KEY and BINANCE_SECRET_KEY environment variables are required');
        }
        const url = `https://api.binance.com${endpoint}`;
        const timestamp = Date.now();
        const headers = {
            'X-MBX-APIKEY': apiKey
        };
        const response = await this.retryRequest(() => this.client.get(url, {
            headers,
            params: { ...params, timestamp }
        }));
        return response.data;
    }
    async fetchCoinMarketCapFearGreedData() {
        const apiKey = process.env.COINMARKETCAP_API_KEY;
        if (!apiKey) {
            throw new Error('COINMARKETCAP_API_KEY environment variable is required');
        }
        const [btcData, globalData] = await Promise.all([
            this.fetchCoinMarketCapData('/v1/cryptocurrency/quotes/latest?symbol=BTC'),
            this.fetchCoinMarketCapData('/v1/global-metrics/quotes/latest')
        ]);
        const sentimentScore = this.calculateMarketSentiment(btcData, globalData);
        return {
            data: {
                value: sentimentScore.value,
                value_classification: sentimentScore.classification,
                timestamp: new Date().toISOString(),
                time_until_update: 3600
            },
            status: {
                timestamp: new Date().toISOString(),
                error_code: 0,
                error_message: null,
                elapsed: 0,
                credit_count: 2,
                notice: 'Sentiment calculated from market data'
            }
        };
    }
    async fetchCoinMarketCapData(endpoint) {
        const apiKey = process.env.COINMARKETCAP_API_KEY;
        if (!apiKey) {
            throw new Error('COINMARKETCAP_API_KEY environment variable is required');
        }
        const url = `https://pro-api.coinmarketcap.com${endpoint}`;
        const headers = {
            'X-CMC_PRO_API_KEY': apiKey
        };
        const response = await this.retryRequest(() => this.client.get(url, { headers }));
        return response.data;
    }
    calculateMarketSentiment(btcData, globalData) {
        const btc = btcData.data.BTC;
        const global = globalData.data;
        const btcPrice = btc.quote.USD.price;
        const btc24hChange = btc.quote.USD.percent_change_24h;
        const btc7dChange = btc.quote.USD.percent_change_7d;
        const btcVolume = btc.quote.USD.volume_24h;
        const btcMarketCap = btc.quote.USD.market_cap;
        const totalMarketCap = global.quote.USD.total_market_cap;
        const totalVolume = global.quote.USD.total_volume_24h;
        const btcDominance = global.btc_dominance;
        const ethDominance = global.eth_dominance;
        let sentimentScore = 50;
        const priceMomentum = (btc24hChange + btc7dChange) / 2;
        if (priceMomentum > 5)
            sentimentScore += 15;
        else if (priceMomentum > 2)
            sentimentScore += 10;
        else if (priceMomentum > 0)
            sentimentScore += 5;
        else if (priceMomentum < -5)
            sentimentScore -= 15;
        else if (priceMomentum < -2)
            sentimentScore -= 10;
        else if (priceMomentum < 0)
            sentimentScore -= 5;
        const volumeRatio = btcVolume / totalVolume;
        if (volumeRatio > 0.5)
            sentimentScore += 10;
        else if (volumeRatio > 0.3)
            sentimentScore += 5;
        else if (volumeRatio < 0.1)
            sentimentScore -= 10;
        else if (volumeRatio < 0.2)
            sentimentScore -= 5;
        if (btcDominance > 65)
            sentimentScore += 10;
        else if (btcDominance > 55)
            sentimentScore += 5;
        else if (btcDominance < 45)
            sentimentScore -= 10;
        else if (btcDominance < 55)
            sentimentScore -= 5;
        const marketCapChange = global.quote.USD.total_market_cap_yesterday_percentage_change;
        if (Math.abs(marketCapChange) < 2)
            sentimentScore += 7;
        else if (Math.abs(marketCapChange) < 5)
            sentimentScore += 3;
        else if (Math.abs(marketCapChange) > 10)
            sentimentScore -= 7;
        else if (Math.abs(marketCapChange) > 5)
            sentimentScore -= 3;
        const altcoinMarketCap = global.altcoin_market_cap;
        const altcoinRatio = altcoinMarketCap / totalMarketCap;
        if (altcoinRatio > 0.4)
            sentimentScore += 7;
        else if (altcoinRatio > 0.3)
            sentimentScore += 3;
        else if (altcoinRatio < 0.2)
            sentimentScore -= 7;
        else if (altcoinRatio < 0.3)
            sentimentScore -= 3;
        sentimentScore = Math.max(0, Math.min(100, sentimentScore));
        let classification = 'Neutral';
        if (sentimentScore >= 75)
            classification = 'Extreme Greed';
        else if (sentimentScore >= 60)
            classification = 'Greed';
        else if (sentimentScore >= 45)
            classification = 'Neutral';
        else if (sentimentScore >= 30)
            classification = 'Fear';
        else
            classification = 'Extreme Fear';
        return {
            value: Math.round(sentimentScore),
            classification
        };
    }
    async sendToProcessingLayer(data) {
        const processingUrl = process.env.PROCESSING_LAYER_URL;
        if (!processingUrl) {
            throw new Error('PROCESSING_LAYER_URL environment variable is required');
        }
        await this.retryRequest(() => this.client.post(processingUrl, data, {
            headers: {
                'Content-Type': 'application/json'
            }
        }));
    }
}
exports.APIClient = APIClient;
exports.apiClient = new APIClient();
//# sourceMappingURL=apiClient.js.map