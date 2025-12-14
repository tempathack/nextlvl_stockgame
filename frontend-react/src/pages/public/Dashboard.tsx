import React from 'react';
import { Box, Grid, Paper, Typography, Button, Stack } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { Analytics, ShowChart } from '@mui/icons-material';
import SectorHeatmap from '../../components/dashboard/SectorHeatmap';
import SP500Treemap from '../../components/dashboard/SP500Treemap';
import TopMovers from '../../components/dashboard/TopMovers';
import MarketIndices from '../../components/dashboard/MarketIndices';
import BenchmarkChart from '../../components/leaderboard/BenchmarkChart';

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
        {/* Performance vs Benchmarks - Featured Section */}
        <Grid item xs={12}>
          <Paper
            sx={{
              p: 3,
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              border: '1px solid rgba(0, 230, 118, 0.2)',
            }}
          >
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <ShowChart sx={{ color: '#00E676', fontSize: 28 }} />
              <Typography variant="h5" fontWeight="bold" sx={{ color: '#fff' }}>
                Performance vs Benchmarks
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Compare player performance against major market indices and ETFs. Toggle players and benchmarks to customize the view.
            </Typography>
            <BenchmarkChart height={550} />
          </Paper>
        </Grid>

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
      </Grid>
    </Box>
  );
};

export default Dashboard;
