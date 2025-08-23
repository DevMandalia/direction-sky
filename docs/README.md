# Direction Sky - Economic Data Intelligence Platform

A modern, serverless-first economic intelligence platform providing real-time FRED data analysis, historical trend analysis, and economic insights using Google Cloud infrastructure.

## 🏗️ Architecture Overview

Direction Sky follows a **serverless-first** architecture with the following components:

### 1. Data Ingestion Layer (The Collectors)
- **Technology**: Google Cloud Functions + Cloud Scheduler
- **Purpose**: Fetches economic data from FRED API (29+ metrics) and social sentiment from X (Twitter) with real-time database storage
- **Benefits**: Cost-effective, reliable, no server management, automatic scaling

### 2. Data Processing & Storage Layer (The Brain)
- **Cache**: Google Cloud Memorystore for Redis (real-time data)
- **Historical Database**: Google BigQuery (time-series data for trend analysis)
- **Benefits**: Optimized for economic data patterns, fast access, powerful analytics

### 3. Application & API Layer (The Engine)
- **Technology**: Google Cloud Functions + API Gateway
- **Endpoints**:
  - `GET /api/fred-data`: Serves real-time FRED data to frontend
  - `POST /api/refresh-fred`: Manual FRED data refresh trigger
  - `GET /api/historical-data`: Historical trend analysis
- **Benefits**: Decoupled, scalable, organized logic

### 4. Frontend Layer (The Cockpit)
- **Technology**: Next.js + Tailwind CSS + Vercel
- **Features**: Real-time economic dashboard, responsive design, modern UI
- **Benefits**: Global CDN, automated deployments, excellent DX

### 5. External Services
- **FRED API**: Federal Reserve Economic Data (29+ economic indicators)
- **X (Twitter) API**: Social sentiment analysis for Bitcoin and crypto markets
- **Google Cloud**: BigQuery, Cloud Functions, Cloud Scheduler
- **Benefits**: Reliable data sources, managed infrastructure, comprehensive market intelligence

## 📁 Project Structure

The project is organized into logical directories for better maintainability:

- **`docs/`** - All project documentation and README files
- **`src/`** - Main application source code (Next.js app, components, utilities)
- **`tests/`** - All testing files and scripts
- **`scripts/`** - Utility scripts organized by functionality:
  - `deployment/` - Deployment and cron setup scripts
  - `polygon/` - Polygon API related scripts
  - Root scripts - Data processing and utility scripts
- **`build/`** - Build artifacts and compiled output
- **`public/`** - Static assets and public files

For detailed structure information, see [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md).

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git
- Google Cloud Platform account
- FRED API key
- X (Twitter) API credentials (optional for social sentiment analysis)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/direction-sky.git
   cd direction-sky
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   # Edit .env.local with your API keys and Google Cloud configuration
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Environment Setup

### 1. Google Cloud Platform Setup

#### Create a New Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable required APIs:
   ```bash
   gcloud services enable bigquery.googleapis.com
   gcloud services enable cloudfunctions.googleapis.com
   gcloud services enable cloudscheduler.googleapis.com
   gcloud services enable redis.googleapis.com
   ```

#### Create Service Account
1. Go to **IAM & Admin** > **Service Accounts**
2. Click **Create Service Account**
3. Name: `direction-sky-sa`
4. Grant these roles:
   - BigQuery Data Editor
   - BigQuery User
   - Cloud Functions Developer
   - Cloud Scheduler Admin

#### Download Service Account Key
1. Click on the service account
2. Go to **Keys** tab
3. Click **Add Key** > **Create New Key**
4. Choose **JSON** format
5. Download and save as `key.json` in project root

### 2. FRED API Setup

1. Go to [FRED API](https://fred.stlouisfed.org/docs/api/api_key.html)
2. Request an API key
3. Copy the API key for environment configuration

### 3. Environment Configuration

Create `.env.local` file with the following variables:

```env
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_APPLICATION_CREDENTIALS=./key.json

# BigQuery Configuration
BIGQUERY_DATASET=direction_sky_data
BIGQUERY_TABLE=fred_metrics

# FRED API Configuration
FRED_API_KEY=your_fred_api_key_here

# Processing Layer (Optional)
PROCESSING_LAYER_URL=https://your-processing-layer-url.com/api/ingest

# Development
NODE_ENV=development
```

### 4. Database Initialization

Run the database setup script:

```bash
# Test database connection
npm run test:database

# Initialize BigQuery table
npm run init:database
```

## 📊 Features

### Current Features
- ✅ Real-time FRED economic data (29+ metrics)
- ✅ X (Twitter) social sentiment analysis
- ✅ Bitcoin keyword tracking and analysis
- ✅ Influential account monitoring
- ✅ Engagement metrics and sentiment scoring
- ✅ Responsive dashboard design
- ✅ Modern, dark theme
- ✅ TypeScript support
- ✅ BigQuery data storage and analytics
- ✅ Redis caching for performance

### Data Sources
- **FRED API**: Federal Reserve Economic Data
  - Interest rates, employment, GDP, inflation, money supply
  - Housing, consumer spending, manufacturing, trade
  - Financial markets, currency exchange rates
- **X (Twitter) API**: Social Sentiment Intelligence
  - Bitcoin-related keyword tracking
  - Influential account sentiment analysis
  - Engagement metrics (likes, retweets, replies)
  - Real-time sentiment scoring and classification

### Planned Features
- 🔄 Live price charts with TradingView integration
- 🔄 Advanced sentiment analysis with ML models
- 🔄 Real-time streaming capabilities
- 🔄 Email notification system
- 🔄 Historical sentiment trend analysis
- 🔄 Custom alert rules and thresholds
- 🔄 Portfolio tracking and optimization
- 🔄 API rate limiting and caching
- 🔄 Geographic sentiment analysis
- 🔄 Predictive sentiment modeling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@directionsky.com or create an issue in this repository.

---

**Built with ❤️ for the crypto community**
