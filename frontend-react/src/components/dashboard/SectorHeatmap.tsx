import React, { useEffect, useRef } from 'react';
import { Box, Paper, Typography, CircularProgress, Alert } from '@mui/material';
import * as echarts from 'echarts';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface SectorData {
  sector: string;
  change_pct: number;
  market_cap: number | null;
}

interface SectorHeatmapResponse {
  sectors: SectorData[];
  updated_at: string;
}

const fetchSectorData = async (): Promise<SectorHeatmapResponse> => {
  const { data } = await axios.get<SectorHeatmapResponse>('/api/market/sectors');
  return data;
};

// Modern color palette for sectors
const getColorByChange = (changePct: number): string => {
  if (changePct >= 3) return '#00C853';      // Strong green
  if (changePct >= 2) return '#00E676';      // Bright green
  if (changePct >= 1) return '#69F0AE';      // Light green
  if (changePct >= 0.5) return '#B9F6CA';    // Very light green
  if (changePct >= 0) return '#1B5E20';      // Dark green (small gain)
  if (changePct >= -0.5) return '#B71C1C';   // Dark red (small loss)
  if (changePct >= -1) return '#FF5252';     // Light red
  if (changePct >= -2) return '#FF1744';     // Bright red
  return '#D50000';                           // Strong red
};

const SectorHeatmap: React.FC = () => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['sectorHeatmap'],
    queryFn: fetchSectorData,
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (!chartRef.current || !data) return;

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current, 'dark');
    }

    const chart = chartInstanceRef.current;

    // Sort sectors by change percentage for better visualization
    const sortedSectors = [...data.sectors].sort((a, b) => {
      const aChange = typeof a.change_pct === 'string' ? parseFloat(a.change_pct) : a.change_pct;
      const bChange = typeof b.change_pct === 'string' ? parseFloat(b.change_pct) : b.change_pct;
      return bChange - aChange;
    });

    // Transform data for treemap
    const treeData = sortedSectors.map((sector) => {
      const changePct = typeof sector.change_pct === 'string' ? parseFloat(sector.change_pct) : sector.change_pct;
      return {
        name: sector.sector,
        value: Math.max(Math.abs(changePct) * 10, 1), // Ensure minimum size
        changePct: changePct,
        itemStyle: {
          color: getColorByChange(changePct),
          borderColor: '#1a1a2e',
          borderWidth: 2,
        },
      };
    });

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        backgroundColor: 'rgba(20, 20, 35, 0.95)',
        borderColor: '#333',
        borderWidth: 1,
        textStyle: {
          color: '#fff',
          fontSize: 14,
        },
        formatter: (params: any) => {
          const item = treeData.find((s) => s.name === params.name);
          if (!item) return '';
          const sign = item.changePct >= 0 ? '+' : '';
          const color = item.changePct >= 0 ? '#00E676' : '#FF5252';
          return `
            <div style="padding: 8px;">
              <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">${item.name}</div>
              <div style="color: ${color}; font-size: 20px; font-weight: bold;">
                ${sign}${item.changePct.toFixed(2)}%
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
          roam: false,
          nodeClick: false,
          breadcrumb: {
            show: false,
          },
          label: {
            show: true,
            position: 'inside',
            formatter: (params: any) => {
              const item = treeData.find((s) => s.name === params.name);
              if (!item) return '';
              const sign = item.changePct >= 0 ? '+' : '';
              return `{name|${item.name}}\n{value|${sign}${item.changePct.toFixed(2)}%}`;
            },
            rich: {
              name: {
                fontSize: 16,
                fontWeight: 'bold',
                color: '#fff',
                lineHeight: 28,
                textShadowColor: 'rgba(0,0,0,0.5)',
                textShadowBlur: 4,
              },
              value: {
                fontSize: 22,
                fontWeight: 'bold',
                color: '#fff',
                lineHeight: 32,
                textShadowColor: 'rgba(0,0,0,0.5)',
                textShadowBlur: 4,
              },
            },
          },
          upperLabel: {
            show: false,
          },
          itemStyle: {
            borderColor: '#1a1a2e',
            borderWidth: 3,
            gapWidth: 3,
            borderRadius: 4,
          },
          levels: [
            {
              itemStyle: {
                borderColor: '#1a1a2e',
                borderWidth: 3,
                gapWidth: 3,
              },
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
          height: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        }}
      >
        <CircularProgress sx={{ color: '#00E676' }} />
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3, height: 500 }}>
        <Alert severity="error">Failed to load sector data</Alert>
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        p: 3,
        height: 500,
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: 2,
      }}
    >
      <Typography
        variant="h6"
        gutterBottom
        fontWeight="bold"
        sx={{ color: '#fff', mb: 2 }}
      >
        Sector Performance
      </Typography>
      <Box
        ref={chartRef}
        sx={{
          width: '100%',
          height: 'calc(100% - 48px)',
        }}
      />
    </Paper>
  );
};

export default SectorHeatmap;
