# X (Twitter) API Setup Guide

## 🔑 How to Get Your X API Credentials

### Step 1: Access the X Developer Portal

1. **Go to**: https://developer.twitter.com/
2. **Sign in** with your X account
3. **Apply for a developer account** if you haven't already
4. **Wait for approval** (usually takes 24-48 hours)

### Step 2: Create a New App

1. **Navigate to "Projects & Apps"** in the developer portal
2. **Click "Create Project"**
3. **Give your project a name** (e.g., "Direction Sky Sentiment Analysis")
4. **Select your use case** (choose "Making a bot" or "Academic research")
5. **Describe your project** (e.g., "Social sentiment analysis for cryptocurrency markets")

### Step 3: Create an App Within Your Project

1. **Click "Create App"** within your project
2. **Give your app a name** (e.g., "DirectionSkySentiment")
3. **Complete the app creation process**

### Step 4: Get Your API Credentials

1. **Go to your app's "Keys and Tokens" tab**
2. **Copy these credentials**:
   - **API Key** (also called Consumer Key)
   - **API Secret** (also called Consumer Secret)
   - **Bearer Token** (for API v2 access)

### Step 5: Set Up API Access

1. **Go to "User authentication settings"**
2. **Enable OAuth 2.0**
3. **Set App permissions** to "Read" (for reading tweets)
4. **Save your changes**

## 📝 Adding Credentials to Your Project

### Step 1: Edit Your .env File

Open your `.env` file and add these lines:

```bash
# X (Twitter) API Configuration
X_API_KEY=your_actual_api_key_here
X_API_SECRET=your_actual_api_secret_here
X_BEARER_TOKEN=your_actual_bearer_token_here
```

### Step 2: Example .env Configuration

```bash
# API Keys for External Data Sources
GLASSNODE_API_KEY=your_glassnode_api_key_here
COINGLASS_API_KEY=your_coinglass_api_key_here
FRED_API_KEY=0dd67c687d6c7bb775a69973236546e8
BINANCE_API_KEY=your_binance_api_key_here
BINANCE_SECRET_KEY=your_binance_secret_key_here

# X (Twitter) API Configuration
X_API_KEY=1234567890abcdef1234567890abcdef
X_API_SECRET=abcdef1234567890abcdef1234567890abcdef1234567890abcdef
X_BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAAA...

# Processing Layer Configuration
PROCESSING_LAYER_URL=https://your-processing-layer-url.com/api/ingest

# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=dev-epsilon-467101-v2
GOOGLE_CLOUD_REGION=us-central1

# Deployment Configuration
STAGE=dev 
# BigQuery Configuration
BIGQUERY_DATASET=direction_sky_data
BIGQUERY_TABLE=fred_metrics
GOOGLE_APPLICATION_CREDENTIALS=/Users/adirao/Documents/direction sky/direction-sky/key.json
```

## 🧪 Testing Your Setup

### Step 1: Run the Test

```bash
npm run test:x-sentiment
```

### Step 2: Check the Output

You should see:
- ✅ **X API credentials configured** (instead of "using mock data")
- ✅ **Real API calls** being made
- ✅ **Actual tweet data** from Twitter

### Step 3: Verify Real API Usage

The test output will show:
```
Searching tweets for query: bitcoin OR btc OR hodl (REAL API)
Fetching tweets for user: SBF_FTX (REAL API)
```

## 🔧 Troubleshooting

### Common Issues

#### 1. "Invalid or expired token"
- **Solution**: Regenerate your Bearer Token in the developer portal
- **Check**: Make sure you copied the entire token

#### 2. "Rate limit exceeded"
- **Solution**: Wait 15 minutes and try again
- **Note**: Free tier has rate limits (300 requests per 15 minutes)

#### 3. "Unauthorized"
- **Solution**: Check that your API Key and Secret are correct
- **Verify**: Your app has "Read" permissions enabled

#### 4. "App not approved"
- **Solution**: Wait for developer account approval
- **Check**: Your app's status in the developer portal

### Rate Limits

- **Free Tier**: 300 requests per 15 minutes
- **Basic Tier**: 1,500 requests per 15 minutes
- **Pro Tier**: 15,000 requests per 15 minutes

## 🚀 Next Steps After Setup

1. **Test with real data**: Run the sentiment analysis with actual tweets
2. **Monitor rate limits**: Keep track of your API usage
3. **Deploy to production**: Deploy your functions to Google Cloud
4. **Set up monitoring**: Monitor sentiment trends and alerts
5. **Scale up**: Consider upgrading your API tier for higher limits

## 📊 What You'll Get

With real X API credentials, you'll have access to:

- **Real-time tweets** from influential crypto accounts
- **Actual engagement metrics** (likes, retweets, replies)
- **Live sentiment analysis** of Bitcoin-related content
- **Trending keywords** and hashtags
- **Historical tweet data** (within API limits)

## 🔒 Security Notes

- **Never commit** your `.env` file to version control
- **Keep your credentials** secure and private
- **Rotate tokens** regularly for security
- **Monitor usage** to detect any unauthorized access

---

**Need Help?** Check the [X Developer Documentation](https://developer.twitter.com/en/docs) or create an issue in this repository. 