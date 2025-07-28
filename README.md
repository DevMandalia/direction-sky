# Direction Sky - Crypto Intelligence Platform

A modern, serverless-first crypto intelligence platform providing real-time market analysis, confluence alerts, and trading insights.

## 🏗️ Architecture Overview

Direction Sky follows a **serverless-first** architecture with the following components:

### 1. Data Ingestion Layer (The Collectors)
- **Technology**: Scheduled Serverless Functions (AWS Lambda + EventBridge)
- **Purpose**: Fetches data from Glassnode, CoinGlass, FRED, and Binance APIs every 5 minutes
- **Benefits**: Cost-effective, reliable, no server management

### 2. Data Processing & Storage Layer (The Brain)
- **Cache**: Managed Redis (Amazon ElastiCache/Upstash) for real-time data
- **Historical Database**: Time-series database (Amazon Timestream/InfluxDB) for 60-day charts
- **Benefits**: Optimized for financial data patterns, fast access

### 3. Application & API Layer (The Engine)
- **Technology**: API Gateway + Serverless Functions (Python/Node.js)
- **Endpoints**:
  - `GET /api/dashboard-data`: Serves real-time data to frontend
  - `POST /api/webhooks/tradingview`: Receives TradingView alerts
  - `process-confluence-alerts`: Internal alert processing
- **Benefits**: Decoupled, scalable, organized logic

### 4. Frontend Layer (The Cockpit)
- **Technology**: Next.js + Tailwind CSS + Vercel
- **Features**: Real-time dashboard, responsive design, modern UI
- **Benefits**: Global CDN, automated deployments, excellent DX

### 5. External Services
- **Email**: Amazon SES/SendGrid for alert notifications
- **Benefits**: Managed delivery, high reliability

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd direction-sky
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
direction-sky/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Dashboard page
│   │   └── globals.css        # Global styles
│   ├── components/            # Reusable components
│   ├── lib/                   # Utility functions
│   └── types/                 # TypeScript definitions
├── public/                    # Static assets
├── next.config.js            # Next.js configuration
├── tailwind.config.js        # Tailwind CSS configuration
└── package.json              # Dependencies and scripts
```

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Next.js recommended rules
- **Prettier**: Automatic code formatting
- **Tailwind CSS**: Utility-first styling

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect your repository** to Vercel
2. **Set environment variables** in Vercel dashboard
3. **Deploy automatically** on every push to main branch

### Manual Deployment

```bash
npm run build
npm run start
```

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# API Keys
GLASSNODE_API_KEY=your_glassnode_key
COINGLASS_API_KEY=your_coinglass_key
BINANCE_API_KEY=your_binance_key

# Database
REDIS_URL=your_redis_url
TIMESTREAM_DATABASE=your_timestream_db

# Email Service
SES_ACCESS_KEY=your_ses_key
SES_SECRET_KEY=your_ses_secret

# Next.js
NEXT_PUBLIC_API_URL=your_api_url
```

## 📊 Features

### Current Features
- ✅ Real-time market data display
- ✅ Responsive dashboard design
- ✅ Alert system UI
- ✅ Modern, dark theme
- ✅ TypeScript support

### Planned Features
- 🔄 Live price charts with TradingView integration
- 🔄 Confluence alert processing
- 🔄 Email notification system
- 🔄 Historical data analysis
- 🔄 Custom alert rules
- 🔄 Portfolio tracking
- 🔄 API rate limiting and caching

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
