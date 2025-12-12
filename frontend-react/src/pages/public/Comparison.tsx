import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Avatar,
  Collapse,
  IconButton,
  Grid,
  Divider,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  LinearProgress,
} from '@mui/material';
import {
  EmojiEvents,
  TrendingUp,
  TrendingDown,
  ExpandMore,
  ExpandLess,
  AccountBalance,
  ShowChart,
  AccessTime,
  PieChart as PieChartIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '@mui/material/styles';

/**
 * Position data structure
 */
interface Position {
  symbol: string;
  quantity: number;
  average_price: number;
  current_price: number;
  market_value: number;
  cost_basis: number;
  pnl: number;
  pnl_pct: number;
  is_short: boolean;
  created_at: string | null;
  portfolio_weight: number;
  performance_contribution: number;
}

/**
 * Participant data structure
 */
interface Participant {
  user_id: number;
  display_name: string;
  total_value: number;
  cash_balance: number;
  equity_value: number;
  total_return_pct: number;
  total_fees_paid: number;
  positions: Position[];
  positions_count: number;
}

/**
 * API response structure
 */
interface ComparisonResponse {
  participants: Participant[];
  total_participants: number;
  starting_capital: number;
  updated_at: string;
}

/**
 * Fetch comparison data from API
 */
const fetchComparisonData = async (): Promise<ComparisonResponse> => {
  const { data } = await axios.get<ComparisonResponse>('/api/leaderboard/comparison');
  return data;
};

/**
 * Format currency values
 */
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format percentage values
 */
const formatPercentage = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

/**
 * Get trophy color based on rank
 */
const getRankColor = (rank: number): string => {
  switch (rank) {
    case 1:
      return '#fbbf24'; // Gold
    case 2:
      return '#94a3b8'; // Silver
    case 3:
      return '#fb923c'; // Bronze
    default:
      return 'transparent';
  }
};

/**
 * Get trophy icon for top 3
 */
const getRankIcon = (rank: number) => {
  if (rank <= 3) {
    return (
      <EmojiEvents
        sx={{
          color: getRankColor(rank),
          fontSize: 28,
        }}
      />
    );
  }
  return (
    <Typography variant="h6" fontWeight="bold">
      {rank}
    </Typography>
  );
};

/**
 * Overview Table Component
 */
const OverviewTable: React.FC<{ participants: Participant[]; startingCapital: number }> = ({
  participants,
  startingCapital,
}) => {
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell width="80px" align="center">Rank</TableCell>
            <TableCell>Player</TableCell>
            <TableCell align="right">Total Value</TableCell>
            <TableCell align="right">Cash</TableCell>
            <TableCell align="right">Equity</TableCell>
            <TableCell align="right">Total Return</TableCell>
            <TableCell align="right">Fees Paid</TableCell>
            <TableCell align="right">Positions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {participants.map((participant, index) => {
            const rank = index + 1;
            const isProfit = participant.total_return_pct >= 0;

            return (
              <TableRow
                key={participant.user_id}
                hover
                sx={{
                  bgcolor: rank <= 3 ? `${getRankColor(rank)}10` : 'transparent',
                }}
              >
                <TableCell align="center">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {getRankIcon(rank)}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {participant.display_name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        {participant.display_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID: {participant.user_id}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body1" fontWeight="bold">
                    {formatCurrency(participant.total_value)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    vs {formatCurrency(startingCapital)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">
                    {formatCurrency(participant.cash_balance)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {((participant.cash_balance / participant.total_value) * 100).toFixed(1)}%
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">
                    {formatCurrency(participant.equity_value)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {((participant.equity_value / participant.total_value) * 100).toFixed(1)}%
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                    {isProfit ? (
                      <TrendingUp fontSize="small" color="success" />
                    ) : (
                      <TrendingDown fontSize="small" color="error" />
                    )}
                    <Chip
                      label={formatPercentage(participant.total_return_pct)}
                      size="small"
                      color={isProfit ? 'success' : 'error'}
                      sx={{ minWidth: 90, fontWeight: 'bold' }}
                    />
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="error.main">
                    {formatCurrency(participant.total_fees_paid)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Chip
                    label={participant.positions_count}
                    size="small"
                    variant="outlined"
                    color="primary"
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

/**
 * Position Details Component
 */
const PositionDetails: React.FC<{ participants: Participant[] }> = ({ participants }) => {
  const [expandedParticipant, setExpandedParticipant] = useState<number | null>(null);

  const handleExpandClick = (userId: number) => {
    setExpandedParticipant(expandedParticipant === userId ? null : userId);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {participants.map((participant, index) => {
        const rank = index + 1;
        const isExpanded = expandedParticipant === participant.user_id;
        const isProfit = participant.total_return_pct >= 0;

        return (
          <Card
            key={participant.user_id}
            sx={{
              bgcolor: rank <= 3 ? `${getRankColor(rank)}08` : 'background.paper',
              border: rank <= 3 ? `2px solid ${getRankColor(rank)}40` : undefined,
            }}
          >
            <CardContent>
              {/* Participant Header */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
                onClick={() => handleExpandClick(participant.user_id)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: 40 }}>
                    {getRankIcon(rank)}
                  </Box>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                    {participant.display_name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      {participant.display_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {participant.positions_count} position{participant.positions_count !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h6" fontWeight="bold">
                      {formatCurrency(participant.total_value)}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                      {isProfit ? (
                        <TrendingUp fontSize="small" color="success" />
                      ) : (
                        <TrendingDown fontSize="small" color="error" />
                      )}
                      <Typography
                        variant="body2"
                        color={isProfit ? 'success.main' : 'error.main'}
                        fontWeight="bold"
                      >
                        {formatPercentage(participant.total_return_pct)}
                      </Typography>
                    </Box>
                  </Box>

                  <IconButton size="small">
                    {isExpanded ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>
              </Box>

              {/* Portfolio Summary */}
              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <Divider sx={{ my: 2 }} />

                {/* Summary Stats */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <AccountBalance fontSize="small" color="success" />
                      <Typography variant="caption" color="text.secondary">
                        Cash Balance
                      </Typography>
                    </Box>
                    <Typography variant="h6" fontWeight="bold">
                      {formatCurrency(participant.cash_balance)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {((participant.cash_balance / participant.total_value) * 100).toFixed(1)}% of portfolio
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <ShowChart fontSize="small" color="primary" />
                      <Typography variant="caption" color="text.secondary">
                        Equity Value
                      </Typography>
                    </Box>
                    <Typography variant="h6" fontWeight="bold">
                      {formatCurrency(participant.equity_value)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {((participant.equity_value / participant.total_value) * 100).toFixed(1)}% of portfolio
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Total Fees Paid
                      </Typography>
                    </Box>
                    <Typography variant="h6" fontWeight="bold" color="error.main">
                      {formatCurrency(participant.total_fees_paid)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Trading costs
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Total Positions
                      </Typography>
                    </Box>
                    <Typography variant="h6" fontWeight="bold">
                      {participant.positions_count}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Active holdings
                    </Typography>
                  </Grid>
                </Grid>

                {/* Positions Table */}
                {participant.positions.length > 0 ? (
                  <>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      Position Details
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Symbol</TableCell>
                            <TableCell align="right">Quantity</TableCell>
                            <TableCell align="right">Avg Price</TableCell>
                            <TableCell align="right">Current Price</TableCell>
                            <TableCell align="right">Market Value</TableCell>
                            <TableCell align="right">Cost Basis</TableCell>
                            <TableCell align="right">P&L</TableCell>
                            <TableCell align="right">P&L %</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {participant.positions
                            .sort((a, b) => b.market_value - a.market_value)
                            .map((position) => {
                              const isProfitable = position.pnl >= 0;

                              return (
                                <TableRow key={position.symbol} hover>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Typography variant="body2" fontWeight="bold">
                                        {position.symbol}
                                      </Typography>
                                      {position.is_short && (
                                        <Chip
                                          label="SHORT"
                                          size="small"
                                          color="warning"
                                          sx={{ height: 20, fontSize: '0.65rem' }}
                                        />
                                      )}
                                    </Box>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body2">
                                      {position.quantity.toLocaleString()}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body2">
                                      {formatCurrency(position.average_price)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body2">
                                      {formatCurrency(position.current_price)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body2" fontWeight="bold">
                                      {formatCurrency(position.market_value)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body2" color="text.secondary">
                                      {formatCurrency(position.cost_basis)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography
                                      variant="body2"
                                      color={isProfitable ? 'success.main' : 'error.main'}
                                      fontWeight="bold"
                                    >
                                      {formatCurrency(position.pnl)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Chip
                                      label={formatPercentage(position.pnl_pct)}
                                      size="small"
                                      color={isProfitable ? 'success' : 'error'}
                                      sx={{ minWidth: 80, fontWeight: 'bold' }}
                                    />
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                ) : (
                  <Alert severity="info">No positions held</Alert>
                )}
              </Collapse>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
};

/**
 * Performance Chart Component
 */
const PerformanceChart: React.FC<{ participants: Participant[]; startingCapital: number }> = ({
  participants,
  startingCapital,
}) => {
  const theme = useTheme();

  // Sort participants by return percentage
  const sortedParticipants = [...participants].sort((a, b) => b.total_return_pct - a.total_return_pct);

  const chartData = sortedParticipants.map((participant) => ({
    name: participant.display_name,
    value: participant.total_return_pct,
    totalValue: participant.total_value,
  }));

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      backgroundColor: theme.palette.background.paper,
      borderColor: theme.palette.divider,
      textStyle: {
        color: theme.palette.text.primary,
      },
      formatter: (params: any) => {
        const data = params[0];
        const returnPct = data.value;
        const totalValue = chartData[data.dataIndex].totalValue;
        const gain = totalValue - startingCapital;
        const color = returnPct >= 0 ? theme.palette.success.main : theme.palette.error.main;

        return `
          <div style="padding: 8px;">
            <div style="font-weight: 600; margin-bottom: 8px;">${data.name}</div>
            <div style="margin-bottom: 4px;">
              <span style="color: ${color}; font-weight: 600; font-size: 16px;">
                ${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%
              </span>
            </div>
            <div style="font-size: 12px; color: ${theme.palette.text.secondary};">
              Total Value: ${formatCurrency(totalValue)}
            </div>
            <div style="font-size: 12px; color: ${color};">
              ${gain >= 0 ? 'Gain' : 'Loss'}: ${formatCurrency(Math.abs(gain))}
            </div>
          </div>
        `;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '5%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: chartData.map((d) => d.name),
      axisLine: {
        lineStyle: {
          color: theme.palette.divider,
        },
      },
      axisLabel: {
        color: theme.palette.text.secondary,
        rotate: 45,
        interval: 0,
      },
    },
    yAxis: {
      type: 'value',
      name: 'Return %',
      nameTextStyle: {
        color: theme.palette.text.secondary,
      },
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
    },
    series: [
      {
        name: 'Total Return',
        type: 'bar',
        data: chartData.map((d) => ({
          value: d.value,
          itemStyle: {
            color: d.value >= 0 ? theme.palette.success.main : theme.palette.error.main,
          },
        })),
        barMaxWidth: 50,
        label: {
          show: true,
          position: 'top',
          formatter: (params: any) => `${params.value >= 0 ? '+' : ''}${params.value.toFixed(2)}%`,
          color: theme.palette.text.primary,
          fontWeight: 'bold',
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)',
          },
        },
      },
    ],
  };

  return (
    <Box>
      <ReactECharts
        option={option}
        style={{ height: 400, width: '100%' }}
        opts={{ renderer: 'svg' }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', textAlign: 'center' }}>
        Total return percentage for all participants. Green indicates profit, red indicates loss.
      </Typography>
    </Box>
  );
};

/**
 * Calculate days held from created_at date
 */
const calculateDaysHeld = (createdAt: string | null): number => {
  if (!createdAt) return 0;
  const created = new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - created.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Portfolio Analysis Component - Shows detailed asset analysis for a single participant
 */
const PortfolioAnalysis: React.FC<{ participants: Participant[]; startingCapital: number }> = ({
  participants,
  startingCapital,
}) => {
  const theme = useTheme();
  const [selectedParticipant, setSelectedParticipant] = useState<number>(0);

  const handleParticipantChange = (event: SelectChangeEvent<number>) => {
    setSelectedParticipant(event.target.value as number);
  };

  const participant = participants[selectedParticipant];
  if (!participant) return null;

  const positions = [...participant.positions].sort((a, b) => b.market_value - a.market_value);

  // Treemap data for portfolio allocation
  const treemapData = positions.map((pos) => ({
    name: pos.symbol,
    value: pos.market_value,
    itemStyle: {
      color: pos.pnl >= 0 ? theme.palette.success.main : theme.palette.error.main,
    },
  }));

  const treemapOption = {
    backgroundColor: 'transparent',
    tooltip: {
      formatter: (params: any) => {
        const pos = positions.find((p) => p.symbol === params.name);
        if (!pos) return '';
        return `
          <div style="padding: 8px;">
            <div style="font-weight: 600; margin-bottom: 8px;">${params.name}</div>
            <div>Value: ${formatCurrency(pos.market_value)}</div>
            <div>Weight: ${pos.portfolio_weight.toFixed(1)}%</div>
            <div style="color: ${pos.pnl >= 0 ? theme.palette.success.main : theme.palette.error.main}">
              P&L: ${formatCurrency(pos.pnl)} (${formatPercentage(pos.pnl_pct)})
            </div>
            <div>Shares: ${pos.quantity.toLocaleString()}</div>
          </div>
        `;
      },
    },
    series: [
      {
        type: 'treemap',
        data: treemapData,
        width: '100%',
        height: '100%',
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        label: {
          show: true,
          formatter: (params: any) => {
            const pos = positions.find((p) => p.symbol === params.name);
            return `${params.name}\n${pos?.portfolio_weight.toFixed(1)}%`;
          },
          fontSize: 12,
          color: '#fff',
        },
        itemStyle: {
          borderColor: theme.palette.background.paper,
          borderWidth: 2,
          gapWidth: 2,
        },
        levels: [
          {
            itemStyle: {
              borderWidth: 0,
              gapWidth: 4,
            },
          },
        ],
      },
    ],
  };

  // Bar chart for P&L by asset
  const pnlBarOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const data = params[0];
        const pos = positions.find((p) => p.symbol === data.name);
        if (!pos) return '';
        return `
          <div style="padding: 8px;">
            <div style="font-weight: 600;">${data.name}</div>
            <div style="color: ${pos.pnl >= 0 ? theme.palette.success.main : theme.palette.error.main}">
              P&L: ${formatCurrency(pos.pnl)} (${formatPercentage(pos.pnl_pct)})
            </div>
            <div>Contribution: ${formatPercentage(pos.performance_contribution)}</div>
          </div>
        `;
      },
    },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '5%', containLabel: true },
    xAxis: {
      type: 'category',
      data: positions.map((p) => p.symbol),
      axisLabel: { rotate: 45, interval: 0, color: theme.palette.text.secondary },
      axisLine: { lineStyle: { color: theme.palette.divider } },
    },
    yAxis: {
      type: 'value',
      name: 'P&L ($)',
      axisLabel: { color: theme.palette.text.secondary, formatter: (v: number) => `$${v.toLocaleString()}` },
      axisLine: { lineStyle: { color: theme.palette.divider } },
      splitLine: { lineStyle: { color: theme.palette.divider, opacity: 0.3 } },
    },
    series: [
      {
        type: 'bar',
        data: positions.map((p) => ({
          value: p.pnl,
          itemStyle: { color: p.pnl >= 0 ? theme.palette.success.main : theme.palette.error.main },
        })),
        barMaxWidth: 40,
        label: {
          show: positions.length <= 15,
          position: 'top',
          formatter: (params: any) => formatCurrency(params.value),
          fontSize: 10,
          color: theme.palette.text.primary,
        },
      },
    ],
  };

  // Performance contribution bar chart
  const contributionBarOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const data = params[0];
        const pos = positions.find((p) => p.symbol === data.name);
        if (!pos) return '';
        return `
          <div style="padding: 8px;">
            <div style="font-weight: 600;">${data.name}</div>
            <div>Portfolio Contribution: ${formatPercentage(pos.performance_contribution)}</div>
            <div>Weight: ${pos.portfolio_weight.toFixed(1)}%</div>
          </div>
        `;
      },
    },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '5%', containLabel: true },
    xAxis: {
      type: 'category',
      data: positions.map((p) => p.symbol),
      axisLabel: { rotate: 45, interval: 0, color: theme.palette.text.secondary },
      axisLine: { lineStyle: { color: theme.palette.divider } },
    },
    yAxis: {
      type: 'value',
      name: 'Contribution %',
      axisLabel: { color: theme.palette.text.secondary, formatter: (v: number) => `${v.toFixed(2)}%` },
      axisLine: { lineStyle: { color: theme.palette.divider } },
      splitLine: { lineStyle: { color: theme.palette.divider, opacity: 0.3 } },
    },
    series: [
      {
        type: 'bar',
        data: positions.map((p) => ({
          value: p.performance_contribution,
          itemStyle: { color: p.performance_contribution >= 0 ? theme.palette.success.main : theme.palette.error.main },
        })),
        barMaxWidth: 40,
      },
    ],
  };

  return (
    <Box>
      {/* Participant Selector */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Select Participant</InputLabel>
              <Select
                value={selectedParticipant}
                label="Select Participant"
                onChange={handleParticipantChange}
              >
                {participants.map((p, idx) => (
                  <MenuItem key={p.user_id} value={idx}>
                    #{idx + 1} {p.display_name} - {formatCurrency(p.total_value)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Total Value</Typography>
                <Typography variant="h6" fontWeight="bold">{formatCurrency(participant.total_value)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Total Return</Typography>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  color={participant.total_return_pct >= 0 ? 'success.main' : 'error.main'}
                >
                  {formatPercentage(participant.total_return_pct)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Positions</Typography>
                <Typography variant="h6" fontWeight="bold">{participant.positions_count}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Cash</Typography>
                <Typography variant="h6" fontWeight="bold">{formatCurrency(participant.cash_balance)}</Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {/* Portfolio Allocation Treemap */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <PieChartIcon color="primary" />
              <Typography variant="h6" fontWeight="bold">Portfolio Allocation</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" paragraph>
              Size represents market value, color indicates profit (green) or loss (red)
            </Typography>
            <ReactECharts option={treemapOption} style={{ height: 350 }} opts={{ renderer: 'svg' }} />
          </Paper>
        </Grid>

        {/* P&L by Asset */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <ShowChart color="primary" />
              <Typography variant="h6" fontWeight="bold">P&L by Asset</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" paragraph>
              Profit and loss for each position in dollars
            </Typography>
            <ReactECharts option={pnlBarOption} style={{ height: 350 }} opts={{ renderer: 'svg' }} />
          </Paper>
        </Grid>

        {/* Performance Contribution */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <TrendingUp color="primary" />
              <Typography variant="h6" fontWeight="bold">Performance Contribution</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" paragraph>
              How much each position contributed to the overall portfolio return (as % of starting capital)
            </Typography>
            <ReactECharts option={contributionBarOption} style={{ height: 300 }} opts={{ renderer: 'svg' }} />
          </Paper>
        </Grid>

        {/* Detailed Position Table with Duration */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <AccessTime color="primary" />
              <Typography variant="h6" fontWeight="bold">Position Details with Holding Duration</Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Symbol</TableCell>
                    <TableCell align="right">Weight</TableCell>
                    <TableCell align="right">Value</TableCell>
                    <TableCell align="right">P&L</TableCell>
                    <TableCell align="right">P&L %</TableCell>
                    <TableCell align="right">Contribution</TableCell>
                    <TableCell align="right">Days Held</TableCell>
                    <TableCell>Weight Bar</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {positions.map((pos) => {
                    const daysHeld = calculateDaysHeld(pos.created_at);
                    return (
                      <TableRow key={pos.symbol} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">{pos.symbol}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">{pos.portfolio_weight.toFixed(1)}%</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">{formatCurrency(pos.market_value)}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            color={pos.pnl >= 0 ? 'success.main' : 'error.main'}
                            fontWeight="bold"
                          >
                            {formatCurrency(pos.pnl)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={formatPercentage(pos.pnl_pct)}
                            size="small"
                            color={pos.pnl_pct >= 0 ? 'success' : 'error'}
                            sx={{ minWidth: 70 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            color={pos.performance_contribution >= 0 ? 'success.main' : 'error.main'}
                          >
                            {formatPercentage(pos.performance_contribution)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title={pos.created_at ? new Date(pos.created_at).toLocaleDateString() : 'Unknown'}>
                            <Chip
                              icon={<AccessTime fontSize="small" />}
                              label={`${daysHeld}d`}
                              size="small"
                              variant="outlined"
                            />
                          </Tooltip>
                        </TableCell>
                        <TableCell sx={{ minWidth: 150 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(pos.portfolio_weight, 100)}
                              sx={{
                                flex: 1,
                                height: 8,
                                borderRadius: 4,
                                bgcolor: theme.palette.grey[200],
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: pos.pnl >= 0 ? theme.palette.success.main : theme.palette.error.main,
                                },
                              }}
                            />
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

/**
 * Comparison Page - Public
 *
 * Route: /comparison
 * Authentication: Not required
 *
 * Shows comprehensive comparison of all participants with:
 * - Overview table with rankings and key metrics
 * - Expandable position details for each participant
 * - Performance chart comparing returns
 * - Portfolio analysis with treemap, bar charts, and contribution analysis
 */
const Comparison: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ['comparison'],
    queryFn: fetchComparisonData,
    refetchInterval: 60000, // Refetch every 60 seconds
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Paper>
      </Container>
    );
  }

  if (error || !data) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Alert severity="error">Failed to load comparison data. Please try again later.</Alert>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Portfolio Comparison
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Comprehensive comparison of all {data.total_participants} participants
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          Starting Capital: {formatCurrency(data.starting_capital)} • Last Updated:{' '}
          {new Date(data.updated_at).toLocaleString()}
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={selectedTab} onChange={handleTabChange}>
          <Tab label="Overview Table" />
          <Tab label="Position Details" />
          <Tab label="Performance Chart" />
          <Tab label="Portfolio Analysis" />
        </Tabs>
      </Box>

      {selectedTab === 0 && (
        <Paper>
          <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight="bold">
              Participant Overview
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Summary of all participants including rankings, portfolio values, and returns
            </Typography>
          </Box>
          <OverviewTable participants={data.participants} startingCapital={data.starting_capital} />
        </Paper>
      )}

      {selectedTab === 1 && (
        <Box>
          <Paper sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Position Details
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Expand each participant card to view their complete position breakdown
            </Typography>
          </Paper>
          <PositionDetails participants={data.participants} />
        </Box>
      )}

      {selectedTab === 2 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Performance Comparison
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Visual comparison of total returns across all participants
          </Typography>
          <PerformanceChart participants={data.participants} startingCapital={data.starting_capital} />
        </Paper>
      )}

      {selectedTab === 3 && (
        <PortfolioAnalysis participants={data.participants} startingCapital={data.starting_capital} />
      )}
    </Container>
  );
};

export default Comparison;
