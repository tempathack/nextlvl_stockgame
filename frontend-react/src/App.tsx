/**
 * Main App component with routing
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from './hooks/useAuth';

// Layout
import MainLayout from './components/layout/MainLayout';

// Public pages
import Dashboard from './pages/public/Dashboard';
import Analysis from './pages/public/Analysis';
import InsiderTrades from './pages/public/InsiderTrades';
import Leaderboard from './pages/public/Leaderboard';
import Comparison from './pages/public/Comparison';
import ActivityPage from './pages/public/ActivityPage';
import PlayerPortfolio from './pages/public/PlayerPortfolio';
import Login from './pages/public/Login';
import Register from './pages/public/Register';

// Protected pages
import MyPortfolio from './pages/protected/MyPortfolio';
import Settings from './pages/protected/Settings';

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        {/* Public routes */}
        <Route index element={<Dashboard />} />
        <Route path="analysis" element={<Analysis />} />
        <Route path="insider-trades" element={<InsiderTrades />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="comparison" element={<Comparison />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="player/:userId" element={<PlayerPortfolio />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />

        {/* Protected routes */}
        <Route
          path="portfolio"
          element={
            <ProtectedRoute>
              <MyPortfolio />
            </ProtectedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
