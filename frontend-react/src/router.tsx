import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import {
  Layout,
  ProtectedRoute,
  Dashboard,
  Leaderboard,
  ActivityPage,
  PlayerPortfolio,
  Login,
  MyPortfolio,
  Settings,
} from './pages';

/**
 * Application Router Configuration
 *
 * Defines all routes with their components and protection levels.
 * Uses React Router 6's new data router API.
 */
const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      // Public Routes
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'leaderboard',
        element: <Leaderboard />,
      },
      {
        path: 'activity',
        element: <ActivityPage />,
      },
      {
        path: 'player/:id',
        element: <PlayerPortfolio />,
      },
      {
        path: 'login',
        element: <Login />,
      },

      // Protected Routes
      {
        path: 'portfolio',
        element: (
          <ProtectedRoute>
            <MyPortfolio />
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        ),
      },

      // 404 Fallback
      {
        path: '*',
        element: (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h1>404 - Page Not Found</h1>
            <p>The page you're looking for doesn't exist.</p>
            <a href="/">Go back to Dashboard</a>
          </div>
        ),
      },
    ],
  },
]);

/**
 * AppRouter Component
 *
 * Wraps the RouterProvider for use in App.tsx
 */
export const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default router;
