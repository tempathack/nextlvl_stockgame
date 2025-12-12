import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Box,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { leaderboardApi } from '../../api/leaderboard';
import PublicPortfolioView from '../../components/portfolio/PublicPortfolioView';
import PositionsTable from '../../components/portfolio/PositionsTable';
import PerformanceChart from '../../components/portfolio/PerformanceChart';
import { TrendingUp, TrendingDown, AccountBalance } from '@mui/icons-material';

/**
 * Player Portfolio Page - Public
 *
 * Route: /player/:id
 * Authentication: Not required
 *
 * Shows detailed portfolio view for any player.
 * Full transparency - positions, quantities, and values are public.
 */
const PlayerPortfolio: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const userId = id ? parseInt(id, 10) : null;

  // Fetch player portfolio data
  const {
    data: portfolio,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['player-portfolio', userId],
    queryFn: () => leaderboardApi.getUserPortfolio(userId!),
    enabled: userId !== null,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (!userId || isNaN(userId)) {
    return <Navigate to="/leaderboard" replace />;
  }

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
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
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          Failed to load portfolio: {error instanceof Error ? error.message : 'Unknown error'}
        </Alert>
      </Container>
    );
  }

  if (!portfolio) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="info">Portfolio not found</Alert>
      </Container>
    );
  }

  const totalReturn = portfolio.total_return_pct || 0;
  const isPositiveReturn = totalReturn >= 0;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {portfolio.display_name}'s Portfolio
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Public portfolio view - Last updated: {new Date(portfolio.last_updated).toLocaleString()}
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Total Value
              </Typography>
              <Typography variant="h5" component="div">
                ${portfolio.total_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccountBalance color="primary" />
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Cash Balance
                </Typography>
              </Box>
              <Typography variant="h5" component="div">
                ${portfolio.cash_balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Equity Value
              </Typography>
              <Typography variant="h5" component="div">
                ${portfolio.equity_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isPositiveReturn ? (
                  <TrendingUp color="success" />
                ) : (
                  <TrendingDown color="error" />
                )}
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Total Return
                </Typography>
              </Box>
              <Typography
                variant="h5"
                component="div"
                color={isPositiveReturn ? 'success.main' : 'error.main'}
              >
                {isPositiveReturn ? '+' : ''}{totalReturn.toFixed(2)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Portfolio Overview & Performance Chart */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <PublicPortfolioView portfolio={portfolio} />
          </Paper>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 2, height: '400px' }}>
            <Typography variant="h6" gutterBottom>
              Performance History
            </Typography>
            <PerformanceChart userId={userId} />
          </Paper>
        </Grid>

        {/* Positions Table */}
        <Grid item xs={12}>
          <Paper sx={{ p: 0 }}>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6">
                Holdings ({portfolio.positions.length})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All positions are publicly visible
              </Typography>
            </Box>
            <Divider />
            <PositionsTable positions={portfolio.positions} isPublicView />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default PlayerPortfolio;
