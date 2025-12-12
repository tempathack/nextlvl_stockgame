import React from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Box,
  IconButton,
  Tooltip,
  TableSortLabel,
} from '@mui/material';
import { TrendingUp, TrendingDown, Info } from '@mui/icons-material';

interface Position {
  symbol: string;
  quantity: number;
  average_price: number;
  current_price: number | null;
  market_value: number;
  is_short: boolean;
  // Support both naming conventions
  pnl?: number | null;
  pnl_pct?: number | null;
  gain_loss?: number | null;
  gain_loss_pct?: number | null;
}

interface PositionsTableProps {
  positions: Position[];
  onRowClick?: (symbol: string) => void;
}

type OrderDirection = 'asc' | 'desc';
type SortableColumn = 'symbol' | 'quantity' | 'market_value' | 'gain_loss_pct';

// Helper functions to handle both naming conventions
const getPnl = (pos: Position): number | null => pos.pnl ?? pos.gain_loss ?? null;
const getPnlPct = (pos: Position): number | null => pos.pnl_pct ?? pos.gain_loss_pct ?? null;

const PositionsTable: React.FC<PositionsTableProps> = ({ positions, onRowClick }) => {
  const [orderBy, setOrderBy] = React.useState<SortableColumn>('market_value');
  const [order, setOrder] = React.useState<OrderDirection>('desc');

  const handleSort = (column: SortableColumn) => {
    const isAsc = orderBy === column && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(column);
  };

  const sortedPositions = React.useMemo(() => {
    return [...positions].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (orderBy) {
        case 'symbol':
          aValue = a.symbol;
          bValue = b.symbol;
          break;
        case 'quantity':
          aValue = a.quantity;
          bValue = b.quantity;
          break;
        case 'market_value':
          aValue = a.market_value;
          bValue = b.market_value;
          break;
        case 'gain_loss_pct':
          aValue = getPnlPct(a) || 0;
          bValue = getPnlPct(b) || 0;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return order === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return order === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [positions, orderBy, order]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (positions.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No positions yet. Start trading to build your portfolio!
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6">Positions</Typography>
        <Typography variant="body2" color="text.secondary">
          {positions.length} position{positions.length !== 1 ? 's' : ''}
        </Typography>
      </Box>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'symbol'}
                  direction={orderBy === 'symbol' ? order : 'asc'}
                  onClick={() => handleSort('symbol')}
                >
                  Symbol
                </TableSortLabel>
              </TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'quantity'}
                  direction={orderBy === 'quantity' ? order : 'asc'}
                  onClick={() => handleSort('quantity')}
                >
                  Quantity
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">Avg Price</TableCell>
              <TableCell align="right">Current Price</TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'market_value'}
                  direction={orderBy === 'market_value' ? order : 'asc'}
                  onClick={() => handleSort('market_value')}
                >
                  Market Value
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">Gain/Loss</TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'gain_loss_pct'}
                  direction={orderBy === 'gain_loss_pct' ? order : 'asc'}
                  onClick={() => handleSort('gain_loss_pct')}
                >
                  Return %
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedPositions.map((position) => {
              const isProfit = (getPnlPct(position) || 0) >= 0;
              const positionPnl = getPnl(position);
              const positionPnlPct = getPnlPct(position);

              return (
                <TableRow
                  key={`${position.symbol}-${position.is_short}`}
                  hover
                  onClick={() => onRowClick?.(position.symbol)}
                  sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight="bold">
                        {position.symbol}
                      </Typography>
                      {position.is_short && (
                        <Tooltip title="Short Position">
                          <IconButton size="small" sx={{ p: 0 }}>
                            <Info fontSize="small" color="warning" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={position.is_short ? 'Short' : 'Long'}
                      size="small"
                      color={position.is_short ? 'warning' : 'primary'}
                      variant="outlined"
                    />
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
                      {position.current_price
                        ? formatCurrency(position.current_price)
                        : 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency(position.market_value)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {positionPnl !== null ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                        {isProfit ? (
                          <TrendingUp fontSize="small" color="success" />
                        ) : (
                          <TrendingDown fontSize="small" color="error" />
                        )}
                        <Typography
                          variant="body2"
                          color={isProfit ? 'success.main' : 'error.main'}
                          fontWeight="medium"
                        >
                          {formatCurrency(positionPnl)}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        N/A
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {positionPnlPct !== null ? (
                      <Chip
                        label={`${isProfit ? '+' : ''}${positionPnlPct.toFixed(2)}%`}
                        size="small"
                        color={isProfit ? 'success' : 'error'}
                        sx={{ minWidth: 80 }}
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        N/A
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default PositionsTable;
