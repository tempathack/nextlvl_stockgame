import React, { useState, useMemo } from 'react';
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
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Autocomplete,
  TextField,
  TablePagination,
  Link,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  OpenInNew,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import {
  getInsiderTrades,
  getInsiderSummary,
  getTopInsiders,
  getInsiderStats,
  getSP500Tickers,
  InsiderTrade,
  InsiderSummary,
  TopInsider,
} from '../../api/insiderTrades';

/**
 * Helper function to format large numbers
 */
const formatValue = (val: number | null): string => {
  if (val === null || val === undefined) return 'N/A';
  const absVal = Math.abs(val);
  if (absVal >= 1_000_000_000) {
    return `$${(val / 1_000_000_000).toFixed(2)}B`;
  }
  if (absVal >= 1_000_000) {
    return `$${(val / 1_000_000).toFixed(2)}M`;
  }
  if (absVal >= 1_000) {
    return `$${(val / 1_000).toFixed(1)}K`;
  }
  return `$${val.toFixed(0)}`;
};

/**
 * Format percentage with +/- sign
 */
const formatPct = (val: number | null): string => {
  if (val === null || val === undefined) return 'N/A';
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}%`;
};

/**
 * Get color based on percentage value
 */
const getPctColor = (val: number | null): string => {
  if (val === null || val === undefined) return 'text.secondary';
  if (val > 0) return '#00E676';
  if (val < 0) return '#FF5252';
  return 'text.secondary';
};

/**
 * Stats Card Component
 */
interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  icon?: React.ReactNode;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, subtitle, color, icon }) => {
  return (
    <Card
      sx={{
        height: '100%',
        background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.9) 0%, rgba(22, 33, 62, 0.9) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
            {title}
          </Typography>
          {icon}
        </Box>
        <Typography
          variant="h4"
          fontWeight="bold"
          sx={{ color: color || 'text.primary', mb: 0.5 }}
        >
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * All Trades Tab Component
 */
interface AllTradesTabProps {
  trades: InsiderTrade[];
  total: number;
  page: number;
  rowsPerPage: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSort: (column: string) => void;
}

const AllTradesTab: React.FC<AllTradesTabProps> = ({
  trades,
  total,
  page,
  rowsPerPage,
  sortBy,
  sortOrder,
  onPageChange,
  onRowsPerPageChange,
  onSort,
}) => {
  const getSortIcon = (column: string) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />;
  };

  const getTransactionColor = (type: string): 'success' | 'error' | 'warning' | 'info' => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('buy') || lowerType.includes('purchase')) return 'success';
    if (lowerType.includes('sell') || lowerType.includes('sale')) return 'error';
    if (lowerType.includes('award') || lowerType.includes('grant')) return 'warning';
    return 'info';
  };

  return (
    <Box>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => onSort('filing_date')}
                >
                  Date {getSortIcon('filing_date')}
                </Box>
              </TableCell>
              <TableCell>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => onSort('symbol')}
                >
                  Symbol {getSortIcon('symbol')}
                </Box>
              </TableCell>
              <TableCell>Insider</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">
                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', cursor: 'pointer' }}
                  onClick={() => onSort('shares_traded')}
                >
                  Shares {getSortIcon('shares_traded')}
                </Box>
              </TableCell>
              <TableCell align="right">
                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', cursor: 'pointer' }}
                  onClick={() => onSort('total_value')}
                >
                  Value {getSortIcon('total_value')}
                </Box>
              </TableCell>
              <TableCell align="right">1W Return</TableCell>
              <TableCell align="right">1M Return</TableCell>
              <TableCell align="right">1M Alpha</TableCell>
              <TableCell align="center">SEC</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {trades.map((trade) => (
              <TableRow key={trade.id} hover>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(trade.filing_date).toLocaleDateString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Trade: {new Date(trade.transaction_date).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {trade.symbol}
                  </Typography>
                  {trade.company_name && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {trade.company_name.length > 30
                        ? `${trade.company_name.substring(0, 30)}...`
                        : trade.company_name}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{trade.insider_name}</Typography>
                  {trade.insider_title && (
                    <Typography variant="caption" color="text.secondary">
                      {trade.insider_title}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={trade.transaction_type}
                    size="small"
                    color={getTransactionColor(trade.transaction_type)}
                    sx={{ minWidth: 80 }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">
                    {trade.shares_traded?.toLocaleString() ?? 'N/A'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight="medium">
                    {formatValue(trade.total_value)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    sx={{ color: getPctColor(trade.return_1w_pct), fontWeight: 'medium' }}
                  >
                    {formatPct(trade.return_1w_pct)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    sx={{ color: getPctColor(trade.return_1m_pct), fontWeight: 'medium' }}
                  >
                    {formatPct(trade.return_1m_pct)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    sx={{ color: getPctColor(trade.alpha_1m_pct), fontWeight: 'medium' }}
                  >
                    {formatPct(trade.alpha_1m_pct)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  {trade.filing_url && (
                    <IconButton
                      size="small"
                      component="a"
                      href={trade.filing_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <OpenInNew fontSize="small" />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={onPageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={onRowsPerPageChange}
        rowsPerPageOptions={[25, 50, 100]}
      />
    </Box>
  );
};

/**
 * By Stock Tab Component
 */
interface ByStockTabProps {
  summaries: InsiderSummary[];
  onSymbolClick: (symbol: string) => void;
}

const ByStockTab: React.FC<ByStockTabProps> = ({ summaries, onSymbolClick }) => {
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Symbol</TableCell>
            <TableCell align="right">Total Trades</TableCell>
            <TableCell align="right">Buys</TableCell>
            <TableCell align="right">Sells</TableCell>
            <TableCell align="right">Net Value</TableCell>
            <TableCell align="right">Avg Buy Return</TableCell>
            <TableCell>Top Insider</TableCell>
            <TableCell>Last Trade</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {summaries.map((summary) => (
            <TableRow key={summary.symbol} hover>
              <TableCell>
                <Link
                  component="button"
                  variant="body2"
                  fontWeight="bold"
                  onClick={() => onSymbolClick(summary.symbol)}
                  sx={{ cursor: 'pointer' }}
                >
                  {summary.symbol}
                </Link>
              </TableCell>
              <TableCell align="right">
                <Chip label={summary.total_trades} size="small" variant="outlined" />
              </TableCell>
              <TableCell align="right">
                <Chip
                  label={summary.buy_count}
                  size="small"
                  sx={{ bgcolor: 'rgba(0, 230, 118, 0.1)', color: '#00E676' }}
                />
              </TableCell>
              <TableCell align="right">
                <Chip
                  label={summary.sell_count}
                  size="small"
                  sx={{ bgcolor: 'rgba(255, 82, 82, 0.1)', color: '#FF5252' }}
                />
              </TableCell>
              <TableCell align="right">
                <Typography
                  variant="body2"
                  fontWeight="bold"
                  sx={{ color: getPctColor(summary.net_insider_value) }}
                >
                  {formatValue(summary.net_insider_value)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography
                  variant="body2"
                  sx={{ color: getPctColor(summary.avg_buy_return_1m), fontWeight: 'medium' }}
                >
                  {formatPct(summary.avg_buy_return_1m)}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                  {summary.top_insider}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {new Date(summary.most_recent_trade_date).toLocaleDateString()}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

/**
 * Top Insiders Tab Component
 */
interface TopInsidersTabProps {
  insiders: TopInsider[];
}

const TopInsidersTab: React.FC<TopInsidersTabProps> = ({ insiders }) => {
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Insider Name</TableCell>
            <TableCell align="right">Total Trades</TableCell>
            <TableCell align="right">Buys</TableCell>
            <TableCell align="right">Sells</TableCell>
            <TableCell>Symbols Traded</TableCell>
            <TableCell align="right">Total Value</TableCell>
            <TableCell align="right">Avg Return</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {insiders.map((insider, index) => (
            <TableRow key={index} hover>
              <TableCell>
                <Typography variant="body2" fontWeight="medium">
                  {insider.insider_name}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Chip label={insider.total_trades} size="small" variant="outlined" />
              </TableCell>
              <TableCell align="right">
                <Chip
                  label={insider.buy_count}
                  size="small"
                  sx={{ bgcolor: 'rgba(0, 230, 118, 0.1)', color: '#00E676' }}
                />
              </TableCell>
              <TableCell align="right">
                <Chip
                  label={insider.sell_count}
                  size="small"
                  sx={{ bgcolor: 'rgba(255, 82, 82, 0.1)', color: '#FF5252' }}
                />
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {insider.symbols.slice(0, 5).map((symbol) => (
                    <Chip key={symbol} label={symbol} size="small" variant="outlined" />
                  ))}
                  {insider.symbols.length > 5 && (
                    <Chip
                      label={`+${insider.symbols.length - 5}`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" fontWeight="bold">
                  {formatValue(insider.total_value)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography
                  variant="body2"
                  sx={{ color: getPctColor(insider.avg_return_1m), fontWeight: 'medium' }}
                >
                  {formatPct(insider.avg_return_1m)}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

/**
 * Main Insider Trades Page Component
 */
const InsiderTrades: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [period, setPeriod] = useState(30);
  const [transactionType, setTransactionType] = useState<string>('');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [sortBy, setSortBy] = useState('filing_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch S&P 500 tickers for autocomplete
  const { data: tickers } = useQuery({
    queryKey: ['sp500-tickers'],
    queryFn: getSP500Tickers,
    staleTime: Infinity,
  });

  // Fetch insider stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['insider-stats', period],
    queryFn: () => getInsiderStats(period),
    refetchInterval: 300000, // 5 minutes
  });

  // Fetch insider trades
  const { data: tradesData, isLoading: tradesLoading } = useQuery({
    queryKey: ['insider-trades', selectedSymbol, transactionType, period, page, rowsPerPage, sortBy, sortOrder],
    queryFn: () =>
      getInsiderTrades({
        symbol: selectedSymbol || undefined,
        transaction_type: transactionType || undefined,
        days_back: period,
        sort_by: sortBy,
        sort_order: sortOrder,
        limit: rowsPerPage,
        offset: page * rowsPerPage,
      }),
    refetchInterval: 300000,
  });

  // Fetch insider summary
  const { data: summaries, isLoading: summariesLoading } = useQuery({
    queryKey: ['insider-summary', period],
    queryFn: () => getInsiderSummary({ days_back: period, limit: 50 }),
    refetchInterval: 300000,
  });

  // Fetch top insiders
  const { data: topInsiders, isLoading: insidersLoading } = useQuery({
    queryKey: ['top-insiders', period],
    queryFn: () => getTopInsiders({ days_back: period, limit: 30 }),
    refetchInterval: 300000,
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleSymbolClick = (symbol: string) => {
    setSelectedSymbol(symbol);
    setSelectedTab(0);
    setPage(0);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setPage(0);
  };

  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const isLoading = statsLoading || tradesLoading || summariesLoading || insidersLoading;

  if (isLoading && !stats) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Paper>
      </Container>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        pt: 4,
        pb: 4,
      }}
    >
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
            SEC Insider Trades
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Real-time tracking of insider trading activity in S&P 500 companies
          </Typography>
        </Box>

        {/* Stats Row */}
        {stats && (
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={2}>
              <StatsCard
                title="Total Trades"
                value={stats.total_trades.toLocaleString()}
                subtitle={`${period} days`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <StatsCard
                title="Unique Stocks"
                value={stats.unique_stocks}
                subtitle={`${stats.unique_insiders} insiders`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <StatsCard
                title="Net Sentiment"
                value={formatValue(stats.net_insider_sentiment)}
                color={getPctColor(stats.net_insider_sentiment)}
                icon={
                  stats.net_insider_sentiment >= 0 ? (
                    <TrendingUp sx={{ color: '#00E676' }} />
                  ) : (
                    <TrendingDown sx={{ color: '#FF5252' }} />
                  )
                }
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <StatsCard
                title="Total Buys"
                value={formatValue(stats.total_buy_value)}
                color="#00E676"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <StatsCard
                title="Total Sells"
                value={formatValue(stats.total_sell_value)}
                color="#FF5252"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <StatsCard
                title="Avg Buy Return 1M"
                value={formatPct(stats.avg_buy_return_1m)}
                color={getPctColor(stats.avg_buy_return_1m)}
              />
            </Grid>
          </Grid>
        )}

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <Autocomplete
                options={tickers || []}
                value={selectedSymbol}
                onChange={(_event, newValue) => {
                  setSelectedSymbol(newValue);
                  setPage(0);
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Symbol" placeholder="Search..." size="small" />
                )}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Transaction Type</InputLabel>
                <Select
                  value={transactionType}
                  label="Transaction Type"
                  onChange={(e) => {
                    setTransactionType(e.target.value);
                    setPage(0);
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="Buy">Buy</MenuItem>
                  <MenuItem value="Sell">Sell</MenuItem>
                  <MenuItem value="Award">Award</MenuItem>
                  <MenuItem value="Option">Option Exercise</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Period</InputLabel>
                <Select
                  value={period}
                  label="Period"
                  onChange={(e) => {
                    setPeriod(e.target.value as number);
                    setPage(0);
                  }}
                >
                  <MenuItem value={7}>7 Days</MenuItem>
                  <MenuItem value={30}>30 Days</MenuItem>
                  <MenuItem value={60}>60 Days</MenuItem>
                  <MenuItem value={90}>90 Days</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Tabs */}
        <Paper>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={selectedTab} onChange={handleTabChange}>
              <Tab label="All Trades" />
              <Tab label="By Stock" />
              <Tab label="Top Insiders" />
            </Tabs>
          </Box>

          <Box sx={{ p: 0 }}>
            {selectedTab === 0 && tradesData && (
              <AllTradesTab
                trades={tradesData.trades}
                total={tradesData.total}
                page={page}
                rowsPerPage={rowsPerPage}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onPageChange={handlePageChange}
                onRowsPerPageChange={handleRowsPerPageChange}
                onSort={handleSort}
              />
            )}

            {selectedTab === 1 && summaries && (
              <ByStockTab summaries={summaries} onSymbolClick={handleSymbolClick} />
            )}

            {selectedTab === 2 && topInsiders && (
              <TopInsidersTab insiders={topInsiders} />
            )}
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default InsiderTrades;
