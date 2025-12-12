# Market Data API Fixes - Quick Start Guide

## Problem Solved

Fixed the "Failed to load" errors on the frontend dashboard for:
- Market indices (S&P 500, NASDAQ, Dow Jones, VIX)
- Sector performance heatmap
- Top movers (gainers, losers, most active)

## What Was Fixed

1. **Implemented sector data refresh** using sector ETFs (XLK, XLF, XLV, etc.)
2. **Created database initialization script** to seed initial data
3. **Added API fallback logic** to fetch live data when database is empty
4. **Improved Yahoo Finance integration** with better error handling and retry logic

## Quick Start

### Option 1: Using the Seed Script (Recommended)

```bash
cd /home/tempa/Desktop/new/new\ stockgame/backend
./scripts/seed_market_data.sh
```

### Option 2: Manual Initialization

```bash
cd /home/tempa/Desktop/new/new\ stockgame/backend
python -m app.tasks.init_data
```

### Option 3: Manual Refresh (for periodic updates)

```bash
cd /home/tempa/Desktop/new/new\ stockgame/backend
python -m app.tasks.market_refresh
```

## Files Changed/Created

### Modified Files
- `/home/tempa/Desktop/new/new stockgame/backend/app/tasks/market_refresh.py` - Implemented sector data refresh
- `/home/tempa/Desktop/new/new stockgame/backend/app/api/routes/market.py` - Added fallback logic
- `/home/tempa/Desktop/new/new stockgame/backend/app/integrations/market_data.py` - Improved Yahoo Finance integration

### New Files
- `/home/tempa/Desktop/new/new stockgame/backend/app/tasks/init_data.py` - Database initialization script
- `/home/tempa/Desktop/new/new stockgame/backend/.env` - Environment configuration
- `/home/tempa/Desktop/new/new stockgame/backend/.env.example` - Environment template
- `/home/tempa/Desktop/new/new stockgame/backend/scripts/seed_market_data.sh` - Convenience script
- `/home/tempa/Desktop/new/new stockgame/backend/INIT_DATABASE.md` - Detailed setup guide
- `/home/tempa/Desktop/new/new stockgame/backend/FIXES_SUMMARY.md` - Complete technical documentation

## How It Works

### Data Seeding (init_data.py)
```
Fetches from Yahoo Finance → Stores in PostgreSQL tables
- 4 market indices
- 11 sectors (via ETF prices)
- 20 popular stocks
```

### Periodic Refresh (market_refresh.py)
```
CronJob runs hourly → Fetches updates → UPSERT to database
- Updates all tracked stock prices
- Updates market indices
- Updates sector performance
```

### API Fallback Logic
```
Frontend requests data
  ↓
API checks database
  ↓
If empty → Fetch from Yahoo Finance (live)
If populated → Return cached data (fast)
```

## Testing

### 1. Test the API endpoints

```bash
# After seeding, these should return data:
curl http://localhost:8000/api/market/indices
curl http://localhost:8000/api/market/sectors
curl http://localhost:8000/api/market/movers
```

### 2. Test a specific stock

```bash
curl http://localhost:8000/api/market/quote/AAPL
```

### 3. Check database

```sql
SELECT COUNT(*) FROM market_indices;      -- Should be 4
SELECT COUNT(*) FROM sector_performance;  -- Should be 11
SELECT COUNT(*) FROM market_prices;       -- Should be 20+
```

## Troubleshooting

### "No data available" errors

**Cause:** Yahoo Finance API is temporarily unavailable or rate limiting

**Solution:**
1. Wait 5-10 minutes and try again
2. Update yfinance: `pip install --upgrade yfinance`
3. The API has fallback logic - it will fetch live data even if seeding fails

### "Failed to load" still showing

**Causes:**
- Backend server not running
- Database not connected
- Frontend pointing to wrong API URL

**Solution:**
1. Check backend server is running: `ps aux | grep uvicorn`
2. Check database is running: `pg_isready`
3. Check .env has correct DATABASE__POSTGRES_HOST

### Slow API responses

**Cause:** Database is empty, falling back to live Yahoo Finance API

**Solution:**
Run the initialization script to populate the database cache:
```bash
python -m app.tasks.init_data
```

## Technical Details

### Sector ETF Mapping

| Sector | ETF Symbol |
|--------|-----------|
| Technology | XLK |
| Financial | XLF |
| Healthcare | XLV |
| Energy | XLE |
| Industrials | XLI |
| Consumer Defensive | XLP |
| Consumer Cyclical | XLY |
| Real Estate | XLRE |
| Utilities | XLU |
| Communication Services | XLC |
| Basic Materials | XLB |

### Database Schema

```sql
-- Market indices (S&P 500, NASDAQ, etc.)
CREATE TABLE market_indices (
    symbol VARCHAR(12) UNIQUE,
    name VARCHAR(100),
    value NUMERIC(18,4),
    change NUMERIC(18,4),
    change_pct NUMERIC(10,4),
    updated_at TIMESTAMP
);

-- Sector performance
CREATE TABLE sector_performance (
    sector VARCHAR(50) UNIQUE,
    change_pct NUMERIC(10,4),
    market_cap BIGINT,
    updated_at TIMESTAMP
);

-- Cached stock prices
CREATE TABLE market_prices (
    symbol VARCHAR(12) UNIQUE,
    price NUMERIC(18,4),
    change NUMERIC(18,4),
    change_pct NUMERIC(10,4),
    volume BIGINT,
    name VARCHAR(200),
    sector VARCHAR(50),
    updated_at TIMESTAMP
);
```

### API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/market/quote/{symbol}` | GET | No | Get quote for specific symbol |
| `/api/market/indices` | GET | No | Get market indices |
| `/api/market/sectors` | GET | No | Get sector heatmap data |
| `/api/market/movers` | GET | No | Get top gainers/losers/active |
| `/api/market/search?q={query}` | GET | No | Search for symbols |

## Production Deployment

### 1. Set up environment

```bash
cp .env.example .env
# Edit .env and set:
# - SECURITY__JWT_SECRET_KEY (generate with: python -c "import secrets; print(secrets.token_urlsafe(32))")
# - DATABASE__POSTGRES_HOST
# - DATABASE__POSTGRES_USER
# - DATABASE__POSTGRES_PASSWORD
```

### 2. Run database migrations

```bash
alembic upgrade head
```

### 3. Seed initial data

```bash
python -m app.tasks.init_data
```

### 4. Set up CronJob

Add to Kubernetes CronJob or system crontab:
```yaml
# Kubernetes CronJob
apiVersion: batch/v1
kind: CronJob
metadata:
  name: market-data-refresh
spec:
  schedule: "0 * * * *"  # Every hour
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: refresh
            image: your-backend-image
            command: ["python", "-m", "app.tasks.market_refresh"]
          restartPolicy: OnFailure
```

Or system crontab:
```bash
# Runs every hour
0 * * * * cd /path/to/backend && python -m app.tasks.market_refresh >> /var/log/market_refresh.log 2>&1
```

### 5. Set up monitoring

Monitor these metrics:
- Data freshness (updated_at timestamps)
- API response times
- Yahoo Finance API errors
- Database size

## Need Help?

### Documentation
- See `FIXES_SUMMARY.md` for complete technical documentation
- See `INIT_DATABASE.md` for detailed initialization guide

### Common Commands

```bash
# Seed initial data
python -m app.tasks.init_data

# Manual refresh
python -m app.tasks.market_refresh

# Test market data provider
python test_market_data.py

# Check database
psql -U stock_game -d stock_game -c "SELECT COUNT(*) FROM market_indices;"

# View logs
tail -f /path/to/logs/backend.log
```

### Known Limitations

1. **Yahoo Finance Reliability**: Free API can be unreliable, may return rate limiting errors
2. **Market Hours**: Real-time data only available during market hours
3. **Sector Data**: Based on ETF performance, not individual stock aggregation
4. **No WebSocket**: Dashboard needs manual refresh to see new data

### Future Improvements

- [ ] Add Redis caching layer
- [ ] Implement WebSocket for real-time updates
- [ ] Add alternative data sources (Alpha Vantage, IEX Cloud)
- [ ] Implement data quality monitoring
- [ ] Add admin panel for manual data refresh
- [ ] Create data warehouse for historical analysis

## Summary

All fixes are implemented and ready to use. The main steps are:

1. **Run initialization**: `python -m app.tasks.init_data`
2. **Start backend**: Server should now serve market data
3. **Check dashboard**: Data should load without errors
4. **Set up CronJob**: For automatic updates (optional)

The system has fallback logic, so even if initialization fails, the API will try to fetch live data from Yahoo Finance.
