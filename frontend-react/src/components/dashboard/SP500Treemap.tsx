/**
 * S&P 500 Stock Treemap - Shows all 500 stocks grouped by sector
 * with color indicating performance
 */
import React, { useEffect, useRef } from 'react';
import { Box, Paper, Typography, CircularProgress, Alert, Chip, Stack } from '@mui/material';
import * as echarts from 'echarts';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

interface HeatmapStock {
  symbol: string;
  name: string | null;
  sector: string | null;
  price: number;
  change_pct: number;
  market_cap: number | null;
}

const fetchHeatmapData = async (): Promise<HeatmapStock[]> => {
  const { data } = await apiClient.get<HeatmapStock[]>('/analysis/heatmap');
  return data;
};

// Color scale for performance
const getColorByChange = (changePct: number): string => {
  if (changePct >= 5) return '#00C853';
  if (changePct >= 3) return '#00E676';
  if (changePct >= 2) return '#69F0AE';
  if (changePct >= 1) return '#A5D6A7';
  if (changePct >= 0.5) return '#C8E6C9';
  if (changePct >= 0) return '#2E7D32';
  if (changePct >= -0.5) return '#C62828';
  if (changePct >= -1) return '#E57373';
  if (changePct >= -2) return '#EF5350';
  if (changePct >= -3) return '#F44336';
  return '#D32F2F';
};

const SP500Treemap: React.FC = () => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  const { data, isLoading, error, dataUpdatedAt } = useQuery({
    queryKey: ['sp500Heatmap'],
    queryFn: fetchHeatmapData,
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
  });

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current, 'dark');
    }

    const chart = chartInstanceRef.current;

    // Group stocks by sector
    const sectorGroups: { [key: string]: HeatmapStock[] } = {};
    data.forEach(stock => {
      const sector = stock.sector || 'Other';
      if (!sectorGroups[sector]) {
        sectorGroups[sector] = [];
      }
      sectorGroups[sector].push(stock);
    });

    // Build treemap data structure
    const treeData = Object.entries(sectorGroups).map(([sector, stocks]) => {
      // Sort stocks by market cap within sector
      stocks.sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0));

      return {
        name: sector,
        children: stocks.map(stock => ({
          name: stock.symbol,
          value: Math.max(stock.market_cap || 1000000000, 1000000000), // Min size for visibility
          fullName: stock.name,
          price: stock.price,
          changePct: stock.change_pct,
          itemStyle: {
            color: getColorByChange(stock.change_pct),
          },
        })),
      };
    });

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        backgroundColor: 'rgba(20, 20, 35, 0.95)',
        borderColor: '#444',
        borderWidth: 1,
        textStyle: {
          color: '#fff',
          fontSize: 13,
        },
        formatter: (params: any) => {
          if (params.data.children) {
            // Sector level
            const totalCap = params.data.children.reduce(
              (sum: number, c: any) => sum + (c.value || 0),
              0
            );
            return `
              <div style="padding: 8px;">
                <div style="font-weight: bold; font-size: 15px; margin-bottom: 4px;">${params.name}</div>
                <div style="color: #aaa;">${params.data.children.length} stocks</div>
              </div>
            `;
          }

          // Stock level
          const sign = params.data.changePct >= 0 ? '+' : '';
          const color = params.data.changePct >= 0 ? '#00E676' : '#FF5252';
          const marketCap = params.data.value >= 1e12
            ? `$${(params.data.value / 1e12).toFixed(2)}T`
            : params.data.value >= 1e9
            ? `$${(params.data.value / 1e9).toFixed(1)}B`
            : `$${(params.data.value / 1e6).toFixed(0)}M`;

          return `
            <div style="padding: 10px; min-width: 180px;">
              <div style="font-weight: bold; font-size: 16px; margin-bottom: 2px;">${params.name}</div>
              <div style="color: #aaa; font-size: 12px; margin-bottom: 8px;">${params.data.fullName || ''}</div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #888;">Price:</span>
                <span style="font-weight: bold;">$${params.data.price?.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #888;">Change:</span>
                <span style="color: ${color}; font-weight: bold;">${sign}${params.data.changePct?.toFixed(2)}%</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #888;">Market Cap:</span>
                <span>${marketCap}</span>
              </div>
            </div>
          `;
        },
      },
      series: [
        {
          type: 'treemap',
          data: treeData,
          width: '100%',
          height: '100%',
          roam: 'move',
          nodeClick: 'zoomToNode',
          breadcrumb: {
            show: true,
            top: 5,
            left: 'center',
            itemStyle: {
              color: '#2a2a4a',
              borderColor: '#444',
            },
            textStyle: {
              color: '#fff',
              fontSize: 12,
            },
          },
          label: {
            show: true,
            position: 'insideTopLeft',
            formatter: (params: any) => {
              if (params.data.children) {
                return `{sector|${params.name}}`;
              }
              const sign = params.data.changePct >= 0 ? '+' : '';
              return `{symbol|${params.name}}\n{change|${sign}${params.data.changePct?.toFixed(1)}%}`;
            },
            rich: {
              sector: {
                fontSize: 14,
                fontWeight: 'bold',
                color: '#fff',
                padding: [4, 0, 0, 4],
              },
              symbol: {
                fontSize: 11,
                fontWeight: 'bold',
                color: '#fff',
                lineHeight: 16,
              },
              change: {
                fontSize: 10,
                color: '#fff',
                lineHeight: 14,
              },
            },
          },
          upperLabel: {
            show: true,
            height: 30,
            color: '#fff',
            backgroundColor: 'rgba(0,0,0,0.5)',
          },
          itemStyle: {
            borderColor: '#1a1a2e',
            borderWidth: 1,
            gapWidth: 1,
          },
          levels: [
            {
              // Sector level
              itemStyle: {
                borderColor: '#333',
                borderWidth: 2,
                gapWidth: 2,
              },
              upperLabel: {
                show: true,
              },
            },
            {
              // Stock level
              itemStyle: {
                borderColor: '#222',
                borderWidth: 1,
                gapWidth: 1,
              },
              colorSaturation: [0.6, 0.9],
            },
          ],
          emphasis: {
            itemStyle: {
              borderColor: '#fff',
              borderWidth: 2,
            },
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
  }, [data]);

  useEffect(() => {
    return () => {
      chartInstanceRef.current?.dispose();
    };
  }, []);

  if (isLoading) {
    return (
      <Paper
        sx={{
          p: 3,
          height: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        }}
      >
        <Box textAlign="center">
          <CircularProgress sx={{ color: '#00E676', mb: 2 }} />
          <Typography color="text.secondary">Loading S&P 500 data...</Typography>
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3, height: 700 }}>
        <Alert severity="error">Failed to load S&P 500 data. Make sure to run the data fetch first.</Alert>
      </Paper>
    );
  }

  // Calculate summary stats
  const gainers = data?.filter(s => s.change_pct > 0).length || 0;
  const losers = data?.filter(s => s.change_pct < 0).length || 0;
  const unchanged = data?.filter(s => s.change_pct === 0).length || 0;

  return (
    <Paper
      sx={{
        p: 3,
        height: 700,
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: 2,
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h6" fontWeight="bold" sx={{ color: '#fff' }}>
            S&P 500 Market Map
          </Typography>
          <Typography variant="caption" sx={{ color: '#888' }}>
            {data?.length || 0} stocks • Click to zoom • Updated {new Date(dataUpdatedAt).toLocaleTimeString()}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Chip
            label={`${gainers} Gainers`}
            size="small"
            sx={{ bgcolor: 'rgba(0, 200, 83, 0.2)', color: '#00E676' }}
          />
          <Chip
            label={`${losers} Losers`}
            size="small"
            sx={{ bgcolor: 'rgba(244, 67, 54, 0.2)', color: '#FF5252' }}
          />
        </Stack>
      </Box>
      <Box
        ref={chartRef}
        sx={{
          width: '100%',
          height: 'calc(100% - 60px)',
        }}
      />
    </Paper>
  );
};

export default SP500Treemap;
