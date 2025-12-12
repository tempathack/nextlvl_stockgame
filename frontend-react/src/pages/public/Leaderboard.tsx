import React, { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Tabs,
  Tab,
} from '@mui/material';
import LeaderboardTable from '../../components/leaderboard/LeaderboardTable';
import PlayerComparison from '../../components/leaderboard/PlayerComparison';
import BenchmarkChart from '../../components/leaderboard/BenchmarkChart';

/**
 * Leaderboard Page - Public
 *
 * Route: /leaderboard
 * Authentication: Not required
 *
 * Shows player rankings, allows comparison between players,
 * and displays performance vs market benchmarks.
 */
const Leaderboard: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Leaderboard
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        180-Day Stock Trading Competition - Full Portfolio Transparency
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={selectedTab} onChange={handleTabChange}>
          <Tab label="Rankings" />
          <Tab label="Player Comparison" />
          <Tab label="vs Benchmarks" />
        </Tabs>
      </Box>

      {selectedTab === 0 && (
        <Paper sx={{ p: 0 }}>
          <LeaderboardTable />
        </Paper>
      )}

      {selectedTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <PlayerComparison />
            </Paper>
          </Grid>
        </Grid>
      )}

      {selectedTab === 2 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Performance vs Market Benchmarks
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Compare top players against S&P 500, NASDAQ, and other major indices
          </Typography>
          <BenchmarkChart />
        </Paper>
      )}
    </Container>
  );
};

export default Leaderboard;
