/**
 * Performance Chart Component
 * Shows portfolio performance over time using ECharts
 */
import React from 'react';
import ReactECharts from 'echarts-for-react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface PerformanceChartProps {
  userId: number;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ userId }) => {
  const theme = useTheme();

  // TODO: Implement actual data fetching from API
  // For now, showing a placeholder chart
  const mockData = {
    dates: ['Day 1', 'Day 30', 'Day 60', 'Day 90', 'Day 120', 'Day 150'],
    portfolio: [100000, 102000, 105000, 103500, 108000, 110000],
    benchmark: [100000, 101000, 103000, 104000, 105000, 106000],
  };

  const option = {
    backgroundColor: 'transparent',
    title: {
      show: false,
    },
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
        const portfolio = params[0];
        const benchmark = params[1];
        return `
          <div style="padding: 8px;">
            <div style="font-weight: 600; margin-bottom: 4px;">${portfolio.name}</div>
            <div>Portfolio: $${portfolio.value.toLocaleString()}</div>
            <div>S&P 500: $${benchmark.value.toLocaleString()}</div>
            <div style="margin-top: 4px; font-size: 12px; color: ${theme.palette.text.secondary};">
              Difference: ${((portfolio.value - benchmark.value) / benchmark.value * 100).toFixed(2)}%
            </div>
          </div>
        `;
      },
    },
    legend: {
      data: ['Portfolio', 'S&P 500'],
      textStyle: {
        color: theme.palette.text.primary,
      },
      bottom: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: mockData.dates,
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
        formatter: (value: number) => `$${(value / 1000).toFixed(0)}k`,
      },
      splitLine: {
        lineStyle: {
          color: theme.palette.divider,
          opacity: 0.3,
        },
      },
    },
    series: [
      {
        name: 'Portfolio',
        type: 'line',
        smooth: true,
        data: mockData.portfolio,
        itemStyle: {
          color: theme.palette.primary.main,
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color: `${theme.palette.primary.main}66`,
              },
              {
                offset: 1,
                color: `${theme.palette.primary.main}00`,
              },
            ],
          },
        },
        emphasis: {
          focus: 'series',
        },
      },
      {
        name: 'S&P 500',
        type: 'line',
        smooth: true,
        data: mockData.benchmark,
        itemStyle: {
          color: theme.palette.secondary.main,
        },
        lineStyle: {
          type: 'dashed',
        },
        emphasis: {
          focus: 'series',
        },
      },
    ],
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ReactECharts
        option={option}
        style={{ height: '100%', width: '100%' }}
        opts={{ renderer: 'svg' }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
        Performance comparison vs S&P 500 benchmark
      </Typography>
    </Box>
  );
};

export default PerformanceChart;
