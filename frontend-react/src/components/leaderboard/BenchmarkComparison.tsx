import React, { useEffect, useRef } from 'react';
import {
  Paper,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import * as echarts from 'echarts';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface BenchmarkPerformance {
  symbol: string;
  name: string;
  current_value: number;
  change_pct: number;
  ytd_return: number | null;
}

interface BenchmarksResponse {
  benchmarks: BenchmarkPerformance[];
  updated_at: string;
}

interface PortfolioHistory {
  date: string;
  portfolio_value: number;
  portfolio_return_pct: number;
  benchmark_values: Record<string, number>;
  benchmark_returns: Record<string, number>;
}

interface PortfolioBenchmarkComparisonResponse {
  portfolio_id: number;
  portfolio_name: string;
  starting_value: number;
  current_value: number;
  total_return_pct: number;
  history: PortfolioHistory[];
  benchmark_symbols: string[];
}

interface BenchmarkComparisonProps {
  portfolioId: number;
}

const fetchBenchmarks = async (): Promise<BenchmarksResponse> => {
  const { data } = await axios.get<BenchmarksResponse>('/api/benchmarks');
  return data;
};

const fetchPortfolioBenchmarkComparison = async (
  portfolioId: number
): Promise<PortfolioBenchmarkComparisonResponse> => {
  const { data } = await axios.get<PortfolioBenchmarkComparisonResponse>(
    `/api/benchmarks/compare/${portfolioId}`
  );
  return data;
};

const BenchmarkComparison: React.FC<BenchmarkComparisonProps> = ({ portfolioId }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const [selectedBenchmarks, setSelectedBenchmarks] = React.useState<string[]>([
    '^GSPC',
    '^IXIC',
    'SPY',
  ]);

  const { data: benchmarks, isLoading: loadingBenchmarks } = useQuery({
    queryKey: ['benchmarks'],
    queryFn: fetchBenchmarks,
  });

  const { data: comparison, isLoading: loadingComparison } = useQuery({
    queryKey: ['portfolioBenchmarkComparison', portfolioId],
    queryFn: () => fetchPortfolioBenchmarkComparison(portfolioId),
  });

  useEffect(() => {
    if (!chartRef.current || !comparison) return;

    // Initialize chart
    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current);
    }

    const chart = chartInstanceRef.current;

    // Generate mock time series data (in production, use actual historical data)
    const generateMockTimeSeries = (
      currentReturn: number,
      points: number = 30
    ): number[] => {
      const data: number[] = [100]; // Start at 100
      const targetValue = 100 + currentReturn;
      const step = (targetValue - 100) / points;

      for (let i = 1; i <= points; i++) {
        const value = data[i - 1] + step + (Math.random() - 0.5) * 2;
        data.push(value);
      }

      return data;
    };

    // Generate dates
    const dates = Array.from({ length: 31 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (30 - i));
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    // Portfolio series
    const portfolioData = generateMockTimeSeries(comparison.total_return_pct);

    // Benchmark series
    const series: any[] = [
      {
        name: 'Your Portfolio',
        type: 'line',
        data: portfolioData,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 3,
          color: '#3b82f6',
        },
        itemStyle: {
          color: '#3b82f6',
        },
        emphasis: {
          focus: 'series',
        },
      },
    ];

    // Add selected benchmarks
    const benchmarkColors = ['#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    selectedBenchmarks.forEach((symbol, index) => {
      // Mock benchmark data (in production, fetch actual data)
      const mockReturn = (Math.random() - 0.5) * 20;
      const benchmarkData = generateMockTimeSeries(mockReturn);
      const benchmark = benchmarks?.benchmarks.find((b) => b.symbol === symbol);

      series.push({
        name: benchmark?.name || symbol,
        type: 'line',
        data: benchmarkData,
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: {
          width: 2,
          color: benchmarkColors[index % benchmarkColors.length],
        },
        itemStyle: {
          color: benchmarkColors[index % benchmarkColors.length],
        },
        emphasis: {
          focus: 'series',
        },
      });
    });

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
        },
        formatter: (params: any) => {
          let result = `<strong>${params[0].axisValue}</strong><br/>`;
          params.forEach((param: any) => {
            const value = param.value;
            const returnPct = value - 100;
            result += `
              ${param.marker} ${param.seriesName}:
              ${value.toFixed(2)}
              (${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%)
              <br/>
            `;
          });
          return result;
        },
      },
      legend: {
        data: series.map((s) => s.name),
        top: 10,
        type: 'scroll',
      },
      grid: {
        left: 60,
        right: 40,
        top: 60,
        bottom: 60,
      },
      xAxis: {
        type: 'category',
        data: dates,
        boundaryGap: false,
      },
      yAxis: {
        type: 'value',
        name: 'Indexed Value',
        axisLabel: {
          formatter: '{value}',
        },
        splitLine: {
          lineStyle: {
            type: 'dashed',
          },
        },
      },
      series,
    };

    chart.setOption(option);

    // Handle resize
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [comparison, selectedBenchmarks, benchmarks]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      chartInstanceRef.current?.dispose();
    };
  }, []);

  const handleBenchmarkChange = (event: any) => {
    setSelectedBenchmarks(event.target.value);
  };

  if (loadingBenchmarks || loadingComparison) {
    return (
      <Paper sx={{ p: 3, height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Paper>
    );
  }

  if (!benchmarks || !comparison) {
    return (
      <Paper sx={{ p: 3, height: 500 }}>
        <Alert severity="error">Failed to load benchmark data</Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, height: 500 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="h6" gutterBottom>
            Performance vs Benchmarks
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
            <Chip
              label={`Your Return: ${comparison.total_return_pct >= 0 ? '+' : ''}${comparison.total_return_pct.toFixed(2)}%`}
              color={comparison.total_return_pct >= 0 ? 'success' : 'error'}
            />
          </Box>
        </Box>

        <FormControl sx={{ minWidth: 200 }} size="small">
          <InputLabel>Benchmarks</InputLabel>
          <Select
            multiple
            value={selectedBenchmarks}
            onChange={handleBenchmarkChange}
            label="Benchmarks"
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={value} size="small" />
                ))}
              </Box>
            )}
          >
            {benchmarks.benchmarks.map((benchmark) => (
              <MenuItem key={benchmark.symbol} value={benchmark.symbol}>
                {benchmark.name} ({benchmark.symbol})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box
        ref={chartRef}
        sx={{
          width: '100%',
          height: 'calc(100% - 80px)',
        }}
      />
    </Paper>
  );
};

export default BenchmarkComparison;
