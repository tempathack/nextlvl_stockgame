# Changelog

All notable changes to the Stock Trading Game project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added

#### Backend
- Trading fees: 0.1% fee on ALL order types (buy, sell, short, cover)
- `fee_amount` column on `trade_orders` table
- `total_fees_paid` column on `portfolios` table
- Admin API endpoints (superuser only):
  - `GET /api/admin/game-config` - Get active game configuration
  - `POST /api/admin/game-config` - Create new game configuration
  - `PUT /api/admin/game-config` - Update game configuration
  - `GET /api/admin/game-status` - Get game status with statistics
  - `POST /api/admin/reset-game` - Reset all portfolios (keep users)
- Comparison API endpoint: `GET /api/leaderboard/comparison`
  - Returns all participants with full position details
  - Full transparency mode
- Game date validation in TradingService
  - Blocks trades before `start_date`
  - Blocks trades after `end_date`
- SEC Insider Trades functionality:
  - `InsiderTrade` model with 35+ columns for Form 4 data
  - SEC EDGAR integration service (`sec_edgar.py`)
  - Daily fetch task with 30-day backfill support
  - Price impact analysis (1W, 1M, 3M returns vs S&P 500 benchmark)
  - API endpoints:
    - `GET /api/insider-trades` - List trades with filtering
    - `GET /api/insider-trades/symbol/{symbol}` - Trades by stock
    - `GET /api/insider-trades/summary` - Aggregate by stock
    - `GET /api/insider-trades/top-insiders` - Top traders
    - `GET /api/insider-trades/stats` - Overall statistics

#### Frontend
- Comparison page (`/comparison`) with three tabs:
  - Overview Table: All participants ranked by return %
  - Position Details: Expandable cards with full holdings
  - Performance Chart: ECharts bar chart comparing returns
- Trading fee display in TradeForm:
  - Shows subtotal, 0.1% fee, and total cost/proceeds
  - Different labels for buy vs sell orders
- Fee column in TradeHistoryTable
- Comparison link in navigation menu
- Insider Trades page (`/insider-trades`) with three tabs:
  - All Trades: Sortable table with filtering, price impact, alpha
  - By Stock: Aggregate buy/sell summary per symbol
  - Top Insiders: Top traders by volume
- Stats row showing total trades, sentiment, buy/sell totals
- Symbol autocomplete filtering
- SEC filing links

#### Database
- Alembic migration `0002_add_trading_fees.py`
- Alembic migration `0003_add_insider_trades.py`

#### Infrastructure
- Daily CronJob for insider trades fetch (2 AM)
- Initial load Job for 30-day backfill

### Changed
- TradingService now calculates and deducts 0.1% fee on all trades
- TradingService validates game dates before allowing trades
- TradeOrderRead schema includes `fee_amount` field

---

## [1.0.0] - 2025-12-12

### Added

#### Backend
- FastAPI backend with async SQLAlchemy
- PostgreSQL database with full schema
- JWT authentication (access + refresh tokens)
- User registration and login
- Portfolio management with $100k starting capital
- Trading system (buy, sell, short, cover)
- Position tracking with average pricing
- Market data integration (Yahoo Finance)
- Real-time activity feed
- Leaderboard with rankings
- Benchmark comparison API
- Market indices, sectors, and top movers APIs
- Symbol search functionality

#### Frontend
- React 18 with TypeScript
- Material-UI v5 components
- TanStack Query for data fetching
- ECharts for visualizations
- Dashboard with market overview
- Stock analysis with technical charts
- Leaderboard page
- Player comparison feature
- Activity feed page
- Portfolio management (protected)
- Trade execution form
- Trade history table
- Settings page

#### Infrastructure
- Docker and Docker Compose setup
- Dockerfile for backend (Python 3.11)
- Dockerfile for frontend (Node.js)
- Environment configuration

### Database Models
- User and Profile models
- Portfolio model ($100k default)
- Position model (long and short)
- TradeOrder model
- TradeActivity model (public feed)
- GameConfig model
- MarketPrice model
- SectorPerformance model
- MarketIndex model
- MetricSnapshot model

---

## How to Add Entries

When making changes, add entries under `[Unreleased]` in the appropriate category:

- **Added** - New features
- **Changed** - Changes in existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Now removed features
- **Fixed** - Bug fixes
- **Security** - Vulnerability fixes

Example:
```markdown
### Added
- Trading fees: 0.1% fee on all order types (#123)
- Admin API for game configuration (#124)

### Changed
- TradingService now validates game start/end dates

### Fixed
- Portfolio value calculation for short positions
```

When releasing, move `[Unreleased]` items to a new version section with the date.
