# Stock Trading Game - Status Quo

**Last Updated**: 2025-12-12

## Project Overview

A 180-day stock trading competition platform where participants start with $100,000 virtual cash and compete by building the most profitable portfolio.

**Project Location**: `/home/tempa/Desktop/new/new stockgame/`

---

## Current Architecture

### Backend Stack
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL with async SQLAlchemy
- **Authentication**: JWT tokens (access + refresh)
- **Market Data**: Yahoo Finance (yfinance)
- **Task Runner**: Background tasks / CronJobs

### Frontend Stack
- **Framework**: React 18 with TypeScript
- **UI Library**: Material-UI v5
- **State Management**: TanStack Query (React Query)
- **Charts**: ECharts
- **HTTP Client**: Axios
- **Build Tool**: Vite

### Infrastructure
- **Container**: Docker + Docker Compose
- **Ports**: Backend 8000, Frontend 5173

---

## Current Features

### Implemented

| Feature | Status | Description |
|---------|--------|-------------|
| User Registration | Done | Email/username/password signup |
| User Authentication | Done | JWT-based login with refresh tokens |
| Portfolio Creation | Done | Auto-created on registration with $100k |
| Trading (Buy/Sell) | Done | Execute market orders |
| Short Selling | Done | Open and cover short positions |
| Position Tracking | Done | Track all holdings with P&L |
| Market Data | Done | Real-time quotes from Yahoo Finance |
| Activity Feed | Done | Public feed of all trades |
| Leaderboard | Done | Rankings by total return % |
| Player Comparison | Done | Compare 2 players side-by-side |
| Benchmark Comparison | Done | Compare portfolio vs S&P, NASDAQ, etc. |
| Stock Analysis | Done | Technical charts and indicators |
| Sector Heatmap | Done | Market sector performance |
| Top Movers | Done | Gainers, losers, most active |

### Not Yet Implemented

| Feature | Status | Description |
|---------|--------|-------------|
| Trading Fees | Planned | 0.1% fee on all trades |
| Game Reset | Planned | Admin ability to reset all portfolios |
| Global Start Date | Planned | Configurable game period via DB |
| Full Comparison Tab | Planned | All participants with position details |
| Admin Panel | Planned | Game configuration UI |

---

## Database Schema

### Users Schema
- `users` - User accounts (username, email, hashed_password)
- `profiles` - User profiles (display_name, bio, preferences)

### Portfolio Schema
- `portfolios` - User portfolios (cash_balance, equity_value)
- `positions` - Stock holdings (symbol, quantity, average_price, is_short)
- `trade_orders` - Trade history (symbol, side, quantity, price, status)
- `metric_snapshots` - Historical portfolio values

### Activity Schema
- `trade_activities` - Public trade feed

### Game Schema
- `game_configs` - Competition settings (start_date, end_date, starting_capital)

### Market Data Schema
- `market_prices` - Cached stock prices
- `sector_performance` - Sector data
- `market_indices` - Index values (S&P, NASDAQ, DOW, VIX)

---

## API Endpoints

### Public Endpoints (No Auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/activity` | Get trade activity feed |
| GET | `/api/leaderboard` | Get rankings |
| GET | `/api/leaderboard/{user_id}/portfolio` | Get player portfolio |
| GET | `/api/market/quote/{symbol}` | Get stock quote |
| GET | `/api/market/sectors` | Get sector heatmap |
| GET | `/api/market/movers` | Get top movers |
| GET | `/api/market/indices` | Get market indices |
| GET | `/api/market/search` | Search symbols |
| GET | `/api/benchmarks` | Get benchmark data |

### Protected Endpoints (Auth Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/me` | Get current user |
| POST | `/api/trades` | Submit trade order |
| GET | `/api/trades/history` | Get trade history |
| GET | `/api/portfolio/me` | Get my portfolio |
| GET | `/api/users/profile` | Get my profile |
| PUT | `/api/users/profile` | Update profile |

### Admin Endpoints (Planned)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/game-config` | Get game config |
| PUT | `/api/admin/game-config` | Update game config |
| POST | `/api/admin/reset-game` | Reset all portfolios |

---

## Frontend Routes

| Route | Page | Auth Required |
|-------|------|---------------|
| `/` | Dashboard | No |
| `/analysis` | Stock Analysis | No |
| `/leaderboard` | Leaderboard | No |
| `/activity` | Activity Feed | No |
| `/player/:userId` | Player Portfolio | No |
| `/login` | Login | No |
| `/register` | Register | No |
| `/portfolio` | My Portfolio | Yes |
| `/settings` | Settings | Yes |
| `/comparison` | Full Comparison (Planned) | No |

---

## Game Rules

| Rule | Current Value |
|------|---------------|
| Starting Capital | $100,000 |
| Trading Fees | None (0.1% planned) |
| Trade Limits | None |
| Short Selling | Allowed |
| Margin/Borrowing | Not allowed |
| Competition Duration | 180 days |
| Available Symbols | All Yahoo Finance |

---

## File Structure

```
/home/tempa/Desktop/new/new stockgame/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps/         # Dependencies (auth)
│   │   │   └── routes/       # API endpoints
│   │   ├── core/             # Config, security
│   │   ├── db/               # Database session
│   │   ├── integrations/     # External APIs (Yahoo)
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── services/         # Business logic
│   │   └── tasks/            # Background tasks
│   ├── alembic/              # Database migrations
│   ├── Dockerfile
│   └── pyproject.toml
├── frontend-react/
│   ├── src/
│   │   ├── api/              # API clients
│   │   ├── components/       # React components
│   │   ├── contexts/         # React contexts
│   │   ├── hooks/            # Custom hooks
│   │   └── pages/            # Page components
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yaml
├── STATUS_QUO.md             # This file
├── CHANGELOG.md              # Change history
└── backend/
    └── implementation-guide-4.md  # Current implementation guide
```

---

## Known Issues / Technical Debt

1. **No trading fees** - Trades execute without cost
2. **No game date enforcement** - Trading allowed anytime
3. **No admin reset capability** - Must manually reset DB
4. **Limited comparison view** - Can only compare 2 players at a time
5. **No historical performance tracking** - MetricSnapshots not populated

---

## Next Steps

See `implementation-guide-4.md` for detailed implementation plan covering:
1. Trading fees (0.1% on all trades)
2. Admin API for game configuration and reset
3. Full comparison tab with all participants
4. Game date validation

---

## Development Commands

```bash
# Backend
cd backend
poetry install
poetry run uvicorn app.main:app --reload

# Frontend
cd frontend-react
npm install
npm run dev

# Docker
docker-compose up -d
docker-compose logs -f

# Database migrations
cd backend
poetry run alembic upgrade head
```

---

## Contact / Resources

- **Implementation Guide**: `backend/implementation-guide-4.md`
- **Changelog**: `CHANGELOG.md`
