/**
 * Advanced Stock Chart with Technical Indicators
 * Uses ECharts for candlestick and indicator visualization
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Stack,
  Chip,
} from '@mui/material';
import * as echarts from 'echarts';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

interface DailyData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change_pct: number | null;
  sma_20: number | null;
  sma_50: number | null;
  sma_200: number | null;
  rsi_14: number | null;
  macd: number | null;
  macd_signal: number | null;
  macd_histogram: number | null;
  bollinger_upper: number | null;
  bollinger_middle: number | null;
  bollinger_lower: number | null;
}

interface StockChartProps {
  symbol: string;
}

const fetchDailyData = async (symbol: string, days: number): Promise<DailyData[]> => {
  const { data } = await apiClient.get<DailyData[]>(`/analysis/daily/${symbol}?days=${days}`);
  return data;
};

const StockChart: React.FC<StockChartProps> = ({ symbol }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const [timeRange, setTimeRange] = useState<number>(90);
  const [indicators, setIndicators] = useState({
    sma20: true,
    sma50: true,
    sma200: false,
    bollinger: false,
    volume: true,
    rsi: true,
    macd: false,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['stockDaily', symbol, timeRange],
    queryFn: () => fetchDailyData(symbol, timeRange),
    enabled: !!symbol,
    staleTime: 60000,
  });

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    // Ensure we always have a live instance bound to the current DOM node
    if (!chartInstanceRef.current || chartInstanceRef.current.getDom() !== chartRef.current) {
      chartInstanceRef.current?.dispose();
      chartInstanceRef.current = echarts.init(chartRef.current, 'dark');
    }

    const chart = chartInstanceRef.current;

    // Prepare data
    const dates = data.map(d => d.date);
    const ohlc = data.map(d => [d.open, d.close, d.low, d.high]);
    const volumes = data.map(d => d.volume);
    const sma20 = data.map(d => d.sma_20);
    const sma50 = data.map(d => d.sma_50);
    const sma200 = data.map(d => d.sma_200);
    const bollingerUpper = data.map(d => d.bollinger_upper);
    const bollingerLower = data.map(d => d.bollinger_lower);
    const rsi = data.map(d => d.rsi_14);
    const macd = data.map(d => d.macd);
    const macdSignal = data.map(d => d.macd_signal);
    const macdHist = data.map(d => d.macd_histogram);

    // Calculate grid heights based on enabled indicators
    let mainHeight = 60;
    let volumeHeight = indicators.volume ? 15 : 0;
    let rsiHeight = indicators.rsi ? 12 : 0;
    let macdHeight = indicators.macd ? 13 : 0;

    const grids: any[] = [
      { left: '8%', right: '3%', top: '5%', height: `${mainHeight}%` },
    ];
    const xAxes: any[] = [{ type: 'category', data: dates, gridIndex: 0, axisLabel: { show: false } }];
    const yAxes: any[] = [{ scale: true, gridIndex: 0, splitArea: { show: true } }];
    const series: any[] = [];
    let currentTop = 5 + mainHeight + 2;

    // Main candlestick chart
    series.push({
      type: 'candlestick',
      data: ohlc,
      xAxisIndex: 0,
      yAxisIndex: 0,
      itemStyle: {
        color: '#00E676',
        color0: '#FF5252',
        borderColor: '#00E676',
        borderColor0: '#FF5252',
      },
    });

    // SMA lines on main chart
    if (indicators.sma20) {
      series.push({
        name: 'SMA 20',
        type: 'line',
        data: sma20,
        xAxisIndex: 0,
        yAxisIndex: 0,
        smooth: true,
        lineStyle: { width: 1.5, color: '#42A5F5' },
        showSymbol: false,
      });
    }
    if (indicators.sma50) {
      series.push({
        name: 'SMA 50',
        type: 'line',
        data: sma50,
        xAxisIndex: 0,
        yAxisIndex: 0,
        smooth: true,
        lineStyle: { width: 1.5, color: '#FFA726' },
        showSymbol: false,
      });
    }
    if (indicators.sma200) {
      series.push({
        name: 'SMA 200',
        type: 'line',
        data: sma200,
        xAxisIndex: 0,
        yAxisIndex: 0,
        smooth: true,
        lineStyle: { width: 2, color: '#AB47BC' },
        showSymbol: false,
      });
    }

    // Bollinger Bands
    if (indicators.bollinger) {
      series.push({
        name: 'BB Upper',
        type: 'line',
        data: bollingerUpper,
        xAxisIndex: 0,
        yAxisIndex: 0,
        lineStyle: { width: 1, color: 'rgba(255, 255, 255, 0.3)', type: 'dashed' },
        showSymbol: false,
      });
      series.push({
        name: 'BB Lower',
        type: 'line',
        data: bollingerLower,
        xAxisIndex: 0,
        yAxisIndex: 0,
        lineStyle: { width: 1, color: 'rgba(255, 255, 255, 0.3)', type: 'dashed' },
        showSymbol: false,
      });
    }

    // Volume chart
    if (indicators.volume) {
      grids.push({ left: '8%', right: '3%', top: `${currentTop}%`, height: `${volumeHeight}%` });
      xAxes.push({ type: 'category', data: dates, gridIndex: grids.length - 1, axisLabel: { show: false } });
      yAxes.push({ scale: true, gridIndex: grids.length - 1, splitNumber: 2, axisLabel: { show: false } });
      series.push({
        name: 'Volume',
        type: 'bar',
        data: volumes.map((v, i) => ({
          value: v,
          itemStyle: {
            color: data[i].close >= data[i].open ? 'rgba(0, 230, 118, 0.5)' : 'rgba(255, 82, 82, 0.5)',
          },
        })),
        xAxisIndex: grids.length - 1,
        yAxisIndex: grids.length - 1,
      });
      currentTop += volumeHeight + 2;
    }

    // RSI chart
    if (indicators.rsi) {
      grids.push({ left: '8%', right: '3%', top: `${currentTop}%`, height: `${rsiHeight}%` });
      xAxes.push({ type: 'category', data: dates, gridIndex: grids.length - 1, axisLabel: { show: false } });
      yAxes.push({
        scale: true,
        gridIndex: grids.length - 1,
        min: 0,
        max: 100,
        splitNumber: 2,
        axisLabel: { fontSize: 10 },
      });
      series.push({
        name: 'RSI',
        type: 'line',
        data: rsi,
        xAxisIndex: grids.length - 1,
        yAxisIndex: grids.length - 1,
        lineStyle: { width: 1.5, color: '#7E57C2' },
        showSymbol: false,
        markLine: {
          silent: true,
          data: [
            { yAxis: 70, lineStyle: { color: 'rgba(255, 82, 82, 0.5)', type: 'dashed' } },
            { yAxis: 30, lineStyle: { color: 'rgba(0, 230, 118, 0.5)', type: 'dashed' } },
          ],
        },
      });
      currentTop += rsiHeight + 2;
    }

    // MACD chart
    if (indicators.macd) {
      grids.push({ left: '8%', right: '3%', top: `${currentTop}%`, height: `${macdHeight}%` });
      xAxes.push({ type: 'category', data: dates, gridIndex: grids.length - 1 });
      yAxes.push({ scale: true, gridIndex: grids.length - 1, splitNumber: 2, axisLabel: { fontSize: 10 } });

      series.push({
        name: 'MACD',
        type: 'line',
        data: macd,
        xAxisIndex: grids.length - 1,
        yAxisIndex: grids.length - 1,
        lineStyle: { width: 1, color: '#42A5F5' },
        showSymbol: false,
      });
      series.push({
        name: 'Signal',
        type: 'line',
        data: macdSignal,
        xAxisIndex: grids.length - 1,
        yAxisIndex: grids.length - 1,
        lineStyle: { width: 1, color: '#FFA726' },
        showSymbol: false,
      });
      series.push({
        name: 'Histogram',
        type: 'bar',
        data: macdHist.map(v => ({
          value: v,
          itemStyle: { color: v && v >= 0 ? '#00E676' : '#FF5252' },
        })),
        xAxisIndex: grids.length - 1,
        yAxisIndex: grids.length - 1,
      });
    }

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      animation: false,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: 'rgba(20, 20, 35, 0.95)',
        borderColor: '#444',
        textStyle: { color: '#fff', fontSize: 12 },
      },
      legend: {
        data: ['SMA 20', 'SMA 50', 'SMA 200', 'RSI', 'MACD', 'Signal'],
        top: 0,
        textStyle: { color: '#888', fontSize: 11 },
        itemWidth: 15,
        itemHeight: 10,
      },
      axisPointer: {
        link: [{ xAxisIndex: 'all' }],
      },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: xAxes.map((_, i) => i),
          start: 70,
          end: 100,
        },
        {
          type: 'slider',
          xAxisIndex: xAxes.map((_, i) => i),
          start: 70,
          end: 100,
          height: 20,
          bottom: 5,
          borderColor: '#444',
          backgroundColor: '#1a1a2e',
          fillerColor: 'rgba(100, 100, 150, 0.3)',
          textStyle: { color: '#888' },
        },
      ],
      grid: grids,
      xAxis: xAxes,
      yAxis: yAxes,
      series: series,
    };

    chart.clear();
    chart.setOption(option, true);
    chart.resize();

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [data, indicators, symbol]);

  useEffect(() => {
    return () => {
      chartInstanceRef.current?.dispose();
    };
  }, []);

  if (isLoading) {
    return (
      <Paper sx={{ p: 3, height: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: '#00E676' }} />
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3, height: 600 }}>
        <Alert severity="error">Failed to load chart data for {symbol}</Alert>
      </Paper>
    );
  }

  // Get latest data for summary
  const latest = data?.[data.length - 1];
  const prevClose = data?.[data.length - 2]?.close;

  return (
    <Paper
      sx={{
        p: 2,
        height: 650,
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      }}
    >
      {/* Header with price info */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
        <Box>
          <Typography variant="h5" fontWeight="bold" color="#fff">
            {symbol}
          </Typography>
          {latest && (
            <Box display="flex" alignItems="baseline" gap={1}>
              <Typography variant="h4" fontWeight="bold" color="#fff">
                ${latest.close.toFixed(2)}
              </Typography>
              {latest.change_pct !== null && (
                <Chip
                  label={`${latest.change_pct >= 0 ? '+' : ''}${latest.change_pct.toFixed(2)}%`}
                  size="small"
                  sx={{
                    bgcolor: latest.change_pct >= 0 ? 'rgba(0, 200, 83, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                    color: latest.change_pct >= 0 ? '#00E676' : '#FF5252',
                    fontWeight: 'bold',
                  }}
                />
              )}
            </Box>
          )}
        </Box>

        {/* Time range selector */}
        <Stack direction="row" spacing={2} alignItems="center">
          <ToggleButtonGroup
            value={timeRange}
            exclusive
            onChange={(_, value) => value && setTimeRange(value)}
            size="small"
          >
            <ToggleButton value={30}>1M</ToggleButton>
            <ToggleButton value={90}>3M</ToggleButton>
            <ToggleButton value={180}>6M</ToggleButton>
            <ToggleButton value={365}>1Y</ToggleButton>
            <ToggleButton value={730}>2Y</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Box>

      {/* Indicator toggles */}
      <Box display="flex" gap={2} mb={1} flexWrap="wrap">
        <FormControlLabel
          control={
            <Checkbox
              checked={indicators.sma20}
              onChange={e => setIndicators(prev => ({ ...prev, sma20: e.target.checked }))}
              size="small"
              sx={{ color: '#42A5F5', '&.Mui-checked': { color: '#42A5F5' } }}
            />
          }
          label={<Typography variant="caption" sx={{ color: '#42A5F5' }}>SMA 20</Typography>}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={indicators.sma50}
              onChange={e => setIndicators(prev => ({ ...prev, sma50: e.target.checked }))}
              size="small"
              sx={{ color: '#FFA726', '&.Mui-checked': { color: '#FFA726' } }}
            />
          }
          label={<Typography variant="caption" sx={{ color: '#FFA726' }}>SMA 50</Typography>}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={indicators.sma200}
              onChange={e => setIndicators(prev => ({ ...prev, sma200: e.target.checked }))}
              size="small"
              sx={{ color: '#AB47BC', '&.Mui-checked': { color: '#AB47BC' } }}
            />
          }
          label={<Typography variant="caption" sx={{ color: '#AB47BC' }}>SMA 200</Typography>}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={indicators.bollinger}
              onChange={e => setIndicators(prev => ({ ...prev, bollinger: e.target.checked }))}
              size="small"
            />
          }
          label={<Typography variant="caption" color="text.secondary">Bollinger</Typography>}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={indicators.volume}
              onChange={e => setIndicators(prev => ({ ...prev, volume: e.target.checked }))}
              size="small"
            />
          }
          label={<Typography variant="caption" color="text.secondary">Volume</Typography>}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={indicators.rsi}
              onChange={e => setIndicators(prev => ({ ...prev, rsi: e.target.checked }))}
              size="small"
              sx={{ color: '#7E57C2', '&.Mui-checked': { color: '#7E57C2' } }}
            />
          }
          label={<Typography variant="caption" sx={{ color: '#7E57C2' }}>RSI</Typography>}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={indicators.macd}
              onChange={e => setIndicators(prev => ({ ...prev, macd: e.target.checked }))}
              size="small"
            />
          }
          label={<Typography variant="caption" color="text.secondary">MACD</Typography>}
        />
      </Box>

      {/* Chart */}
      <Box ref={chartRef} sx={{ width: '100%', height: 'calc(100% - 120px)' }} />
    </Paper>
  );
};

export default StockChart;
