import React from 'react';
import { Box, Grid, Paper, Typography, Button, Stack } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { Analytics, TrendingUp } from '@mui/icons-material';
import SectorHeatmap from '../../components/dashboard/SectorHeatmap';
import SP500Treemap from '../../components/dashboard/SP500Treemap';
import TopMovers from '../../components/dashboard/TopMovers';
import MarketIndices from '../../components/dashboard/MarketIndices';
import NewsFeed from '../../components/dashboard/NewsFeed';

/**
 * Dashboard Page - Public
 *
 * Route: /
 * Authentication: Not required
 *
 * Shows market overview with sector performance, S&P 500 treemap,
 * top movers, major indices, and latest market news.
 */
const Dashboard: React.FC = () => {
  return (
    <Box sx={{ width: '100%', px: 3, py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Market Dashboard
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            component={RouterLink}
            to="/analysis"
            variant="contained"
            startIcon={<Analytics />}
            sx={{
              bgcolor: 'rgba(0, 230, 118, 0.2)',
              color: '#00E676',
              '&:hover': { bgcolor: 'rgba(0, 230, 118, 0.3)' },
            }}
          >
            Technical Analysis
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={3}>
        {/* Market Indices - Full Width */}
        <Grid item xs={12}>
          <MarketIndices />
        </Grid>

        {/* Sector Heatmap - Left Side */}
        <Grid item xs={12} lg={6}>
          <SectorHeatmap />
        </Grid>

        {/* Top Movers - Right Side */}
        <Grid item xs={12} lg={6}>
          <TopMovers />
        </Grid>

        {/* S&P 500 Treemap - Full Width */}
        <Grid item xs={12}>
          <SP500Treemap />
        </Grid>

        {/* News Feed - Full Width */}
        <Grid item xs={12}>
          <Paper
            sx={{
              p: 3,
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            }}
          >
            <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ color: '#fff' }}>
              Market News
            </Typography>
            <NewsFeed />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
