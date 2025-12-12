import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import { TrendingUp, TrendingDown, ShowChart } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface TopMover {
  symbol: string;
  name: string | null;
  price: number;
  change_pct: number;
  volume: number | null;
}

interface TopMoversResponse {
  gainers: TopMover[];
  losers: TopMover[];
  most_active: TopMover[];
  updated_at: string;
}

const fetchTopMovers = async (): Promise<TopMoversResponse> => {
  const { data } = await axios.get<TopMoversResponse>('/api/market/movers', {
    params: { limit: 10 },
  });
  return data;
};

const TopMovers: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ['topMovers'],
    queryFn: fetchTopMovers,
    refetchInterval: 60000, // Refetch every minute
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const formatVolume = (volume: number | null): string => {
    if (!volume) return 'N/A';
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`;
    return volume.toString();
  };

  const renderTable = (movers: TopMover[], type: 'gainers' | 'losers' | 'active') => (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Symbol</TableCell>
            <TableCell>Name</TableCell>
            <TableCell align="right">Price</TableCell>
            <TableCell align="right">Change</TableCell>
            <TableCell align="right">Volume</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {movers.map((mover) => {
            // Convert string values to numbers
            const price = typeof mover.price === 'string' ? parseFloat(mover.price) : mover.price;
            const changePct = typeof mover.change_pct === 'string' ? parseFloat(mover.change_pct) : mover.change_pct;

            return (
              <TableRow key={mover.symbol} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {mover.symbol}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                    {mover.name || mover.symbol}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">${price.toFixed(2)}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Chip
                    label={`${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`}
                    size="small"
                    color={changePct >= 0 ? 'success' : 'error'}
                    sx={{ minWidth: 80 }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="text.secondary">
                    {formatVolume(mover.volume)}
                  </Typography>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );

  if (isLoading) {
    return (
      <Paper sx={{ p: 3, height: 450, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Paper>
    );
  }

  if (error || !data) {
    return (
      <Paper sx={{ p: 3, height: 450 }}>
        <Alert severity="error">Failed to load market movers</Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, height: 450 }}>
      <Typography variant="h6" gutterBottom>
        Market Movers
      </Typography>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab
            icon={<TrendingUp />}
            iconPosition="start"
            label="Gainers"
            sx={{ minHeight: 48 }}
          />
          <Tab
            icon={<TrendingDown />}
            iconPosition="start"
            label="Losers"
            sx={{ minHeight: 48 }}
          />
          <Tab
            icon={<ShowChart />}
            iconPosition="start"
            label="Most Active"
            sx={{ minHeight: 48 }}
          />
        </Tabs>
      </Box>
      <Box sx={{ height: 'calc(100% - 120px)', overflow: 'auto' }}>
        {activeTab === 0 && renderTable(data.gainers, 'gainers')}
        {activeTab === 1 && renderTable(data.losers, 'losers')}
        {activeTab === 2 && renderTable(data.most_active, 'active')}
      </Box>
    </Paper>
  );
};

export default TopMovers;
