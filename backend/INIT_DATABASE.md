# Database Initialization Guide

## Overview

This guide explains how to initialize the market data tables with real data from Yahoo Finance.

## Problem

The frontend dashboard shows "Failed to load" for:
- Market indices (S&P 500, NASDAQ, Dow Jones, VIX)
- Sector performance heatmap
- Top movers (gainers, losers, most active)

This happens because the database tables are empty and need to be populated.

## Solution

Run the database initialization script to seed initial market data.

## Prerequisites

1. Backend server dependencies installed
2. Database running (PostgreSQL)
3. Database migrations applied
4. Internet connection (to fetch data from Yahoo Finance)

## Running the Initialization Script

### Method 1: Using Python Module (Recommended)

```bash
cd /home/tempa/Desktop/new/new\ stockgame/backend

# Make sure you're in the virtual environment
source venv/bin/activate  # or however you activate your venv

# Run the initialization script
python -m app.tasks.init_data
```

### Method 2: Direct Execution

```bash
cd /home/tempa/Desktop/new/new\ stockgame/backend
python app/tasks/init_data.py
```

## What Gets Seeded

### 1. Market Indices (4 indices)
- ^GSPC: S&P 500
- ^IXIC: NASDAQ Composite
- ^DJI: Dow Jones Industrial
- ^VIX: CBOE Volatility Index

### 2. Sector Performance (11 sectors via ETFs)
- Technology (XLK)
- Financial (XLF)
- Healthcare (XLV)
- Energy (XLE)
- Industrials (XLI)
- Consumer Defensive (XLP)
- Consumer Cyclical (XLY)
- Real Estate (XLRE)
- Utilities (XLU)
- Communication Services (XLC)
- Basic Materials (XLB)

### 3. Popular Stocks (20 stocks)
- AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA
- BRK-B, V, JNJ, WMT, JPM, PG, MA, UNH
- HD, DIS, BAC, NFLX, ADBE

## Expected Output

```
[2025-12-11 20:00:00] Starting database initialization...
============================================================

Seeding 4 market indices...
  Fetching ^GSPC (S&P 500)...
    ^GSPC: $4567.89
  Fetching ^IXIC (NASDAQ Composite)...
    ^IXIC: $14321.56
  ...
Seeded 4 market indices

Seeding 11 sectors...
  Fetching Technology via XLK...
    Technology: 1.23%
  ...
Seeded 11 sectors

Seeding 20 popular stocks...
  Fetching AAPL...
    AAPL (Apple Inc.): $192.53
  ...
Seeded 20 popular stocks

============================================================
[2025-12-11 20:00:15] Database initialization complete!

You can now start the backend server and the dashboard should show data.
```

## Automatic Updates

After initial seeding, the market data will be automatically updated by the CronJob running `market_refresh.py`.

To manually trigger a refresh:

```bash
python -m app.tasks.market_refresh
```

## Fallback Behavior

Even if the database is empty, the API endpoints now have fallback logic:

- `/api/market/indices` - Falls back to live Yahoo Finance data
- `/api/market/sectors` - Falls back to live Yahoo Finance data
- `/api/market/movers` - Returns empty arrays (needs database)
- `/api/market/quote/{symbol}` - Always falls back to Yahoo Finance

This means the dashboard should show data even before running the initialization script, but it will be slower since it fetches live data on every request.

## Troubleshooting

### Error: "No module named app"
Make sure you're running the command from the backend directory:
```bash
cd /home/tempa/Desktop/new/new\ stockgame/backend
```

### Error: Database connection failed
Check that PostgreSQL is running and the DATABASE_URL is correct in your `.env` file.

### Error: Yahoo Finance timeout
Some symbols may fail to fetch due to rate limiting or network issues. The script will continue and skip failed symbols.

### Slow initialization
The script fetches 35+ symbols sequentially from Yahoo Finance. This is expected and should take 30-60 seconds.

## Verification

After running the initialization:

1. Check the database tables have data:
   ```sql
   SELECT COUNT(*) FROM market_indices;   -- Should be 4
   SELECT COUNT(*) FROM sector_performance;  -- Should be 11
   SELECT COUNT(*) FROM market_prices;    -- Should be at least 20
   ```

2. Test the API endpoints:
   ```bash
   curl http://localhost:8000/api/market/indices
   curl http://localhost:8000/api/market/sectors
   curl http://localhost:8000/api/market/movers
   ```

3. Refresh the frontend dashboard - data should load without errors.

## Full S&P 500 Technical Dataset (2y daily + 7d hourly)

To satisfy the technical-analysis dashboard, seed the complete S&P 500 dataset:

### Local backfill
```bash
python -m app.tasks.sp500_daily_fetch --full   # 2 years of daily OHLC + indicators
python -m app.tasks.sp500_hourly_fetch --full  # 7 days of hourly data
```

### Kubernetes backfill (recommended for Minikube)
```bash
kubectl apply -f k8s/jobs/sp500-initial-load-job.yaml
# The job runs both full fetches and exits after completion
```

### Verify coverage
```bash
python scripts/verify_sp500_data.py
# Expect ~503 symbols with ~500 daily rows and ~168 hourly rows each
```
