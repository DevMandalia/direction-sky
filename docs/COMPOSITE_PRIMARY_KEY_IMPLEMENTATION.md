# Composite Primary Key Implementation for Polygon Options Table

## Overview

This document describes the implementation of a composite primary key `(contract_id, timestamp)` for the `polygon_options` table, along with upsert functionality to handle data updates properly.

## What Was Implemented

### 1. Composite Primary Key Structure
- **Primary Key**: `(contract_id, timestamp)`
- **Purpose**: Ensures data uniqueness for each options contract at each specific timestamp
- **Benefits**: Prevents duplicate records and enables efficient querying

### 2. Performance Optimizations
- **Clustering**: On `['contract_id', 'timestamp']` for optimal query performance
- **Time Partitioning**: Daily partitioning on `timestamp` field for efficient time-based queries
- **Storage Optimization**: BigQuery automatically optimizes storage and query execution

### 3. Upsert Functionality
- **Replaced**: Simple `INSERT` operations with `MERGE` statements
- **Behavior**: 
  - If `(contract_id, timestamp)` exists → UPDATE the record
  - If `(contract_id, timestamp)` doesn't exist → INSERT new record
- **Benefits**: Handles data updates without creating duplicates

## Database Schema Changes

### Table Configuration
```sql
-- Table Configuration:
-- - Time Partitioning: By DAY on timestamp field
-- - Clustering: On (contract_id, timestamp) for optimal query performance
-- - Composite Primary Key: (contract_id, timestamp) ensures data uniqueness
```

### Key Fields
```typescript
// Primary Keys and Identifiers
{ name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
{ name: 'contract_id', type: 'STRING', mode: 'REQUIRED' },
{ name: 'underlying_asset', type: 'STRING', mode: 'REQUIRED' },
{ name: 'contract_type', type: 'STRING', mode: 'REQUIRED' }
```

## Code Changes Made

### 1. Updated Database Service
- **File**: `src/services/polygonDatabaseService.ts`
- **Changes**:
  - Added clustering and time partitioning configuration
  - Replaced `table.insert()` with upsert methods
  - Implemented `upsertOptionsRow()` and `upsertOptionsBatch()` methods

### 2. Upsert Implementation
- **Single Row Upsert**: Uses `MERGE` statement with `ON` clause
- **Batch Upsert**: Handles multiple rows efficiently
- **Error Handling**: Graceful fallback if upsert fails

### 3. Validation Methods
- **Composite Key Validation**: Checks for existing `(contract_id, timestamp)` combinations
- **Data Integrity**: Prevents duplicate data insertion

## Testing the Implementation

### Prerequisites
1. **Environment Variables**:
   ```bash
   export GOOGLE_CLOUD_PROJECT="your-project-id"
   export BIGQUERY_DATASET="your-dataset-id"
   export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account-key.json"
   ```

2. **BigQuery Permissions**: Service account needs read/write access to the dataset

### Test Scripts

#### 1. Test Composite Primary Key
```bash
npm run test:composite-key
```
**What it tests**:
- Composite primary key constraint enforcement
- Duplicate prevention
- Clustering and partitioning functionality
- Data integrity

#### 2. Test Upsert Functionality
```bash
npm run test:upsert
```
**What it tests**:
- MERGE operations (INSERT/UPDATE)
- Data updates via upsert
- No duplicate record creation
- Composite primary key maintenance

### Manual Testing

#### 1. Test Data Insertion
```sql
-- Insert test data
INSERT INTO `your-project.your-dataset.polygon_options` (
  timestamp, contract_id, underlying_asset, contract_type, strike_price
) VALUES (
  CURRENT_TIMESTAMP(), 'TEST001', 'TEST', 'call', 100.0
);
```

#### 2. Test Duplicate Prevention
```sql
-- Try to insert duplicate (should fail)
INSERT INTO `your-project.your-dataset.polygon_options` (
  timestamp, contract_id, underlying_asset, contract_type, strike_price
) VALUES (
  CURRENT_TIMESTAMP(), 'TEST001', 'TEST', 'call', 100.0
);
-- Expected: Error due to composite primary key constraint
```

#### 3. Test Upsert via MERGE
```sql
-- Upsert operation (update if exists, insert if not)
MERGE `your-project.your-dataset.polygon_options` AS target
USING (
  SELECT 
    CURRENT_TIMESTAMP() as timestamp,
    'TEST001' as contract_id,
    'TEST' as underlying_asset,
    'call' as contract_type,
    100.0 as strike_price,
    2.50 as bid,
    2.60 as ask
) AS source
ON target.contract_id = source.contract_id AND target.timestamp = source.timestamp
WHEN MATCHED THEN
  UPDATE SET bid = source.bid, ask = source.ask
WHEN NOT MATCHED THEN
  INSERT (timestamp, contract_id, underlying_asset, contract_type, strike_price, bid, ask)
  VALUES (source.timestamp, source.contract_id, source.underlying_asset, source.contract_type, source.strike_price, source.bid, source.ask)
```

## Performance Benefits

### 1. Query Performance
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

### 2. Storage Optimization
- **Automatic Partitioning**: Data is automatically partitioned by day
- **Clustering**: Related data is stored together for faster access
- **Compression**: BigQuery automatically compresses data

### 3. Scalability
- **Large Datasets**: Efficiently handles millions of options contracts
- **Time Series**: Optimized for time-based data analysis
- **Real-time Updates**: Supports frequent data updates via upserts

## Monitoring and Maintenance

### 1. Check Table Statistics
```sql
-- View table metadata
SELECT 
  table_id,
  creation_time,
  last_modified_time,
  row_count,
  size_bytes
FROM `your-project.your-dataset.__TABLES__`
WHERE table_id = 'polygon_options';
```

### 2. Monitor Clustering Effectiveness
```sql
-- Check clustering statistics
SELECT 
  clustering_fields,
  total_clusters,
  total_logical_bytes
FROM `your-project.your-dataset.INFORMATION_SCHEMA.TABLES`
WHERE table_name = 'polygon_options';
```

### 3. Performance Monitoring
```sql
-- Check query performance
SELECT 
  job_id,
  creation_time,
  total_bytes_processed,
  total_slot_ms
FROM `region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE table_name = 'polygon_options'
ORDER BY creation_time DESC
LIMIT 10;
```

## Troubleshooting

### Common Issues

#### 1. Composite Key Constraint Violations
**Error**: `Duplicate entry for key 'PRIMARY'`
**Solution**: Use upsert operations instead of simple inserts

#### 2. Clustering Not Working
**Issue**: Queries on clustered fields are slow
**Solution**: Ensure clustering is properly configured and data is being inserted

#### 3. Time Partitioning Issues
**Issue**: Queries across date ranges are slow
**Solution**: Verify partitioning is working and data has proper timestamps

### Debug Queries
```sql
-- Check for duplicate composite keys
SELECT 
  contract_id,
  timestamp,
  COUNT(*) as duplicate_count
FROM `your-project.your-dataset.polygon_options`
GROUP BY contract_id, timestamp
HAVING COUNT(*) > 1
LIMIT 10;

-- Verify clustering
SELECT 
  contract_id,
  COUNT(*) as records_per_contract
FROM `your-project.your-dataset.polygon_options`
GROUP BY contract_id
ORDER BY records_per_contract DESC
LIMIT 10;
```

## Next Steps

### 1. Production Deployment
- [ ] Deploy updated Cloud Functions
- [ ] Test with real Polygon.io data
- [ ] Monitor performance metrics

### 2. Additional Optimizations
- [ ] Add indexes on frequently queried fields
- [ ] Implement data retention policies
- [ ] Set up automated monitoring

### 3. Feature Enhancements
- [ ] Add data quality scoring
- [ ] Implement automated data validation
- [ ] Create performance dashboards

## Conclusion

The composite primary key implementation provides:
- **Data Integrity**: Prevents duplicate records
- **Performance**: Optimized query execution
- **Scalability**: Handles large datasets efficiently
- **Maintainability**: Clean, organized data structure

The upsert functionality ensures that data updates are handled gracefully without violating the composite primary key constraint. 