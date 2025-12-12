import React from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';

import { TradeOrder } from '../../api/portfolio';

interface Props {
  orders: TradeOrder[];
  isLoading?: boolean;
  error?: unknown;
  onRefresh?: () => void;
}

const formatCurrency = (value?: string | null) => {
  if (!value) return '-';
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatSide = (side: string) => {
  const normalized = side.toUpperCase();
  switch (normalized) {
    case 'BUY':
      return { label: 'Buy', color: 'success' as const };
    case 'SELL':
      return { label: 'Sell', color: 'error' as const };
    case 'SHORT':
      return { label: 'Short', color: 'warning' as const };
    case 'COVER':
      return { label: 'Cover', color: 'info' as const };
    default:
      return { label: normalized, color: 'default' as const };
  }
};

const TradeHistoryTable: React.FC<Props> = ({ orders, isLoading, error, onRefresh }) => {
  if (isLoading) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="error">Failed to load trade history.</Alert>
      </Paper>
    );
  }

  if (!orders.length) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="info">No trades yet. Execute your first trade to populate the book.</Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6" fontWeight="bold">
          Trading Book
        </Typography>
        {onRefresh && (
          <IconButton size="small" onClick={onRefresh}>
            <Refresh fontSize="small" />
          </IconButton>
        )}
      </Box>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Time</TableCell>
            <TableCell>Symbol</TableCell>
            <TableCell>Side</TableCell>
            <TableCell align="right">Quantity</TableCell>
            <TableCell align="right">Price</TableCell>
            <TableCell align="right">Notional</TableCell>
            <TableCell align="right">Fee</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.map(order => {
            const sideMeta = formatSide(order.side);
            const executedAt = order.executed_at || order.submitted_at;

            return (
              <TableRow key={order.id} hover>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {new Date(executedAt).toLocaleString()}
                </TableCell>
                <TableCell>{order.symbol}</TableCell>
                <TableCell>
                  <Chip size="small" label={sideMeta.label} color={sideMeta.color} />
                </TableCell>
                <TableCell align="right">
                  {Number(order.quantity).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </TableCell>
                <TableCell align="right">${formatCurrency(order.price)}</TableCell>
                <TableCell align="right">${formatCurrency(order.notional_value)}</TableCell>
                <TableCell align="right">${formatCurrency(order.fee_amount)}</TableCell>
                <TableCell>
                  <Chip size="small" label={order.status} variant="outlined" />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Paper>
  );
};

export default TradeHistoryTable;
