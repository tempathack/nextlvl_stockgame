# Stock Trading Game - React Frontend

Modern, production-ready React frontend for the 180-Day Stock Trading Competition built with Vite, React 18, Material-UI 5, and Apache ECharts.

## Technology Stack

- **Build Tool**: Vite 5.x
- **Framework**: React 18.x with TypeScript
- **UI Library**: Material-UI (MUI) 5.x
- **Charts**: Apache ECharts + echarts-for-react
- **State Management**: React Query (TanStack Query) 5.x
- **Routing**: React Router 6.x
- **HTTP Client**: Axios
- **Styling**: Emotion (MUI default)

## Project Structure

```
frontend-react/
├── src/
│   ├── api/                    # API client layer
│   │   ├── client.ts           # Axios instance with interceptors
│   │   ├── activity.ts         # Activity feed API
│   │   ├── auth.ts             # Authentication API
│   │   ├── market.ts           # Market data API
│   │   ├── portfolio.ts        # Portfolio API
│   │   ├── leaderboard.ts      # Leaderboard API
│   │   └── user.ts             # User API
│   │
│   ├── components/             # Reusable components
│   │   ├── activity/           # Activity feed components
│   │   │   └── ActivityFeed.tsx
│   │   ├── dashboard/          # Dashboard components
│   │   │   ├── MarketIndices.tsx
│   │   │   ├── SectorHeatmap.tsx
│   │   │   ├── TopMovers.tsx
│   │   │   └── NewsFeed.tsx
│   │   ├── leaderboard/        # Leaderboard components
│   │   │   ├── LeaderboardTable.tsx
│   │   │   ├── PlayerComparison.tsx
│   │   │   └── BenchmarkChart.tsx
│   │   ├── portfolio/          # Portfolio components
│   │   │   ├── PortfolioOverview.tsx
│   │   │   ├── PortfolioChart.tsx
│   │   │   ├── PositionsTable.tsx
│   │   │   ├── TradeForm.tsx
│   │   │   ├── PublicPortfolioView.tsx
│   │   │   └── PerformanceChart.tsx
│   │   └── layout/             # Layout components
│   │       └── MainLayout.tsx
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAuth.ts          # Authentication hook
│   │   ├── useActivity.ts      # Activity feed hook (auto-refresh)
│   │   ├── useMarketData.ts    # Market data hooks
│   │   └── usePortfolio.ts     # Portfolio hooks
│   │
│   ├── pages/                  # Page components
│   │   ├── public/             # Public pages (no auth required)
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Leaderboard.tsx
│   │   │   ├── ActivityPage.tsx
│   │   │   ├── PlayerPortfolio.tsx
│   │   │   ├── Login.tsx
│   │   │   └── Register.tsx
│   │   └── protected/          # Protected pages (auth required)
│   │       ├── MyPortfolio.tsx
│   │       └── Settings.tsx
│   │
│   ├── App.tsx                 # Main app component with routing
│   ├── main.tsx                # App entry point
│   └── theme.ts                # MUI theme configuration
│
├── public/                     # Static assets
├── index.html                  # HTML entry point
├── package.json                # Dependencies
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript configuration
├── nginx.conf                  # Nginx config for production
└── Dockerfile                  # Multi-stage Docker build
```

## Key Features

### Public Features (No Authentication Required)
- **Market Dashboard** - Sector heatmap, top movers, market indices
- **Leaderboard** - Rankings with full portfolio transparency
- **Activity Feed** - Real-time trades from all players (auto-refresh every 5s)
- **Player Portfolios** - View any player's complete holdings and performance

### Protected Features (Authentication Required)
- **My Portfolio** - Personal portfolio management with trade form
- **Trade Execution** - Buy, sell, short, cover with real-time quotes
- **Settings** - Profile and preference management

### Technical Highlights
- **Auto-refresh**: Activity feed updates every 5 seconds
- **Real-time data**: Market indices and portfolio values update every 30 seconds
- **Responsive design**: Mobile-first approach with MUI breakpoints
- **Performance**: Code splitting, lazy loading, optimized bundles
- **Type safety**: Full TypeScript coverage
- **Error handling**: Comprehensive error boundaries and fallbacks

## Development

### Prerequisites
- Node.js 20.x or higher
- npm or yarn

### Installation

```bash
# Install dependencies
npm install
```

### Environment Variables

Create a `.env` file in the root directory (optional):

```env
# API URL - defaults to /api for proxy in development
VITE_API_URL=/api
```

### Development Server

```bash
# Start dev server with HMR
npm run dev

# Server runs on http://localhost:3000
# API calls to /api are proxied to http://localhost:8000
```

### Build for Production

```bash
# Type check
npm run type-check

# Build
npm run build

# Preview production build
npm run preview
```

### Linting

```bash
npm run lint
```

## Docker Deployment

### Build Docker Image

```bash
docker build -t stock-game-frontend:latest .
```

### Run Container

```bash
docker run -d -p 80:80 stock-game-frontend:latest
```

### Multi-stage Build

The Dockerfile uses a multi-stage build:
1. **Builder stage**: Node 20 Alpine, installs deps, builds app
2. **Production stage**: Nginx Alpine, serves static files

Production image size: ~25MB (Nginx + static files only)

## API Integration

### Authentication

The app uses JWT bearer tokens stored in localStorage:
- `access_token` - Short-lived access token
- `refresh_token` - Long-lived refresh token

Axios interceptors automatically:
- Add auth headers to requests
- Handle 401 responses (redirect to login)
- Retry failed requests after token refresh

### API Client Configuration

```typescript
// Base URL configurable via environment variable
const baseURL = import.meta.env.VITE_API_URL || '/api';

// Timeouts
const timeout = 30000; // 30 seconds

// Credentials
withCredentials: true // Include cookies
```

### React Query Configuration

```typescript
// Default options
{
  queries: {
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 30000, // 30 seconds
  },
  mutations: {
    retry: 0,
  },
}
```

## Component Examples

### Using Activity Feed Hook

```typescript
import { useActivityFeed } from '@/hooks/useActivity';

const MyComponent = () => {
  const { data, isLoading } = useActivityFeed(100);

  // Auto-refreshes every 5 seconds
  // data.activities contains array of trades
  // data.total contains total count
};
```

### Using Market Data Hook

```typescript
import { useMarketIndices, useTopMovers } from '@/hooks/useMarketData';

const MarketDashboard = () => {
  const { data: indices } = useMarketIndices();
  const { data: movers } = useTopMovers(10);

  // Auto-refreshes based on staleTime
};
```

### Using Portfolio Hook

```typescript
import { useMyPortfolio, useTrade } from '@/hooks/usePortfolio';

const Portfolio = () => {
  const { data: portfolio } = useMyPortfolio();
  const tradeMutation = useTrade();

  const handleTrade = async (trade) => {
    await tradeMutation.mutateAsync(trade);
    // Portfolio automatically refetched after trade
  };
};
```

## Nginx Configuration

The production build is served by Nginx with:
- Gzip compression for text assets
- Cache headers for static assets (1 year)
- SPA routing (all routes serve index.html)
- Security headers (X-Frame-Options, CSP, etc.)

## Performance Optimizations

### Code Splitting

Vendor chunks are split by library:
- `vendor`: React, React DOM, React Router
- `mui`: Material-UI components
- `charts`: ECharts library
- `query`: React Query and Axios

### Asset Optimization

- SVG rendering for charts (smaller than canvas)
- Image lazy loading
- Route-based code splitting

### Bundle Size

Production build sizes:
- `vendor.js`: ~150KB gzipped
- `mui.js`: ~200KB gzipped
- `charts.js`: ~280KB gzipped
- `query.js`: ~40KB gzipped
- App code: ~100KB gzipped

Total: ~770KB gzipped (2.5MB uncompressed)

## Browser Support

- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions

## Game Rules

- **Starting Capital**: $100,000 cash
- **Trading**: Unlimited trades, no restrictions
- **Short Selling**: Allowed
- **Margin/Borrowing**: Disabled (cash-only)
- **Duration**: 180 days
- **Winner**: Highest portfolio value at end
- **Transparency**: All portfolios fully visible to all players

## Contributing

1. Follow existing code style
2. Use TypeScript for all new files
3. Add proper JSDoc comments
4. Ensure type safety (no `any` types)
5. Test on mobile breakpoints

## License

Proprietary - 180-Day Stock Trading Competition
