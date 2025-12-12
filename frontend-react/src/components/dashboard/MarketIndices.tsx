import React, { useEffect, useRef } from 'react';
import { Paper, Typography, Box, Grid, CircularProgress, Alert, Chip } from '@mui/material';
import * as echarts from 'echarts';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface IndexData {
  symbol: string;
  name: string;
  value: number;
  change: number | null;
  change_pct: number | null;
}

interface MarketIndicesResponse {
  indices: IndexData[];
  updated_at: string;
}

const fetchMarketIndices = async (): Promise<MarketIndicesResponse> => {
  const { data } = await axios.get<MarketIndicesResponse>('/api/market/indices');
  return data;
};

interface SparklineProps {
  data: number[];
  color: string;
  height?: number;
}

const Sparkline: React.FC<SparklineProps> = ({ data, color, height = 60 }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current);
    }

    const chart = chartInstanceRef.current;

    const option: echarts.EChartsOption = {
      grid: {
        left: 0,
        right: 0,
        top: 5,
        bottom: 5,
      },
      xAxis: {
        type: 'category',
        show: false,
        data: data.map((_, i) => i),
      },
      yAxis: {
        type: 'value',
        show: false,
      },
      series: [
        {
          type: 'line',
          data,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color,
            width: 2,
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: `${color}40` },
              { offset: 1, color: `${color}00` },
            ]),
          },
        },
      ],
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [data, color]);

  useEffect(() => {
    return () => {
      chartInstanceRef.current?.dispose();
    };
  }, []);

  return <Box ref={chartRef} sx={{ width: '100%', height }} />;
};

const MarketIndices: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['marketIndices'],
    queryFn: fetchMarketIndices,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Generate mock historical data for sparklines (in production, fetch from API)
  const generateSparklineData = (currentValue: number, change: number | null): number[] => {
    const points = 20;
    const data: number[] = [];
    const changePerPoint = (change || 0) / points;

    for (let i = 0; i < points; i++) {
      data.push(currentValue - (change || 0) + changePerPoint * i + Math.random() * 5 - 2.5);
    }
    data.push(currentValue);

    return data;
  };

  if (isLoading) {
    return (
      <Paper sx={{ p: 3, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Paper>
    );
  }

  if (error || !data) {
    return (
      <Paper sx={{ p: 3, height: 200 }}>
        <Alert severity="error">Failed to load market indices</Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Market Indices
      </Typography>
      <Grid container spacing={2}>
        {data.indices.map((index) => {
          // Convert string values to numbers
          const indexValue = typeof index.value === 'string' ? parseFloat(index.value) : index.value;
          const indexChange = index.change !== null ? (typeof index.change === 'string' ? parseFloat(index.change) : index.change) : null;
          const indexChangePct = index.change_pct !== null ? (typeof index.change_pct === 'string' ? parseFloat(index.change_pct) : index.change_pct) : null;

          const isPositive = (indexChangePct || 0) >= 0;
          const color = isPositive ? '#22c55e' : '#ef4444';
          const sparklineData = generateSparklineData(indexValue, indexChange);

          return (
            <Grid item xs={12} sm={6} md={3} key={index.symbol}>
              <Box
                sx={{
                  p: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  height: '100%',
                }}
              >
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  {index.name}
                </Typography>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  {indexValue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {indexChange !== null && (
                    <Typography
                      variant="body2"
                      color={isPositive ? 'success.main' : 'error.main'}
                      fontWeight="medium"
                    >
                      {isPositive ? '+' : ''}
                      {indexChange.toFixed(2)}
                    </Typography>
                  )}
                  {indexChangePct !== null && (
                    <Chip
                      label={`${isPositive ? '+' : ''}${indexChangePct.toFixed(2)}%`}
                      size="small"
                      color={isPositive ? 'success' : 'error'}
                      sx={{ height: 20, fontSize: '0.75rem' }}
                    />
                  )}
                </Box>
                <Sparkline data={sparklineData} color={color} height={50} />
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Paper>
  );
};

export default MarketIndices;
