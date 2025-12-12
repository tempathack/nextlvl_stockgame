import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccountBalance,
  ShowChart,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface PlayerPortfolio {
  user_id: number;
  display_name: string;
  portfolio_id: number;
  cash_balance: number;
  equity_value: number;
  total_value: number;
  total_return_pct: number;
  positions: Array<{
    symbol: string;
    quantity: number;
    market_value: number;
    gain_loss_pct: number | null;
  }>;
}

interface PlayerComparisonProps {
  userId1?: number;
  userId2?: number;
}

interface LeaderboardEntry {
  user_id: number;
  display_name: string;
}

const fetchPlayerPortfolio = async (userId: number): Promise<PlayerPortfolio> => {
  const { data } = await axios.get<PlayerPortfolio>(`/api/leaderboard/${userId}/portfolio`);
  return data;
};

const fetchLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  const { data } = await axios.get<{ entries: LeaderboardEntry[] }>('/api/leaderboard');
  return data.entries;
};

const PlayerComparison: React.FC<PlayerComparisonProps> = ({ userId1: propUserId1, userId2: propUserId2 }) => {
  const [selectedUser1, setSelectedUser1] = React.useState<number | null>(propUserId1 ?? null);
  const [selectedUser2, setSelectedUser2] = React.useState<number | null>(propUserId2 ?? null);

  // Fetch leaderboard to get user list for selection
  const { data: leaderboard } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: fetchLeaderboard,
  });

  // Set default selections when leaderboard loads
  React.useEffect(() => {
    if (leaderboard && leaderboard.length >= 2) {
      if (selectedUser1 === null) setSelectedUser1(leaderboard[0].user_id);
      if (selectedUser2 === null) setSelectedUser2(leaderboard[1].user_id);
    }
  }, [leaderboard, selectedUser1, selectedUser2]);

  const { data: player1, isLoading: loading1, error: error1 } = useQuery({
    queryKey: ['playerPortfolio', selectedUser1],
    queryFn: () => fetchPlayerPortfolio(selectedUser1!),
    enabled: selectedUser1 !== null,
  });

  const { data: player2, isLoading: loading2, error: error2 } = useQuery({
    queryKey: ['playerPortfolio', selectedUser2],
    queryFn: () => fetchPlayerPortfolio(selectedUser2!),
    enabled: selectedUser2 !== null,
  });

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderPlayerCard = (player: PlayerPortfolio | undefined, isLoading: boolean, error: any) => {
    if (isLoading) {
      return (
        <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </Card>
      );
    }

    if (error || !player) {
      return (
        <Card sx={{ height: '100%' }}>
          <Alert severity="error">Failed to load player data</Alert>
        </Card>
      );
    }

    const isProfit = player.total_return_pct >= 0;
    const topPositions = player.positions
      .sort((a, b) => b.market_value - a.market_value)
      .slice(0, 5);

    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          {/* Player Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Avatar sx={{ width: 60, height: 60, bgcolor: 'primary.main', fontSize: 24 }}>
              {player.display_name.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                {player.display_name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                User ID: {player.user_id}
              </Typography>
            </Box>
          </Box>

          {/* Portfolio Metrics */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Total Value
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {formatCurrency(player.total_value)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {isProfit ? (
                  <TrendingUp color="success" />
                ) : (
                  <TrendingDown color="error" />
                )}
                <Chip
                  label={`${isProfit ? '+' : ''}${player.total_return_pct.toFixed(2)}%`}
                  color={isProfit ? 'success' : 'error'}
                  size="small"
                />
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <AccountBalance fontSize="small" color="success" />
                  <Typography variant="caption" color="text.secondary">
                    Cash
                  </Typography>
                </Box>
                <Typography variant="body1" fontWeight="medium">
                  {formatCurrency(player.cash_balance)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {((player.cash_balance / player.total_value) * 100).toFixed(1)}%
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <ShowChart fontSize="small" color="primary" />
                  <Typography variant="caption" color="text.secondary">
                    Equity
                  </Typography>
                </Box>
                <Typography variant="body1" fontWeight="medium">
                  {formatCurrency(player.equity_value)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {((player.equity_value / player.total_value) * 100).toFixed(1)}%
                </Typography>
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Top Positions */}
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Top Positions
          </Typography>
          {topPositions.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {topPositions.map((position) => (
                <Box
                  key={position.symbol}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 1,
                    bgcolor: 'background.default',
                    borderRadius: 1,
                  }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {position.symbol}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {position.quantity.toLocaleString()} shares
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency(position.market_value)}
                    </Typography>
                    {position.gain_loss_pct !== null && (
                      <Chip
                        label={`${position.gain_loss_pct >= 0 ? '+' : ''}${position.gain_loss_pct.toFixed(1)}%`}
                        size="small"
                        color={position.gain_loss_pct >= 0 ? 'success' : 'error'}
                        sx={{ height: 18, fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No positions
            </Typography>
          )}

          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            Total: {player.positions.length} position{player.positions.length !== 1 ? 's' : ''}
          </Typography>
        </CardContent>
      </Card>
    );
  };

  const handleUser1Change = (event: SelectChangeEvent<number>) => {
    setSelectedUser1(event.target.value as number);
  };

  const handleUser2Change = (event: SelectChangeEvent<number>) => {
    setSelectedUser2(event.target.value as number);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Player Comparison
      </Typography>

      {/* User Selection */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth size="small">
            <InputLabel>Player 1</InputLabel>
            <Select
              value={selectedUser1 ?? ''}
              label="Player 1"
              onChange={handleUser1Change}
            >
              {leaderboard?.map((entry) => (
                <MenuItem key={entry.user_id} value={entry.user_id}>
                  {entry.display_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth size="small">
            <InputLabel>Player 2</InputLabel>
            <Select
              value={selectedUser2 ?? ''}
              label="Player 2"
              onChange={handleUser2Change}
            >
              {leaderboard?.map((entry) => (
                <MenuItem key={entry.user_id} value={entry.user_id}>
                  {entry.display_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Player Cards */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          {renderPlayerCard(player1, loading1 || selectedUser1 === null, error1)}
        </Grid>
        <Grid item xs={12} md={6}>
          {renderPlayerCard(player2, loading2 || selectedUser2 === null, error2)}
        </Grid>
      </Grid>
    </Box>
  );
};

export default PlayerComparison;
