# BigQuery Integration Setup Guide

This guide will help you connect your Direction Sky Options UI to live data from the BigQuery `polygon-options` table.

## 🏗️ Architecture Overview

The UI connects to BigQuery through an API layer that can be implemented in several ways:

1. **Google Cloud Functions** (Recommended for serverless)
2. **Cloud Run** (Containerized service)
3. **Direct BigQuery connection** (For development/testing)

## 🚀 Option 1: Google Cloud Functions (Recommended)

### Step 1: Create Cloud Function

Create a new Cloud Function in your Google Cloud project:

```bash
# Create function directory
mkdir polygon-options-api
cd polygon-options-api

# Create main function file
touch main.py
touch requirements.txt
```

### Step 2: Install Dependencies

```txt
# requirements.txt
google-cloud-bigquery==3.11.4
functions-framework==3.4.0
flask==2.3.3
```

### Step 3: Implement the API

```python
# main.py
import functions_framework
from google.cloud import bigquery
import json
from flask import Request, jsonify

@functions_framework.http
def polygon_options_api(request: Request):
    """HTTP Cloud Function for Polygon Options data."""
    
    # Set CORS headers
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)
    
    headers = {
        'Access-Control-Allow-Origin': '*'
    }
    
    try:
        # Initialize BigQuery client
        client = bigquery.Client()
        
        # Get request data
        request_json = request.get_json()
        
        if request.path.endswith('/expiry-dates'):
            # Get available expiry dates
            query = """
            SELECT DISTINCT expiration_date
            FROM `your-project.your-dataset.polygon_options`
            WHERE expiration_date >= CURRENT_DATE()
            ORDER BY expiration_date ASC
            """
            
            query_job = client.query(query)
            results = query_job.result()
            
            dates = [row.expiration_date.strftime('%Y-%m-%d') for row in results]
            
            return jsonify({'dates': dates}), 200, headers
            
        elif request.path.endswith('/polygon-options'):
            # Get options data for specific expiry
            expiry_date = request_json.get('expiry_date')
            
            if not expiry_date:
                return jsonify({'error': 'expiry_date is required'}), 400, headers
            
            query = """
            SELECT 
                contract_id,
                underlying_asset,
                contract_type,
                strike_price,
                expiration_date,
                bid,
                ask,
                bid_size,
                ask_size,
                volume,
                open_interest,
                delta,
                gamma,
                theta,
                vega,
                implied_volatility,
                underlying_price,
                timestamp,
                high,
                low,
                last_price,
                change,
                change_percent,
                score
            FROM `your-project.your-dataset.polygon_options`
            WHERE expiration_date = @expiry_date
            ORDER BY strike_price ASC
            """
            
            job_config = bigquery.QueryJobConfig(
                query_parameters=[
                    bigquery.ScalarQueryParameter("expiry_date", "DATE", expiry_date),
                ]
            )
            
            query_job = client.query(query, job_config=job_config)
            results = query_job.result()
            
            # Convert to list of dictionaries
            rows = []
            for row in results:
                row_dict = {}
                for key, value in row.items():
                    if hasattr(value, 'isoformat'):  # Handle datetime objects
                        row_dict[key] = value.isoformat()
                    else:
                        row_dict[key] = value
                rows.append(row_dict)
            
            return jsonify({'rows': rows}), 200, headers
            
        else:
            return jsonify({'error': 'Endpoint not found'}), 404, headers
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500, headers
```

### Step 4: Deploy the Function

```bash
# Deploy to Google Cloud Functions
gcloud functions deploy polygon-options-api \
  --runtime python39 \
  --trigger-http \
  --allow-unauthenticated \
  --region us-central1 \
  --memory 512MB \
  --timeout 540s
```

## 🔧 Option 2: Local Development API

For development, you can create a local API server:

### Step 1: Create Local API Server

```bash
mkdir local-api
cd local-api
npm init -y
npm install express cors google-cloud-bigquery
```

### Step 2: Create Server

```javascript
// server.js
const express = require('express');
const cors = require('cors');
const {BigQuery} = require('@google-cloud/bigquery');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const bigquery = new BigQuery({
  projectId: 'your-project-id',
  keyFilename: 'path/to/your/service-account-key.json'
});

// Get expiry dates
app.get('/api/polygon-options/expiry-dates', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT expiration_date
      FROM \`your-project.your-dataset.polygon_options\`
      WHERE expiration_date >= CURRENT_DATE()
      ORDER BY expiration_date ASC
    `;
    
    const [rows] = await bigquery.query({query});
    const dates = rows.map(row => row.expiration_date.value);
    
    res.json({dates});
  } catch (error) {
    res.status(500).json({error: error.message});
  }
});

// Get options data
app.post('/api/polygon-options', async (req, res) => {
  try {
    const {expiry_date} = req.body;
    
    const query = `
      SELECT *
      FROM \`your-project.your-dataset.polygon_options\`
      WHERE expiration_date = @expiry_date
      ORDER BY strike_price ASC
    `;
    
    const options = {
      query,
      params: {expiry_date}
    };
    
    const [rows] = await bigquery.query(options);
    res.json({rows});
  } catch (error) {
    res.status(500).json({error: error.message});
  }
});

app.listen(port, () => {
  console.log(`Local API server running on port ${port}`);
});
```

## ⚙️ Configuration

### Step 1: Update Environment Variables

Create a `.env.local` file in your project root:

```bash
# BigQuery API Configuration
NEXT_PUBLIC_BIGQUERY_API_BASE=https://your-cloud-function-url.com
NEXT_PUBLIC_BIGQUERY_API_KEY=your-api-key-here

# For local development
# NEXT_PUBLIC_BIGQUERY_API_BASE=http://localhost:3001
# NEXT_PUBLIC_BIGQUERY_API_KEY=dev-key
```

### Step 2: Update BigQuery Configuration

Edit `src/config/bigquery.ts`:

```typescript
export const BIGQUERY_CONFIG = {
  API_BASE: process.env.NEXT_PUBLIC_BIGQUERY_API_BASE || 'https://your-cloud-function-url.com',
  API_KEY: process.env.NEXT_PUBLIC_BIGQUERY_API_KEY || 'your-api-key-here',
  
  PROJECT_ID: 'your-actual-project-id',
  DATASET_ID: 'your-actual-dataset-id',
  TABLE_ID: 'polygon_options',
  
  // ... rest of config
}
```

## 🔐 Authentication

### For Cloud Functions:
- Set `--allow-unauthenticated` during deployment for public access
- Or implement API key validation in your function

### For Direct BigQuery:
- Use service account key file
- Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable

## 📊 Data Schema

Ensure your BigQuery table has these columns:

```sql
CREATE TABLE `your-project.your-dataset.polygon_options` (
  -- Composite Primary Key: (contract_id, timestamp)
  contract_id STRING NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  underlying_asset STRING NOT NULL,
  contract_type STRING NOT NULL,
  strike_price FLOAT64,
  expiration_date DATE,
  bid FLOAT64,
  ask FLOAT64,
  bid_size INT64,
  ask_size INT64,
  volume INT64,
  open_interest INT64,
  delta FLOAT64,
  gamma FLOAT64,
  theta FLOAT64,
  vega FLOAT64,
  implied_volatility FLOAT64,
  underlying_price FLOAT64,
  high FLOAT64,
  low FLOAT64,
  last_price FLOAT64,
  change FLOAT64,
  change_percent FLOAT64,
  score FLOAT64
);

-- Table Configuration:
-- - Time Partitioning: By DAY on timestamp field
-- - Clustering: On (contract_id, timestamp) for optimal query performance
-- - Composite Primary Key: (contract_id, timestamp) ensures data uniqueness
```

## 🚀 Testing

### Step 1: Test API Endpoints

```bash
# Test expiry dates endpoint
curl -X GET "https://your-api-url.com/api/polygon-options/expiry-dates"

# Test options data endpoint
curl -X POST "https://your-api-url.com/api/polygon-options" \
  -H "Content-Type: application/json" \
  -d '{"expiry_date": "2024-01-19"}'
```

### Step 2: Test UI Integration

1. Start your Next.js app: `npm run dev`
2. Navigate to the options page
3. Check browser console for API calls
4. Verify data is loading from BigQuery

## 🔄 Real-time Updates

The UI automatically refreshes data every 30 seconds. For true real-time updates:

1. **Use BigQuery Change Data Capture (CDC)**
2. **Implement WebSocket connections**
3. **Use Google Cloud Pub/Sub for real-time notifications**

## 🐛 Troubleshooting

### Common Issues:

1. **CORS errors**: Ensure your API includes proper CORS headers
2. **Authentication errors**: Check API keys and service account permissions
3. **Data not loading**: Verify BigQuery table schema and data
4. **Slow queries**: Add indexes on frequently queried columns

### Debug Steps:

1. Check browser Network tab for API calls
2. Verify BigQuery table has data
3. Test API endpoints directly
4. Check Cloud Function logs (if using Cloud Functions)

## 📈 Performance Optimization

1. **Add indexes** on `expiration_date` and `strike_price`
2. **Partition tables** by date if dealing with large datasets
3. **Use clustering** on frequently queried columns
4. **Implement caching** for expiry dates and underlying prices

### Composite Primary Key Benefits

The `polygon_options` table uses a composite primary key `(contract_id, timestamp)` with clustering for optimal performance:

- **Data Uniqueness**: Prevents duplicate records for the same contract at the same time
- **Query Performance**: Clustering on `(contract_id, timestamp)` enables fast lookups
- **Time Partitioning**: Daily partitioning on timestamp field for efficient time-based queries
- **Storage Optimization**: BigQuery automatically optimizes storage and query execution

### Recommended Query Patterns

```sql
-- Fast queries using clustered fields:
SELECT * FROM polygon_options 
WHERE contract_id = 'MSTR240119C00100000' 
AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY);

-- Efficient time-range queries:
SELECT * FROM polygon_options 
WHERE timestamp >= '2024-01-01' 
AND timestamp < '2024-01-02';
```

## 🔗 Next Steps

Once connected to live data:

1. **Add real-time price updates** using WebSockets
2. **Implement data caching** for better performance
3. **Add more filtering options** (strike range, volume thresholds)
4. **Create alerts** for specific option conditions
5. **Add historical data charts** for trend analysis

Your options chain UI is now ready to display live data from BigQuery! 🎉 