/**
 * Pages Index
 *
 * Central export point for all page components.
 * Provides cleaner imports throughout the application.
 */

// Layout Components
export { default as Layout } from './Layout';
export { default as ProtectedRoute } from './ProtectedRoute';

// Public Pages
export { default as Dashboard } from './public/Dashboard';
export { default as Leaderboard } from './public/Leaderboard';
export { default as ActivityPage } from './public/ActivityPage';
export { default as PlayerPortfolio } from './public/PlayerPortfolio';
export { default as Login } from './public/Login';

// Protected Pages
export { default as MyPortfolio } from './protected/MyPortfolio';
export { default as Settings } from './protected/Settings';
