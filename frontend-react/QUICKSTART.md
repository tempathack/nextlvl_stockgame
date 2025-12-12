# Quick Start Guide - Stock Trading Game Frontend

## Installation & Setup

### 1. Install Dependencies

```bash
cd "/home/tempa/Desktop/new/new stockgame/frontend-react"
npm install
```

This will install all required packages:
- React 18 + TypeScript
- Material-UI 5
- Apache ECharts
- React Query
- React Router 6
- Axios

### 2. Start Development Server

```bash
npm run dev
```

The app will start on http://localhost:3000

API calls to `/api/*` are automatically proxied to http://localhost:8000 (FastAPI backend)

### 3. Build for Production

```bash
# Type check first
npm run type-check

# Build
npm run build

# Preview production build
npm run preview
```

Build output goes to `dist/` directory

## Docker Build

```bash
# Build image
docker build -t stock-game-frontend:latest .

# Run container
docker run -d -p 80:80 stock-game-frontend:latest

# Access at http://localhost
```

## Project Overview

### File Structure Created

#### Configuration Files
- `package.json` - Dependencies and scripts
- `vite.config.ts` - Vite build config with /api proxy
- `tsconfig.json` - TypeScript config
- `index.html` - HTML entry point
- `nginx.conf` - Production Nginx config
- `Dockerfile` - Multi-stage Docker build

#### Source Code (`src/`)

**API Layer** (`src/api/`)
- `client.ts` - Axios instance with auth interceptors
- `activity.ts` - Activity feed endpoints
- `auth.ts` - Login/logout/register
- `market.ts` - Market data (quotes, sectors, indices)
- `portfolio.ts` - Portfolio and trading endpoints
- `leaderboard.ts` - Rankings and public portfolios

**Custom Hooks** (`src/hooks/`)
- `useAuth.ts` - Authentication with context provider
- `useActivity.ts` - Activity feed (auto-refresh every 5s)
- `useMarketData.ts` - Market data queries
- `usePortfolio.ts` - Portfolio queries and trade mutation

**Components** (`src/components/`)
- `activity/ActivityFeed.tsx` - Real-time trade feed
- `dashboard/` - Market indices, sector heatmap, top movers
- `leaderboard/` - Rankings table, comparisons, benchmarks
- `portfolio/` - Overview, positions, charts, trade form
- `layout/MainLayout.tsx` - Navigation and footer

**Pages** (`src/pages/`)

*Public (no auth):*
- `public/Dashboard.tsx` - Market overview
- `public/Leaderboard.tsx` - Rankings
- `public/ActivityPage.tsx` - Live activity feed
- `public/PlayerPortfolio.tsx` - View any player's portfolio
- `public/Login.tsx` - Login form
- `public/Register.tsx` - Registration form

*Protected (auth required):*
- `protected/MyPortfolio.tsx` - User's portfolio with trading
- `protected/Settings.tsx` - User settings

**Core Files**
- `App.tsx` - Main app with routing
- `main.tsx` - Entry point with providers
- `theme.ts` - MUI dark theme + utility functions

## Key Features

### Auto-Refresh Functionality

**Activity Feed** - Updates every 5 seconds
```typescript
const { data } = useActivityFeed(100);
// Automatically refetches every 5s
```

**Market Data** - Updates every 2-5 minutes
```typescript
const { data: indices } = useMarketIndices(); // 2min refresh
const { data: sectors } = useSectorHeatmap(); // 5min refresh
```

**Portfolio Data** - Updates every 30 seconds
```typescript
const { data: portfolio } = useMyPortfolio(); // 30s refresh
```

### Full TypeScript Support

All components, hooks, and API calls are fully typed. No `any` types used.

### Responsive Design

- Mobile-first approach
- MUI breakpoints: xs, sm, md, lg, xl
- Collapsible navigation on mobile
- Touch-optimized interactions

### Performance Optimizations

- Code splitting by route and vendor
- Lazy loading of charts
- Memoized expensive calculations
- React Query caching and deduplication
- Gzip compression in production

## Testing the App

### Without Backend

The app will show loading states or errors without the backend. To test UI only:

1. Comment out API calls in hooks
2. Use mock data in components
3. Test routing and navigation
4. Verify responsive design

### With Backend Running

1. Start backend on http://localhost:8000
2. Start frontend on http://localhost:3000
3. Navigate to pages and verify:
   - Dashboard shows market data
   - Leaderboard shows rankings
   - Activity feed updates automatically
   - Login/registration works
   - Trading executes correctly

## Common Issues

### Port Already in Use

```bash
# Change port in vite.config.ts
server: {
  port: 3001, // Use different port
}
```

### API Proxy Not Working

Ensure backend is running on http://localhost:8000 or update proxy target in `vite.config.ts`:

```typescript
proxy: {
  '/api': {
    target: 'http://your-backend-url',
    changeOrigin: true,
  },
},
```

### Build Errors

```bash
# Clear cache and reinstall
rm -rf node_modules dist
npm install
npm run build
```

### Docker Build Fails

Ensure you have enough disk space and Docker memory allocated (recommended: 4GB+)

## Next Steps

1. **Customize Theme** - Edit `src/theme.ts` for colors and typography
2. **Add Features** - Create new components in appropriate directories
3. **Update API** - Modify API clients in `src/api/` as backend evolves
4. **Deploy** - Use Dockerfile for production deployment

## Environment Variables

Create `.env` file for custom configuration:

```env
# API URL (default: /api)
VITE_API_URL=https://api.yourdomain.com

# Other custom variables
VITE_APP_NAME=Stock Trading Game
```

Access in code:
```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```

## Scripts Reference

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

## Production Checklist

Before deploying to production:

- [ ] Update API URL in environment variables
- [ ] Set secure secrets for JWT
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Set cache headers
- [ ] Enable compression
- [ ] Set up monitoring
- [ ] Test on multiple browsers
- [ ] Verify mobile responsiveness
- [ ] Load test with realistic data

## Support

For issues or questions:
1. Check console for errors
2. Verify backend is running
3. Check network tab in DevTools
4. Review API responses

## Game Rules Reminder

- Starting Capital: $100,000
- Unlimited trades
- Short selling allowed
- No margin/borrowing
- 180-day competition
- Full portfolio transparency
- Real-time activity feed visible to all
