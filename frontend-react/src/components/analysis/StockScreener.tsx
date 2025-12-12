/**
 * Stock Screener Component
 * Filter S&P 500 stocks by technical criteria
 */
import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Button,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import { TrendingUp, TrendingDown, TrendingFlat, FilterList, Refresh } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

interface ScreenerResult {
  symbol: string;
  name: string | null;
  sector: string | null;
  price: number;
  change_pct: number | null;
  rsi_14: number | null;
  volume: number;
  trend: string;
}

interface ScreenerParams {
  rsi_below?: number;
  rsi_above?: number;
  trend?: string;
  sector?: string;
  sort_by: string;
  sort_order: string;
  limit: number;
}

const fetchScreenerResults = async (params: ScreenerParams): Promise<ScreenerResult[]> => {
  const queryParams = new URLSearchParams();
  if (params.rsi_below) queryParams.append('rsi_below', params.rsi_below.toString());
  if (params.rsi_above) queryParams.append('rsi_above', params.rsi_above.toString());
  if (params.trend) queryParams.append('trend', params.trend);
  if (params.sector) queryParams.append('sector', params.sector);
  queryParams.append('sort_by', params.sort_by);
  queryParams.append('sort_order', params.sort_order);
  queryParams.append('limit', params.limit.toString());

  const { data } = await apiClient.get<ScreenerResult[]>(`/analysis/screener?${queryParams}`);
  return data;
};

const fetchSectors = async (): Promise<{ sector: string; count: number }[]> => {
  const { data } = await apiClient.get('/analysis/sp500/sectors');
  return data.sectors;
};

const TrendIcon: React.FC<{ trend: string }> = ({ trend }) => {
  if (trend === 'bullish') return <TrendingUp sx={{ color: '#00E676' }} />;
  if (trend === 'bearish') return <TrendingDown sx={{ color: '#FF5252' }} />;
  return <TrendingFlat sx={{ color: '#888' }} />;
};

const formatVolume = (volume: number): string => {
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
  return volume.toString();
};

interface StockScreenerProps {
  onSelectStock?: (symbol: string) => void;
}

const StockScreener: React.FC<StockScreenerProps> = ({ onSelectStock }) => {
  const [params, setParams] = useState<ScreenerParams>({
    sort_by: 'change_pct',
    sort_order: 'desc',
    limit: 50,
  });
  const [rsiRange, setRsiRange] = useState<number[]>([0, 100]);
  const [selectedTrend, setSelectedTrend] = useState<string>('');
  const [selectedSector, setSelectedSector] = useState<string>('');

  const { data: sectors } = useQuery({
    queryKey: ['sp500Sectors'],
    queryFn: fetchSectors,
    staleTime: 300000,
  });

  const { data: results, isLoading, error, refetch } = useQuery({
    queryKey: ['screener', params],
    queryFn: () => fetchScreenerResults(params),
    staleTime: 60000,
  });

  const applyFilters = () => {
    const newParams: ScreenerParams = {
      ...params,
    };
    if (rsiRange[0] > 0) newParams.rsi_above = rsiRange[0];
    if (rsiRange[1] < 100) newParams.rsi_below = rsiRange[1];
    if (selectedTrend) newParams.trend = selectedTrend;
    if (selectedSector) newParams.sector = selectedSector;
    setParams(newParams);
  };

  const resetFilters = () => {
    setRsiRange([0, 100]);
    setSelectedTrend('');
    setSelectedSector('');
    setParams({
      sort_by: 'change_pct',
      sort_order: 'desc',
      limit: 50,
    });
  };

  const presetFilters = {
    oversold: () => {
      setRsiRange([0, 30]);
      setSelectedTrend('');
      applyFilters();
    },
    overbought: () => {
      setRsiRange([70, 100]);
      setSelectedTrend('');
      applyFilters();
    },
    bullish: () => {
      setSelectedTrend('bullish');
      setRsiRange([0, 100]);
      applyFilters();
    },
    bearish: () => {
      setSelectedTrend('bearish');
      setRsiRange([0, 100]);
      applyFilters();
    },
  };

  return (
    <Paper
      sx={{
        p: 2,
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight="bold" color="#fff">
          <FilterList sx={{ mr: 1, verticalAlign: 'middle' }} />
          Stock Screener
        </Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh">
            <IconButton onClick={() => refetch()} size="small" sx={{ color: '#888' }}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Filters */}
      <Box mb={2}>
        {/* Preset buttons */}
        <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
          <Chip
            label="Oversold (RSI < 30)"
            onClick={() => {
              setRsiRange([0, 30]);
              setParams(prev => ({ ...prev, rsi_below: 30, rsi_above: undefined }));
            }}
            sx={{ bgcolor: 'rgba(0, 200, 83, 0.2)', color: '#00E676' }}
          />
          <Chip
            label="Overbought (RSI > 70)"
            onClick={() => {
              setRsiRange([70, 100]);
              setParams(prev => ({ ...prev, rsi_above: 70, rsi_below: undefined }));
            }}
            sx={{ bgcolor: 'rgba(244, 67, 54, 0.2)', color: '#FF5252' }}
          />
          <Chip
            label="Bullish Trend"
            onClick={() => {
              setSelectedTrend('bullish');
              setParams(prev => ({ ...prev, trend: 'bullish' }));
            }}
            sx={{ bgcolor: 'rgba(0, 200, 83, 0.2)', color: '#00E676' }}
          />
          <Chip
            label="Bearish Trend"
            onClick={() => {
              setSelectedTrend('bearish');
              setParams(prev => ({ ...prev, trend: 'bearish' }));
            }}
            sx={{ bgcolor: 'rgba(244, 67, 54, 0.2)', color: '#FF5252' }}
          />
          <Chip label="Reset" onClick={resetFilters} variant="outlined" sx={{ color: '#888' }} />
        </Stack>

        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          {/* RSI Range */}
          <Box sx={{ width: 200 }}>
            <Typography variant="caption" color="text.secondary">
              RSI Range: {rsiRange[0]} - {rsiRange[1]}
            </Typography>
            <Slider
              value={rsiRange}
              onChange={(_, value) => setRsiRange(value as number[])}
              onChangeCommitted={() => {
                const newParams = { ...params };
                if (rsiRange[0] > 0) newParams.rsi_above = rsiRange[0];
                else delete newParams.rsi_above;
                if (rsiRange[1] < 100) newParams.rsi_below = rsiRange[1];
                else delete newParams.rsi_below;
                setParams(newParams);
              }}
              min={0}
              max={100}
              size="small"
              sx={{ color: '#7E57C2' }}
            />
          </Box>

          {/* Sector filter */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel sx={{ color: '#888' }}>Sector</InputLabel>
            <Select
              value={selectedSector}
              onChange={e => {
                setSelectedSector(e.target.value);
                const newParams = { ...params };
                if (e.target.value) newParams.sector = e.target.value;
                else delete newParams.sector;
                setParams(newParams);
              }}
              label="Sector"
              sx={{ color: '#fff' }}
            >
              <MenuItem value="">All Sectors</MenuItem>
              {sectors?.map(s => (
                <MenuItem key={s.sector} value={s.sector}>
                  {s.sector} ({s.count})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Sort */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel sx={{ color: '#888' }}>Sort By</InputLabel>
            <Select
              value={params.sort_by}
              onChange={e => setParams(prev => ({ ...prev, sort_by: e.target.value }))}
              label="Sort By"
              sx={{ color: '#fff' }}
            >
              <MenuItem value="change_pct">Change %</MenuItem>
              <MenuItem value="volume">Volume</MenuItem>
              <MenuItem value="rsi_14">RSI</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel sx={{ color: '#888' }}>Order</InputLabel>
            <Select
              value={params.sort_order}
              onChange={e => setParams(prev => ({ ...prev, sort_order: e.target.value }))}
              label="Order"
              sx={{ color: '#fff' }}
            >
              <MenuItem value="desc">Desc</MenuItem>
              <MenuItem value="asc">Asc</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Box>

      {/* Results */}
      {isLoading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress sx={{ color: '#00E676' }} />
        </Box>
      ) : error ? (
        <Alert severity="error">Failed to load screener results</Alert>
      ) : (
        <TableContainer sx={{ maxHeight: 500 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ bgcolor: '#1a1a2e', color: '#888' }}>Symbol</TableCell>
                <TableCell sx={{ bgcolor: '#1a1a2e', color: '#888' }}>Name</TableCell>
                <TableCell sx={{ bgcolor: '#1a1a2e', color: '#888' }}>Sector</TableCell>
                <TableCell align="right" sx={{ bgcolor: '#1a1a2e', color: '#888' }}>
                  Price
                </TableCell>
                <TableCell align="right" sx={{ bgcolor: '#1a1a2e', color: '#888' }}>
                  Change
                </TableCell>
                <TableCell align="right" sx={{ bgcolor: '#1a1a2e', color: '#888' }}>
                  RSI
                </TableCell>
                <TableCell align="right" sx={{ bgcolor: '#1a1a2e', color: '#888' }}>
                  Volume
                </TableCell>
                <TableCell align="center" sx={{ bgcolor: '#1a1a2e', color: '#888' }}>
                  Trend
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results?.map(stock => (
                <TableRow
                  key={stock.symbol}
                  hover
                  onClick={() => onSelectStock?.(stock.symbol)}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
                  }}
                >
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>{stock.symbol}</TableCell>
                  <TableCell sx={{ color: '#aaa', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {stock.name || '-'}
                  </TableCell>
                  <TableCell sx={{ color: '#888' }}>{stock.sector || '-'}</TableCell>
                  <TableCell align="right" sx={{ color: '#fff' }}>
                    ${stock.price.toFixed(2)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color: stock.change_pct && stock.change_pct >= 0 ? '#00E676' : '#FF5252',
                      fontWeight: 'bold',
                    }}
                  >
                    {stock.change_pct !== null
                      ? `${stock.change_pct >= 0 ? '+' : ''}${stock.change_pct.toFixed(2)}%`
                      : '-'}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color:
                        stock.rsi_14 !== null
                          ? stock.rsi_14 < 30
                            ? '#00E676'
                            : stock.rsi_14 > 70
                            ? '#FF5252'
                            : '#888'
                          : '#888',
                    }}
                  >
                    {stock.rsi_14?.toFixed(1) || '-'}
                  </TableCell>
                  <TableCell align="right" sx={{ color: '#888' }}>
                    {formatVolume(stock.volume)}
                  </TableCell>
                  <TableCell align="center">
                    <TrendIcon trend={stock.trend} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Showing {results?.length || 0} stocks
      </Typography>
    </Paper>
  );
};

export default StockScreener;
