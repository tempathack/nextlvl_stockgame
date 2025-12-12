import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Box,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { portfolioApi } from '../../api/portfolio';
import { useAuth } from '../../hooks/useAuth';
import { useTradeHistory } from '../../hooks/usePortfolio';
import PortfolioOverview from '../../components/portfolio/PortfolioOverview';
import TradeForm from '../../components/portfolio/TradeForm';
import PositionsTable from '../../components/portfolio/PositionsTable';
import PortfolioChart from '../../components/portfolio/PortfolioChart';
import TradeHistoryTable from '../../components/portfolio/TradeHistoryTable';

/**
 * My Portfolio Page - Protected
 *
 * Route: /portfolio
 * Authentication: Required
 *
 * User's personal portfolio view with trading capabilities.
 * Shows positions, allows executing trades, and displays performance.
 */
const MyPortfolio: React.FC = () => {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState(0);

  // Fetch user's portfolio
  const {
    data: portfolio,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['my-portfolio'],
    queryFn: () => portfolioApi.getMyPortfolio(),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Fetch trade history for trading book (lazy load when tab is active)
  const {
    data: tradeHistory,
    isLoading: isHistoryLoading,
    isError: isHistoryError,
    error: historyError,
    refetch: refetchHistory,
  } = useTradeHistory(50, 0, selectedTab === 2);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleTradeSuccess = () => {
    refetch(); // Refresh portfolio after successful trade
  };

  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 400,
          }}
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (isError) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          Failed to load portfolio: {error instanceof Error ? error.message : 'Unknown error'}
        </Alert>
      </Container>
    );
  }

  if (!portfolio) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="info">Portfolio not found</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          My Portfolio
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Welcome back, {user?.username}! Manage your positions and execute trades.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Portfolio Overview */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3 }}>
            <PortfolioOverview portfolio={portfolio} />
          </Paper>
        </Grid>

        {/* Portfolio Allocation Chart */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Allocation
            </Typography>
            <PortfolioChart positions={portfolio.positions} cashBalance={portfolio.cash_balance} />
          </Paper>
        </Grid>

        {/* Tabs for positions, trading, and trade book */}
        <Grid item xs={12}>
          <Paper sx={{ p: 0 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={selectedTab} onChange={handleTabChange}>
                <Tab label="Positions" />
                <Tab label="Trade" />
                <Tab label="Trade Book" />
              </Tabs>
            </Box>

            {selectedTab === 0 && (
              <Box>
                <Box sx={{ p: 2 }}>
                  <Typography variant="h6">
                    Current Positions ({portfolio.positions?.length || 0})
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Your active holdings and their performance
                  </Typography>
                </Box>
                <Divider />
                <PositionsTable
                  positions={portfolio.positions || []}
                  isPublicView={false}
                />
              </Box>
            )}

            {selectedTab === 1 && (
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Execute Trade
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  No trading limits - trade as often as you want. Cash only, no margin.
                </Typography>
                <TradeForm
                  availableCash={portfolio.cash_balance}
                  positions={portfolio.positions || []}
                  onTradeSuccess={handleTradeSuccess}
                />
              </Box>
            )}

            {selectedTab === 2 && (
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Trading Book
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Every executed trade is captured, timestamped, and visible to other participants.
                </Typography>
                <TradeHistoryTable
                  orders={tradeHistory?.orders || []}
                  isLoading={isHistoryLoading}
                  error={isHistoryError ? historyError : undefined}
                  onRefresh={refetchHistory}
                />
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Trade History Note */}
        <Grid item xs={12}>
          <Alert severity="info">
            All trades are public and visible in the Activity Feed. Your portfolio is fully
            transparent to other players.
          </Alert>
        </Grid>
      </Grid>
    </Container>
  );
};

export default MyPortfolio;
