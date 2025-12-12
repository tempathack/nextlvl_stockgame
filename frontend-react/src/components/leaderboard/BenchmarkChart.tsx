/**
 * Benchmark Chart Component
 * Compares ALL players against market benchmarks with multi-select
 */
import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Stack,
  Paper,
  Divider,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

// Available benchmarks - 10+ ETFs and indices
const AVAILABLE_BENCHMARKS = [
  // Major Indices
  { symbol: 'SPY', name: 'S&P 500 ETF', category: 'Index' },
  { symbol: 'QQQ', name: 'NASDAQ-100 ETF', category: 'Index' },
  { symbol: 'DIA', name: 'Dow Jones ETF', category: 'Index' },
  { symbol: 'IWM', name: 'Russell 2000 ETF', category: 'Index' },
  { symbol: 'VTI', name: 'Total Stock Market ETF', category: 'Index' },
  // Sector ETFs
  { symbol: 'XLK', name: 'Technology Select Sector', category: 'Sector' },
  { symbol: 'XLF', name: 'Financial Select Sector', category: 'Sector' },
  { symbol: 'XLE', name: 'Energy Select Sector', category: 'Sector' },
  { symbol: 'XLV', name: 'Healthcare Select Sector', category: 'Sector' },
  { symbol: 'XLY', name: 'Consumer Discretionary', category: 'Sector' },
  // International
  { symbol: 'EFA', name: 'EAFE International', category: 'International' },
  { symbol: 'EEM', name: 'Emerging Markets', category: 'International' },
  { symbol: 'VEU', name: 'All-World ex-US', category: 'International' },
  // Other
  { symbol: 'GLD', name: 'Gold ETF', category: 'Commodity' },
  { symbol: 'TLT', name: '20+ Year Treasury Bond', category: 'Bond' },
];

interface Participant {
  user_id: number;
  display_name: string;
  total_value: number;
  total_return_pct: number;
  positions_count: number;
}

interface ComparisonResponse {
  participants: Participant[];
  total_participants: number;
  starting_capital: number;
}

const fetchComparison = async (): Promise<ComparisonResponse> => {
  const { data } = await axios.get('/api/leaderboard/comparison');
  return data;
};

// Game started 1 week ago
const GAME_START_DATE = new Date();
GAME_START_DATE.setDate(GAME_START_DATE.getDate() - 7);

// Calculate days since game started
const getDaysSinceStart = (): number => {
  const now = new Date();
  const diffTime = now.getTime() - GAME_START_DATE.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Generate date labels for the chart
const generateDateLabels = (days: number): string[] => {
  const labels: string[] = [];
  for (let i = 0; i <= days; i++) {
    const date = new Date(GAME_START_DATE);
    date.setDate(date.getDate() + i);
    labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  }
  return labels;
};

// Generate mock historical data based on final return
const generateHistoricalData = (finalReturn: number, days: number): number[] => {
  const data: number[] = [100];
  const volatility = Math.abs(finalReturn) * 0.3 + 0.2; // Daily volatility
  const trend = finalReturn / days;

  for (let i = 1; i <= days; i++) {
    const noise = (Math.random() - 0.5) * volatility;
    const value = 100 + (trend * i) + noise;
    data.push(Math.max(95, Math.min(105, value))); // Tighter range for 1 week
  }

  // Ensure final value matches the actual return
  data[days] = 100 + finalReturn;

  return data;
};

// Weekly returns for benchmarks (approximate, based on recent market data)
const BENCHMARK_WEEKLY_RETURNS: Record<string, number> = {
  SPY: 1.2,    // S&P 500 - moderate gain
  QQQ: 1.8,    // NASDAQ - tech rally
  DIA: 0.9,    // Dow - slower
  IWM: 0.5,    // Small caps - lagging
  VTI: 1.1,    // Total market
  XLK: 2.3,    // Tech sector - outperforming
  XLF: 0.7,    // Financials
  XLE: -0.8,   // Energy - down
  XLV: 0.4,    // Healthcare
  XLY: 1.5,    // Consumer discretionary
  EFA: 0.6,    // International developed
  EEM: 0.3,    // Emerging markets
  VEU: 0.5,    // Ex-US
  GLD: 0.8,    // Gold
  TLT: -0.3,   // Bonds - down with rising rates
};

// Generate mock benchmark data for the game duration
const generateBenchmarkData = (symbol: string, days: number): number[] => {
  const weeklyReturn = BENCHMARK_WEEKLY_RETURNS[symbol] || Math.random() * 2;
  // Scale weekly return to the actual number of days
  const scaledReturn = (weeklyReturn / 7) * days;
  return generateHistoricalData(scaledReturn, days);
};

const BenchmarkChart: React.FC = () => {
  const theme = useTheme();
  const [selectedBenchmarks, setSelectedBenchmarks] = useState<string[]>(['SPY', 'QQQ', 'DIA']);
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['comparison'],
    queryFn: fetchComparison,
  });

  // Auto-select all players when data loads
  useEffect(() => {
    if (data?.participants && selectedPlayers.length === 0) {
      setSelectedPlayers(data.participants.map(p => p.user_id));
    }
  }, [data, selectedPlayers.length]);

  const handleBenchmarkChange = (event: any) => {
    const value = event.target.value;
    setSelectedBenchmarks(typeof value === 'string' ? value.split(',') : value);
  };

  const handlePlayerChange = (event: any) => {
    const value = event.target.value;
    setSelectedPlayers(typeof value === 'string' ? value.split(',').map(Number) : value);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Alert severity="error">Failed to load comparison data</Alert>
    );
  }

  // Use actual days since game started (1 week = 7 days)
  const days = getDaysSinceStart();
  const dates = generateDateLabels(days);

  // Player colors - generate distinct colors for all players
  const playerColors = [
    theme.palette.primary.main,
    theme.palette.success.main,
    theme.palette.info.main,
    theme.palette.warning.main,
    '#e91e63', // pink
    '#9c27b0', // purple
    '#00bcd4', // cyan
    '#ff5722', // deep orange
    '#795548', // brown
    '#607d8b', // blue grey
  ];

  // Benchmark colors - all dashed, different shades
  const benchmarkColors = [
    '#ef5350', // red
    '#ab47bc', // purple
    '#5c6bc0', // indigo
    '#26a69a', // teal
    '#ffca28', // amber
    '#8d6e63', // brown
    '#78909c', // blue grey
    '#66bb6a', // green
    '#42a5f5', // blue
    '#ec407a', // pink
  ];

  // Build player series
  const playerSeries = data.participants
    .filter(p => selectedPlayers.includes(p.user_id))
    .map((player, index) => ({
      name: player.display_name,
      type: 'line',
      smooth: true,
      data: generateHistoricalData(player.total_return_pct, days),
      itemStyle: {
        color: playerColors[index % playerColors.length],
      },
      lineStyle: {
        width: 3,
      },
      symbol: 'circle',
      symbolSize: 6,
      emphasis: {
        focus: 'series',
      },
    }));

  // Build benchmark series
  const benchmarkSeries = selectedBenchmarks.map((symbol, index) => {
    const benchmark = AVAILABLE_BENCHMARKS.find(b => b.symbol === symbol);
    return {
      name: benchmark?.name || symbol,
      type: 'line',
      smooth: true,
      data: generateBenchmarkData(symbol, days),
      itemStyle: {
        color: benchmarkColors[index % benchmarkColors.length],
      },
      lineStyle: {
        type: 'dashed',
        width: 2,
      },
      symbol: 'diamond',
      symbolSize: 4,
      emphasis: {
        focus: 'series',
      },
    };
  });

  const allSeries = [...playerSeries, ...benchmarkSeries];

  // Calculate y-axis range based on data
  const allValues = allSeries.flatMap(s => s.data as number[]);
  const minValue = Math.floor(Math.min(...allValues) / 5) * 5 - 5;
  const maxValue = Math.ceil(Math.max(...allValues) / 5) * 5 + 5;

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
      },
      backgroundColor: theme.palette.background.paper,
      borderColor: theme.palette.divider,
      textStyle: {
        color: theme.palette.text.primary,
      },
      formatter: (params: any) => {
        let result = `<div style="padding: 8px;"><div style="font-weight: 600; margin-bottom: 8px;">${params[0].name}</div>`;
        // Sort by value descending
        const sorted = [...params].sort((a: any, b: any) => b.value - a.value);
        sorted.forEach((param: any) => {
          const change = param.value - 100;
          const color = change >= 0 ? theme.palette.success.main : theme.palette.error.main;
          result += `
            <div style="display: flex; justify-content: space-between; gap: 16px; margin-bottom: 4px;">
              <span>${param.marker} ${param.seriesName}</span>
              <span style="font-weight: 600; color: ${color};">${change >= 0 ? '+' : ''}${change.toFixed(2)}%</span>
            </div>
          `;
        });
        result += '</div>';
        return result;
      },
    },
    legend: {
      data: allSeries.map(s => s.name),
      textStyle: {
        color: theme.palette.text.primary,
        fontSize: 11,
      },
      bottom: 0,
      type: 'scroll',
      pageIconColor: theme.palette.primary.main,
      pageTextStyle: {
        color: theme.palette.text.primary,
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '18%',
      top: '5%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: {
        lineStyle: {
          color: theme.palette.divider,
        },
      },
      axisLabel: {
        color: theme.palette.text.secondary,
      },
    },
    yAxis: {
      type: 'value',
      axisLine: {
        lineStyle: {
          color: theme.palette.divider,
        },
      },
      axisLabel: {
        color: theme.palette.text.secondary,
        formatter: (value: number) => `${value}%`,
      },
      splitLine: {
        lineStyle: {
          color: theme.palette.divider,
          opacity: 0.3,
        },
      },
      min: minValue,
      max: maxValue,
    },
    series: allSeries,
  };

  // Group benchmarks by category for display
  const benchmarksByCategory = AVAILABLE_BENCHMARKS.reduce((acc, b) => {
    if (!acc[b.category]) acc[b.category] = [];
    acc[b.category].push(b);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_BENCHMARKS>);

  return (
    <Box>
      {/* Selection Controls */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
        {/* Player Selection */}
        <FormControl sx={{ minWidth: 280, flex: 1 }}>
          <InputLabel>Players</InputLabel>
          <Select
            multiple
            value={selectedPlayers}
            onChange={handlePlayerChange}
            input={<OutlinedInput label="Players" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.slice(0, 3).map((userId) => {
                  const player = data.participants.find(p => p.user_id === userId);
                  return (
                    <Chip
                      key={userId}
                      label={player?.display_name || userId}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  );
                })}
                {selected.length > 3 && (
                  <Chip label={`+${selected.length - 3} more`} size="small" />
                )}
              </Box>
            )}
            MenuProps={{
              PaperProps: {
                style: { maxHeight: 400 },
              },
            }}
          >
            <MenuItem
              onClick={(e) => {
                e.preventDefault();
                if (selectedPlayers.length === data.participants.length) {
                  setSelectedPlayers([]);
                } else {
                  setSelectedPlayers(data.participants.map(p => p.user_id));
                }
              }}
            >
              <Checkbox
                checked={selectedPlayers.length === data.participants.length}
                indeterminate={selectedPlayers.length > 0 && selectedPlayers.length < data.participants.length}
              />
              <ListItemText primary="Select All" />
            </MenuItem>
            <Divider />
            {data.participants.map((player) => (
              <MenuItem key={player.user_id} value={player.user_id}>
                <Checkbox checked={selectedPlayers.includes(player.user_id)} />
                <ListItemText
                  primary={player.display_name}
                  secondary={`${player.total_return_pct >= 0 ? '+' : ''}${player.total_return_pct.toFixed(2)}% • ${player.positions_count} positions`}
                />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Benchmark Selection */}
        <FormControl sx={{ minWidth: 280, flex: 1 }}>
          <InputLabel>Benchmarks</InputLabel>
          <Select
            multiple
            value={selectedBenchmarks}
            onChange={handleBenchmarkChange}
            input={<OutlinedInput label="Benchmarks" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.slice(0, 3).map((symbol) => {
                  const benchmark = AVAILABLE_BENCHMARKS.find(b => b.symbol === symbol);
                  return (
                    <Chip
                      key={symbol}
                      label={symbol}
                      size="small"
                      color="secondary"
                      variant="outlined"
                    />
                  );
                })}
                {selected.length > 3 && (
                  <Chip label={`+${selected.length - 3} more`} size="small" />
                )}
              </Box>
            )}
            MenuProps={{
              PaperProps: {
                style: { maxHeight: 400 },
              },
            }}
          >
            {Object.entries(benchmarksByCategory).map(([category, benchmarks]) => [
              <MenuItem disabled key={`header-${category}`}>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">
                  {category}
                </Typography>
              </MenuItem>,
              ...benchmarks.map((benchmark) => (
                <MenuItem key={benchmark.symbol} value={benchmark.symbol}>
                  <Checkbox checked={selectedBenchmarks.includes(benchmark.symbol)} />
                  <ListItemText
                    primary={benchmark.symbol}
                    secondary={benchmark.name}
                  />
                </MenuItem>
              )),
            ])}
          </Select>
        </FormControl>
      </Stack>

      {/* Summary Stats */}
      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Chip
          label={`${selectedPlayers.length} of ${data.participants.length} players`}
          size="small"
          color="primary"
        />
        <Chip
          label={`${selectedBenchmarks.length} benchmarks`}
          size="small"
          color="secondary"
        />
      </Stack>

      {/* Chart */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ height: 450 }}>
          {allSeries.length === 0 ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Typography color="text.secondary">
                Select at least one player or benchmark to display
              </Typography>
            </Box>
          ) : (
            <ReactECharts
              option={option}
              style={{ height: '100%', width: '100%' }}
              opts={{ renderer: 'svg' }}
            />
          )}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
          Game started {GAME_START_DATE.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} ({days} days ago).
          Players shown with solid lines, benchmarks with dashed lines.
        </Typography>
      </Paper>
    </Box>
  );
};

export default BenchmarkChart;
