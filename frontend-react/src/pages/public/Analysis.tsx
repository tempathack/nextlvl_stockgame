/**
 * Technical Analysis Page
 * Comprehensive stock analysis with charts, patterns, and screening
 */
import React, { useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  TextField,
  Autocomplete,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { StockChart, StockScreener, PatternDetector } from '../../components/analysis';
import SP500Treemap from '../../components/dashboard/SP500Treemap';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div hidden={value !== index} style={{ height: '100%' }}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
};

const fetchTickers = async (): Promise<string[]> => {
  const { data } = await apiClient.get('/analysis/sp500/tickers');
  return data.tickers;
};

const Analysis: React.FC = () => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('AAPL');
  const [tabValue, setTabValue] = useState(0);

  const { data: tickers } = useQuery({
    queryKey: ['sp500Tickers'],
    queryFn: fetchTickers,
    staleTime: 3600000, // 1 hour
  });

  const handleSelectStock = (symbol: string) => {
    setSelectedSymbol(symbol);
    setTabValue(0); // Switch to chart tab
  };

  return (
    <Box sx={{ width: '100%', px: 3, py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Technical Analysis
        </Typography>

        {/* Stock selector */}
        <Autocomplete
          value={selectedSymbol}
          onChange={(_, value) => value && setSelectedSymbol(value)}
          options={tickers || []}
          sx={{ width: 200 }}
          renderInput={params => (
            <TextField
              {...params}
              label="Select Stock"
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                },
              }}
            />
          )}
        />
      </Box>

      <Grid container spacing={3}>
        {/* Main content area with tabs */}
        <Grid item xs={12}>
          <Paper
            sx={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              borderRadius: 2,
            }}
          >
            <Tabs
              value={tabValue}
              onChange={(_, value) => setTabValue(value)}
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                px: 2,
                '& .MuiTab-root': { color: '#888' },
                '& .Mui-selected': { color: '#00E676' },
                '& .MuiTabs-indicator': { backgroundColor: '#00E676' },
              }}
            >
              <Tab label="Chart" />
              <Tab label="Market Map" />
              <Tab label="Screener" />
            </Tabs>

            <Box p={2}>
              <TabPanel value={tabValue} index={0}>
                <StockChart symbol={selectedSymbol} />
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <SP500Treemap />
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                <StockScreener onSelectStock={handleSelectStock} />
              </TabPanel>
            </Box>
          </Paper>
        </Grid>

        {/* Sidebar / supporting panels */}
        <Grid item xs={12}>
          <Grid container spacing={2}>
            {/* Pattern Detection */}
            <Grid item xs={12} md={6}>
              <PatternDetector symbol={selectedSymbol} />
            </Grid>

            {/* Stock Stats Card */}
            <Grid item xs={12} md={6}>
              <StockStatsCard symbol={selectedSymbol} />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

// Stats card component
interface StockStats {
  symbol: string;
  current_price: number;
  price_change_1d: number | null;
  price_change_1w: number | null;
  price_change_1m: number | null;
  price_change_ytd: number | null;
  volatility_30d: number | null;
  avg_volume_30d: number | null;
  high_52w: number;
  low_52w: number;
  rsi_current: number | null;
  trend: string;
  above_sma_20: boolean | null;
  above_sma_50: boolean | null;
  above_sma_200: boolean | null;
}

const fetchStats = async (symbol: string): Promise<StockStats> => {
  const { data } = await apiClient.get<StockStats>(`/analysis/stats/${symbol}`);
  return data;
};

const StockStatsCard: React.FC<{ symbol: string }> = ({ symbol }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['stockStats', symbol],
    queryFn: () => fetchStats(symbol),
    enabled: !!symbol,
    staleTime: 60000,
  });

  if (isLoading || !data) {
    return (
      <Paper sx={{ p: 2, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
        <Typography color="text.secondary">Loading stats...</Typography>
      </Paper>
    );
  }

  if (error) {
    return null;
  }

  const formatPct = (val: number | null) => {
    if (val === null) return '-';
    return `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;
  };

  const formatVolume = (val: number | null) => {
    if (val === null) return '-';
    if (val >= 1e9) return `${(val / 1e9).toFixed(1)}B`;
    if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
    return val.toLocaleString();
  };

  return (
    <Paper sx={{ p: 2, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
      <Typography variant="h6" fontWeight="bold" color="#fff" mb={2}>
        {symbol} Statistics
      </Typography>

      <Grid container spacing={1}>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary">
            Current Price
          </Typography>
          <Typography variant="body1" color="#fff" fontWeight="bold">
            ${data.current_price.toFixed(2)}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary">
            RSI (14)
          </Typography>
          <Typography
            variant="body1"
            fontWeight="bold"
            sx={{
              color:
                data.rsi_current !== null
                  ? data.rsi_current < 30
                    ? '#00E676'
                    : data.rsi_current > 70
                    ? '#FF5252'
                    : '#fff'
                  : '#888',
            }}
          >
            {data.rsi_current?.toFixed(1) || '-'}
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <Box my={1} borderBottom={1} borderColor="divider" />
        </Grid>

        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary">
            1D Change
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: (data.price_change_1d || 0) >= 0 ? '#00E676' : '#FF5252' }}
          >
            {formatPct(data.price_change_1d)}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary">
            1W Change
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: (data.price_change_1w || 0) >= 0 ? '#00E676' : '#FF5252' }}
          >
            {formatPct(data.price_change_1w)}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary">
            1M Change
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: (data.price_change_1m || 0) >= 0 ? '#00E676' : '#FF5252' }}
          >
            {formatPct(data.price_change_1m)}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary">
            YTD Change
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: (data.price_change_ytd || 0) >= 0 ? '#00E676' : '#FF5252' }}
          >
            {formatPct(data.price_change_ytd)}
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <Box my={1} borderBottom={1} borderColor="divider" />
        </Grid>

        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary">
            52W High
          </Typography>
          <Typography variant="body2" color="#fff">
            ${data.high_52w.toFixed(2)}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary">
            52W Low
          </Typography>
          <Typography variant="body2" color="#fff">
            ${data.low_52w.toFixed(2)}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary">
            Volatility (30D)
          </Typography>
          <Typography variant="body2" color="#fff">
            {data.volatility_30d?.toFixed(2) || '-'}%
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary">
            Avg Volume
          </Typography>
          <Typography variant="body2" color="#fff">
            {formatVolume(data.avg_volume_30d)}
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <Box my={1} borderBottom={1} borderColor="divider" />
        </Grid>

        <Grid item xs={12}>
          <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
            Position vs Moving Averages
          </Typography>
          <Box display="flex" gap={1} flexWrap="wrap">
            <Typography
              variant="caption"
              sx={{
                px: 1,
                py: 0.5,
                borderRadius: 1,
                bgcolor: data.above_sma_20 ? 'rgba(0,200,83,0.2)' : 'rgba(244,67,54,0.2)',
                color: data.above_sma_20 ? '#00E676' : '#FF5252',
              }}
            >
              {data.above_sma_20 ? 'Above' : 'Below'} SMA20
            </Typography>
            <Typography
              variant="caption"
              sx={{
                px: 1,
                py: 0.5,
                borderRadius: 1,
                bgcolor: data.above_sma_50 ? 'rgba(0,200,83,0.2)' : 'rgba(244,67,54,0.2)',
                color: data.above_sma_50 ? '#00E676' : '#FF5252',
              }}
            >
              {data.above_sma_50 ? 'Above' : 'Below'} SMA50
            </Typography>
            <Typography
              variant="caption"
              sx={{
                px: 1,
                py: 0.5,
                borderRadius: 1,
                bgcolor: data.above_sma_200 ? 'rgba(0,200,83,0.2)' : 'rgba(244,67,54,0.2)',
                color: data.above_sma_200 ? '#00E676' : '#FF5252',
              }}
            >
              {data.above_sma_200 ? 'Above' : 'Below'} SMA200
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default Analysis;
