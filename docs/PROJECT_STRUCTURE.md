# Project Structure

This document outlines the organized structure of the Direction Sky project.

## Root Directory

The root directory contains only essential configuration and project files:

- **Configuration Files**: `tsconfig.json`, `package.json`, `tailwind.config.js`, `next.config.js`, `postcss.config.js`
- **Environment**: `.env.example`, `.nvmrc`
- **Git**: `.gitignore`, `.gcloudignore`
- **Source Code**: `src/` directory
- **Public Assets**: `public/` directory
- **Entry Point**: `index.js`

## Organized Directories

### 📁 `docs/`
All project documentation and README files:
- `README.md` - Main project overview
- `CRON_SETUP.md` - Cron job setup instructions
- `POLYGON_TESTING_README.md` - Polygon API testing guide
- `POLYGON_INTEGRATION_README.md` - Polygon integration documentation
- `X_SENTIMENT_README.md` - X (Twitter) sentiment analysis guide
- `COINMARKETCAP_INTEGRATION_README.md` - CoinMarketCap integration
- `DATA_INGESTION_README.md` - Data ingestion processes
- `X_API_SETUP_GUIDE.md` - X API setup instructions
- `X_DATA_STORAGE_GUIDE.md` - X data storage guide

### 📁 `tests/`
All testing files and scripts:
- `test-polygon.js` - Basic Polygon testing
- `test-polygon-direct.js` - Direct Polygon API testing
- `test-polygon-function.js` - Polygon function testing
- `test-polygon-complete.js` - Comprehensive Polygon testing
- `test-polygon-integration.js` - Polygon integration testing
- `test-polygon-fetcher.js` - Polygon data fetcher testing

### 📁 `scripts/`
Organized by functionality:

#### `scripts/deployment/`
- `setup-cron-mstr-fetcher.sh` - Cron setup for MSTR fetcher
- `deploy-mstr-fetcher-scheduler.sh` - MSTR fetcher scheduler deployment

#### `scripts/polygon/`
- `polygon-fetcher-mstr-only.js` - Polygon data fetcher for MSTR

#### `scripts/` (root)
- Various utility and data processing scripts
- Database initialization and testing scripts
- Data ingestion and API testing scripts

### 📁 `build/`
Build artifacts and compiled output:
- `tsconfig.tsbuildinfo` - TypeScript build info
- `dist/` - Distribution files

### 📁 `src/`
Main application source code:
- `app/` - Next.js app directory
- `components/` - React components
- `utils/` - Utility functions
- `types/` - TypeScript type definitions
- `services/` - Service layer
- `functions/` - Function implementations

## Benefits of This Structure

1. **Cleaner Root Directory**: Only essential files remain in the root
2. **Logical Grouping**: Related files are organized by purpose
3. **Easy Navigation**: Clear separation of concerns
4. **Maintainability**: Easier to find and manage specific types of files
5. **Scalability**: New files can be added to appropriate directories

## File Organization Rules

- **Documentation**: All `.md` files go in `docs/`
- **Tests**: All `test-*.js` files go in `tests/`
- **Scripts**: Organized by functionality in `scripts/` subdirectories
- **Build Artifacts**: All generated files go in `build/`
- **Configuration**: Essential config files stay in root
- **Source Code**: Application code stays in `src/` 