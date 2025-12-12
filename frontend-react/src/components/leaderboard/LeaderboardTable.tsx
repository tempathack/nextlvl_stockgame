import React from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  TablePagination,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  EmojiEvents,
  TrendingUp,
  TrendingDown,
  Visibility,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface LeaderboardEntry {
  rank: number;
  user_id: number;
  display_name: string;
  portfolio_value: number;
  cash_balance: number;
  equity_value: number;
  total_return_pct: number;
  positions_count: number;
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total_players: number;
  limit: number;
  offset: number;
}

const fetchLeaderboard = async (limit: number, offset: number): Promise<LeaderboardResponse> => {
  const { data } = await axios.get<LeaderboardResponse>('/api/leaderboard', {
    params: { limit, offset },
  });
  return data;
};

const LeaderboardTable: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);

  const { data, isLoading, error } = useQuery({
    queryKey: ['leaderboard', rowsPerPage, page * rowsPerPage],
    queryFn: () => fetchLeaderboard(rowsPerPage, page * rowsPerPage),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewPortfolio = (userId: number) => {
    navigate(`/player/${userId}`);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getRankColor = (rank: number): string => {
    switch (rank) {
      case 1:
        return '#fbbf24'; // Gold
      case 2:
        return '#94a3b8'; // Silver
      case 3:
        return '#fb923c'; // Bronze
      default:
        return 'transparent';
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank <= 3) {
      return (
        <EmojiEvents
          sx={{
            color: getRankColor(rank),
            fontSize: 28,
          }}
        />
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Paper>
    );
  }

  if (error || !data) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="error">Failed to load leaderboard</Alert>
      </Paper>
    );
  }

  return (
    <Paper>
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h5" fontWeight="bold">
          Leaderboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {data.total_players} players competing
        </Typography>
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width="80px">Rank</TableCell>
              <TableCell>Player</TableCell>
              <TableCell align="right">Portfolio Value</TableCell>
              <TableCell align="right">Cash</TableCell>
              <TableCell align="right">Equity</TableCell>
              <TableCell align="right">Total Return</TableCell>
              <TableCell align="right">Positions</TableCell>
              <TableCell align="center" width="100px">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.entries.map((entry) => {
              const isProfit = entry.total_return_pct >= 0;

              return (
                <TableRow
                  key={entry.user_id}
                  hover
                  sx={{
                    bgcolor: entry.rank <= 3 ? `${getRankColor(entry.rank)}10` : 'transparent',
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {getRankIcon(entry.rank) || (
                        <Typography variant="h6" fontWeight="bold">
                          {entry.rank}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {entry.display_name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body1" fontWeight="medium">
                          {entry.display_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {entry.user_id}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body1" fontWeight="bold">
                      {formatCurrency(entry.portfolio_value)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="text.secondary">
                      {formatCurrency(entry.cash_balance)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="text.secondary">
                      {formatCurrency(entry.equity_value)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                      {isProfit ? (
                        <TrendingUp fontSize="small" color="success" />
                      ) : (
                        <TrendingDown fontSize="small" color="error" />
                      )}
                      <Chip
                        label={`${isProfit ? '+' : ''}${entry.total_return_pct.toFixed(2)}%`}
                        size="small"
                        color={isProfit ? 'success' : 'error'}
                        sx={{ minWidth: 80, fontWeight: 'bold' }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Chip
                      label={entry.positions_count}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="View Portfolio">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleViewPortfolio(entry.user_id)}
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={data.total_players}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
};

export default LeaderboardTable;
