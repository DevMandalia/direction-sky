const { polygonDatabaseService } = require('./dist/services/polygonDatabaseService');
const { polygonOptionsDataFetcher } = require('./dist/functions/polygonOptionsDataFetcher');

// Mock environment variables
process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
process.env.BIGQUERY_DATASET = 'test_dataset';
process.env.GOOGLE_APPLICATION_CREDENTIALS = './test-credentials.json';

// Mock BigQuery client
const mockBigQuery = {
  dataset: jest.fn().mockReturnValue({
    table: jest.fn().mockReturnValue({
      exists: jest.fn().mockResolvedValue([false]),
      create: jest.fn().mockResolvedValue([]),
      insert: jest.fn().mockResolvedValue([])
    })
  })
};

// Mock the BigQuery import
jest.mock('@google-cloud/bigquery', () => ({
  BigQuery: jest.fn().mockImplementation(() => mockBigQuery)
}));

describe('Polygon Options Data Fetcher Tests', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockReq = {
      body: {
        assets: [
          { symbol: 'MSTR', asset_type: 'stock', options_enabled: true },
          { symbol: 'BTC', asset_type: 'crypto', options_enabled: false }
        ]
      }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('polygonOptionsDataFetcher', () => {
    it('should process assets and return success response', async () => {
      await polygonOptionsDataFetcher(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          source: 'polygon',
          assets: expect.arrayContaining([
            expect.objectContaining({
              symbol: 'MSTR',
              type: 'stock',
              options: true
            }),
            expect.objectContaining({
              symbol: 'BTC',
              type: 'crypto',
              options: false
            })
          ])
        })
      );
    });

    it('should handle errors gracefully', async () => {
      const errorReq = { body: null };
      
      // Mock an error
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await polygonOptionsDataFetcher(errorReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          source: 'polygon'
        })
      );
    });
  });

  describe('polygonHealthCheck', () => {
    it('should return healthy status', async () => {
      await polygonHealthCheck({}, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          source: 'polygon',
          status: 'healthy'
        })
      );
    });
  });
});

describe('Polygon Database Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Table Initialization', () => {
    it('should create tables if they do not exist', async () => {
      await polygonDatabaseService.initializeTables();

      expect(mockBigQuery.dataset).toHaveBeenCalledWith('test_dataset');
      expect(mockBigQuery.dataset().table).toHaveBeenCalledWith('polygon_options');
      expect(mockBigQuery.dataset().table().create).toHaveBeenCalled();
    });
  });

  describe('Data Storage', () => {
    it('should store options data correctly', async () => {
      const mockOptionsData = {
        underlying_asset: 'MSTR',
        options: {
          calls: [
            {
              contract: {
                contract_id: 'test-call-1',
                strike_price: 100,
                expiration_date: '2024-01-19'
              },
              greeks: { delta: 0.5, gamma: 0.1, theta: -0.05, vega: 0.2 },
              last_quote: { bid: 1.50, ask: 1.55, bid_size: 10, ask_size: 10 },
              last_trade: { price: 1.52, size: 5 },
              volume: 100,
              open_interest: 500
            }
          ],
          puts: []
        }
      };

      await polygonDatabaseService.storeOptionsData(mockOptionsData);

      expect(mockBigQuery.dataset().table().insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            underlying_asset: 'MSTR',
            contract_id: 'test-call-1',
            strike_price: 100
          })
        ])
      );
    });

    it('should store stock data correctly', async () => {
      const mockStockData = {
        ticker: 'MSTR',
        last_quote: { bid: 100.50, ask: 100.55, bid_size: 100, ask_size: 100 },
        last_trade: { price: 100.52, size: 50 },
        min_av: { av: 100.25, t: Date.now() }
      };

      await polygonDatabaseService.storeStockData(mockStockData);

      expect(mockBigQuery.dataset().table().insert).toHaveBeenCalledWith([
        expect.objectContaining({
          ticker: 'MSTR',
          bid: 100.50,
          ask: 100.55
        })
      ]);
    });
  });
});

// Run tests if this file is executed directly
if (require.main === module) {
  console.log('Running Polygon Fetcher Tests...');
  
  // Test the fetcher function
  const testReq = {
    body: {
      assets: [
        { symbol: 'MSTR', asset_type: 'stock', options_enabled: true },
        { symbol: 'BTC', asset_type: 'crypto', options_enabled: false }
      ]
    }
  };

  const testRes = {
    status: (code) => {
      console.log(`Response status: ${code}`);
      return testRes;
    },
    json: (data) => {
      console.log('Response data:', JSON.stringify(data, null, 2));
    }
  };

  console.log('\n=== Testing Polygon Options Data Fetcher ===');
  polygonOptionsDataFetcher(testReq, testRes);

  console.log('\n=== Testing Polygon Health Check ===');
  polygonHealthCheck({}, testRes);
} 