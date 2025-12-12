import React, { useEffect, useRef } from 'react';
import { Paper, Typography, Box, CircularProgress, Alert } from '@mui/material';
import * as echarts from 'echarts';

interface Position {
  symbol: string;
  market_value: number;
  is_short: boolean;
}

interface PortfolioChartProps {
  positions: Position[];
  cashBalance: number;
}

const PortfolioChart: React.FC<PortfolioChartProps> = ({ positions, cashBalance }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart
    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current);
    }

    const chart = chartInstanceRef.current;

    // Prepare data
    const longPositions = positions.filter((p) => !p.is_short);
    const shortPositions = positions.filter((p) => p.is_short);

    // Group small positions into "Other"
    const threshold = 0.02; // 2% threshold
    const totalValue = cashBalance + positions.reduce((sum, p) => sum + Math.abs(p.market_value), 0);

    const groupPositions = (positionList: Position[]) => {
      const sorted = [...positionList].sort((a, b) => b.market_value - a.market_value);
      const large: Position[] = [];
      let otherValue = 0;

      sorted.forEach((pos) => {
        if (pos.market_value / totalValue >= threshold) {
          large.push(pos);
        } else {
          otherValue += pos.market_value;
        }
      });

      return { large, otherValue };
    };

    const { large: largeLong, otherValue: otherLongValue } = groupPositions(longPositions);
    const { large: largeShort, otherValue: otherShortValue } = groupPositions(shortPositions);

    // Build chart data
    const chartData: any[] = [
      {
        name: 'Cash',
        value: cashBalance,
        itemStyle: { color: '#22c55e' },
      },
    ];

    // Add long positions
    largeLong.forEach((pos, index) => {
      chartData.push({
        name: pos.symbol,
        value: pos.market_value,
        itemStyle: {
          color: `hsl(${210 + index * 30}, 70%, 55%)`,
        },
      });
    });

    if (otherLongValue > 0) {
      chartData.push({
        name: 'Other Long',
        value: otherLongValue,
        itemStyle: { color: '#94a3b8' },
      });
    }

    // Add short positions
    largeShort.forEach((pos, index) => {
      chartData.push({
        name: `${pos.symbol} (Short)`,
        value: Math.abs(pos.market_value),
        itemStyle: {
          color: `hsl(${30 + index * 20}, 70%, 55%)`,
        },
      });
    });

    if (otherShortValue > 0) {
      chartData.push({
        name: 'Other Short',
        value: Math.abs(otherShortValue),
        itemStyle: { color: '#fb923c' },
      });
    }

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const percentage = ((params.value / totalValue) * 100).toFixed(2);
          return `
            <strong>${params.name}</strong><br/>
            Value: $${params.value.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}<br/>
            Allocation: ${percentage}%
          `;
        },
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center',
        type: 'scroll',
        pageIconSize: 12,
        itemWidth: 16,
        itemHeight: 16,
        textStyle: {
          fontSize: 12,
        },
      },
      series: [
        {
          name: 'Portfolio Allocation',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 8,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: true,
            formatter: (params: any) => {
              const percentage = ((params.value / totalValue) * 100).toFixed(1);
              return percentage >= 5 ? `{b|${params.name}}\n{per|${percentage}%}` : '';
            },
            rich: {
              b: {
                fontSize: 12,
                fontWeight: 'bold',
                lineHeight: 20,
              },
              per: {
                fontSize: 11,
                color: '#666',
                lineHeight: 18,
              },
            },
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
            },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
          labelLine: {
            show: true,
            length: 15,
            length2: 10,
          },
          data: chartData,
        },
      ],
    };

    chart.setOption(option);

    // Handle resize
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [positions, cashBalance]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      chartInstanceRef.current?.dispose();
    };
  }, []);

  if (positions.length === 0 && cashBalance === 0) {
    return (
      <Paper sx={{ p: 3, height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Paper>
    );
  }

  if (positions.length === 0) {
    return (
      <Paper sx={{ p: 3, height: 400 }}>
        <Typography variant="h6" gutterBottom>
          Portfolio Allocation
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          Your portfolio is 100% cash. Start trading to see allocation breakdown.
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, height: 400 }}>
      <Typography variant="h6" gutterBottom>
        Portfolio Allocation
      </Typography>
      <Box
        ref={chartRef}
        sx={{
          width: '100%',
          height: 'calc(100% - 40px)',
        }}
      />
    </Paper>
  );
};

export default PortfolioChart;
