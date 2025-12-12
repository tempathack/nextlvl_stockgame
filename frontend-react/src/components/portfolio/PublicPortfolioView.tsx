/**
 * Public Portfolio View Component
 * Shows portfolio summary for public viewing
 */
import React from 'react';
import { Box, Typography, Divider, Chip } from '@mui/material';
import {
  AccountBalance,
  TrendingUp,
  TrendingDown,
  ShowChart,
} from '@mui/icons-material';
import { Portfolio } from '../../api/portfolio';
import { formatCurrency, formatPercentage, getChangeColor } from '../../theme';

interface PublicPortfolioViewProps {
  portfolio: Portfolio;
}

const PublicPortfolioView: React.FC<PublicPortfolioViewProps> = ({ portfolio }) => {
  const isPositiveReturn = portfolio.total_return_pct >= 0;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Portfolio Summary
      </Typography>
      <Divider sx={{ mb: 2 }} />

      {/* Total Value */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <ShowChart fontSize="small" color="primary" />
          <Typography variant="body2" color="text.secondary">
            Total Value
          </Typography>
        </Box>
        <Typography variant="h4" fontWeight={700}>
          {formatCurrency(portfolio.total_value)}
        </Typography>
      </Box>

      {/* Return */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          {isPositiveReturn ? (
            <TrendingUp fontSize="small" color="success" />
          ) : (
            <TrendingDown fontSize="small" color="error" />
          )}
          <Typography variant="body2" color="text.secondary">
            Total Return
          </Typography>
        </Box>
        <Chip
          label={formatPercentage(portfolio.total_return_pct)}
          color={isPositiveReturn ? 'success' : 'error'}
          size="medium"
          sx={{ fontWeight: 600, fontSize: '1rem' }}
        />
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Cash Balance */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <AccountBalance fontSize="small" color="info" />
          <Typography variant="body2" color="text.secondary">
            Cash Balance
          </Typography>
        </Box>
        <Typography variant="h6" fontWeight={600}>
          {formatCurrency(portfolio.cash_balance)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {((portfolio.cash_balance / portfolio.total_value) * 100).toFixed(1)}% of
          total
        </Typography>
      </Box>

      {/* Equity Value */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Equity Value
        </Typography>
        <Typography variant="h6" fontWeight={600}>
          {formatCurrency(portfolio.equity_value)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {((portfolio.equity_value / portfolio.total_value) * 100).toFixed(1)}% of
          total
        </Typography>
      </Box>

      {/* Position Count */}
      <Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Open Positions
        </Typography>
        <Typography variant="h6" fontWeight={600}>
          {portfolio.positions.length}
        </Typography>
      </Box>
    </Box>
  );
};

export default PublicPortfolioView;
