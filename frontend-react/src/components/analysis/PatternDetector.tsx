/**
 * Pattern Detection Component
 * Shows detected technical patterns for a stock
 */
import React from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  ShowChart,
  Timeline,
  Insights,
  CompareArrows,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

interface PatternSignal {
  pattern: string;
  signal: string;
  strength: string;
  description: string;
}

interface PatternDetection {
  symbol: string;
  patterns: PatternSignal[];
  overall_signal: string;
}

const fetchPatterns = async (symbol: string): Promise<PatternDetection> => {
  const { data } = await apiClient.get<PatternDetection>(`/analysis/patterns/${symbol}`);
  return data;
};

const getPatternIcon = (pattern: string) => {
  if (pattern.includes('RSI')) return <ShowChart />;
  if (pattern.includes('Cross')) return <CompareArrows />;
  if (pattern.includes('MACD')) return <Timeline />;
  if (pattern.includes('Bollinger')) return <Insights />;
  return <Timeline />;
};

const getSignalColor = (signal: string) => {
  return signal === 'bullish' ? '#00E676' : '#FF5252';
};

const getStrengthOpacity = (strength: string) => {
  switch (strength) {
    case 'strong':
      return 1;
    case 'moderate':
      return 0.7;
    case 'weak':
      return 0.4;
    default:
      return 0.5;
  }
};

interface PatternDetectorProps {
  symbol: string;
}

const PatternDetector: React.FC<PatternDetectorProps> = ({ symbol }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['patterns', symbol],
    queryFn: () => fetchPatterns(symbol),
    enabled: !!symbol,
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <Paper sx={{ p: 2, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: '#00E676' }} size={30} />
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 2 }}>
        <Alert severity="error" variant="outlined">
          Failed to load patterns
        </Alert>
      </Paper>
    );
  }

  const bullishPatterns = data?.patterns.filter(p => p.signal === 'bullish') || [];
  const bearishPatterns = data?.patterns.filter(p => p.signal === 'bearish') || [];

  return (
    <Paper
      sx={{
        p: 2,
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight="bold" color="#fff">
          Pattern Detection
        </Typography>
        <Chip
          icon={data?.overall_signal === 'bullish' ? <TrendingUp /> : data?.overall_signal === 'bearish' ? <TrendingDown /> : undefined}
          label={data?.overall_signal?.toUpperCase() || 'NEUTRAL'}
          sx={{
            bgcolor:
              data?.overall_signal === 'bullish'
                ? 'rgba(0, 200, 83, 0.2)'
                : data?.overall_signal === 'bearish'
                ? 'rgba(244, 67, 54, 0.2)'
                : 'rgba(136, 136, 136, 0.2)',
            color:
              data?.overall_signal === 'bullish'
                ? '#00E676'
                : data?.overall_signal === 'bearish'
                ? '#FF5252'
                : '#888',
            fontWeight: 'bold',
          }}
        />
      </Box>

      {(!data?.patterns || data.patterns.length === 0) ? (
        <Box py={4} textAlign="center">
          <Typography color="text.secondary">No significant patterns detected</Typography>
        </Box>
      ) : (
        <Box>
          {/* Bullish patterns */}
          {bullishPatterns.length > 0 && (
            <Box mb={2}>
              <Typography variant="subtitle2" sx={{ color: '#00E676', mb: 1 }}>
                Bullish Signals ({bullishPatterns.length})
              </Typography>
              <List dense disablePadding>
                {bullishPatterns.map((pattern, idx) => (
                  <ListItem
                    key={idx}
                    sx={{
                      bgcolor: `rgba(0, 200, 83, ${getStrengthOpacity(pattern.strength) * 0.15})`,
                      borderRadius: 1,
                      mb: 0.5,
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36, color: '#00E676' }}>
                      {getPatternIcon(pattern.pattern)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" sx={{ color: '#fff', fontWeight: 'bold' }}>
                            {pattern.pattern}
                          </Typography>
                          <Chip
                            label={pattern.strength}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: 10,
                              bgcolor: 'rgba(0, 200, 83, 0.2)',
                              color: '#00E676',
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" sx={{ color: '#888' }}>
                          {pattern.description}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Bearish patterns */}
          {bearishPatterns.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ color: '#FF5252', mb: 1 }}>
                Bearish Signals ({bearishPatterns.length})
              </Typography>
              <List dense disablePadding>
                {bearishPatterns.map((pattern, idx) => (
                  <ListItem
                    key={idx}
                    sx={{
                      bgcolor: `rgba(244, 67, 54, ${getStrengthOpacity(pattern.strength) * 0.15})`,
                      borderRadius: 1,
                      mb: 0.5,
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36, color: '#FF5252' }}>
                      {getPatternIcon(pattern.pattern)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" sx={{ color: '#fff', fontWeight: 'bold' }}>
                            {pattern.pattern}
                          </Typography>
                          <Chip
                            label={pattern.strength}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: 10,
                              bgcolor: 'rgba(244, 67, 54, 0.2)',
                              color: '#FF5252',
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" sx={{ color: '#888' }}>
                          {pattern.description}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default PatternDetector;
