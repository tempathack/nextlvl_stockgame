import React from 'react';
import { Grid, Paper, Typography, Box, Chip } from '@mui/material';
import {
  AccountBalance,
  TrendingUp,
  AccountBalanceWallet,
  ShowChart,
} from '@mui/icons-material';

interface Portfolio {
  cash_balance: number;
  equity_value: number;
  total_value: number;
  total_return_pct: number;
}

interface PortfolioOverviewProps {
  portfolio: Portfolio;
  startingCapital?: number;
}

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, color, subtitle, trend }) => (
  <Paper
    sx={{
      p: 3,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        width: 4,
        height: '100%',
        bgcolor: color,
      },
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
      <Typography variant="body2" color="text.secondary" fontWeight="medium">
        {title}
      </Typography>
      <Box
        sx={{
          p: 1,
          borderRadius: 1,
          bgcolor: `${color}15`,
          color,
          display: 'flex',
        }}
      >
        {icon}
      </Box>
    </Box>
    <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
      {value}
    </Typography>
    {subtitle && (
      <Typography variant="body2" color="text.secondary">
        {subtitle}
      </Typography>
    )}
    {trend && (
      <Chip
        label={trend.value}
        size="small"
        color={trend.isPositive ? 'success' : 'error'}
        sx={{ mt: 1, alignSelf: 'flex-start' }}
      />
    )}
  </Paper>
);

const PortfolioOverview: React.FC<PortfolioOverviewProps> = ({
  portfolio,
  startingCapital = 100000,
}) => {
  const cashBalance = portfolio.cash_balance;
  const equityValue = portfolio.equity_value;
  const totalValue = portfolio.total_value;
  const totalReturnPct = portfolio.total_return_pct;

  const totalReturn = totalValue - startingCapital;
  const isPositive = totalReturnPct >= 0;

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const metrics: MetricCardProps[] = [
    {
      title: 'Total Portfolio Value',
      value: formatCurrency(totalValue),
      icon: <AccountBalance />,
      color: '#3b82f6',
      subtitle: `Started with ${formatCurrency(startingCapital)}`,
    },
    {
      title: 'Cash Balance',
      value: formatCurrency(cashBalance),
      icon: <AccountBalanceWallet />,
      color: '#22c55e',
      subtitle: `${((cashBalance / totalValue) * 100).toFixed(1)}% of portfolio`,
    },
    {
      title: 'Equity Value',
      value: formatCurrency(equityValue),
      icon: <ShowChart />,
      color: '#f59e0b',
      subtitle: `${((equityValue / totalValue) * 100).toFixed(1)}% of portfolio`,
    },
    {
      title: 'Total Return',
      value: formatCurrency(totalReturn),
      icon: <TrendingUp />,
      color: isPositive ? '#22c55e' : '#ef4444',
      trend: {
        value: `${isPositive ? '+' : ''}${totalReturnPct.toFixed(2)}%`,
        isPositive,
      },
    },
  ];

  return (
    <Grid container spacing={3}>
      {metrics.map((metric, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <MetricCard {...metric} />
        </Grid>
      ))}
    </Grid>
  );
};

export default PortfolioOverview;
