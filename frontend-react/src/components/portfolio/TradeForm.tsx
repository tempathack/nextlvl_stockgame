import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Alert,
  Autocomplete,
  CircularProgress,
  Chip,
  Divider,
} from '@mui/material';
import { TrendingUp, TrendingDown, Search } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import debounce from 'lodash/debounce';

const TRADING_FEE_RATE = 0.001; // 0.1%

interface SymbolSearchResult {
  symbol: string;
  name: string;
  sector: string | null;
}

interface QuoteResponse {
  symbol: string;
  price: number;
  change: number | null;
  change_pct: number | null;
  volume: number | null;
  name: string | null;
}

interface TradeFormProps {
  availableCash: number;
  positions?: any[];
  onTradeSuccess?: () => void;
}

type OrderSide = 'buy' | 'sell' | 'short' | 'cover';

const TradeForm: React.FC<TradeFormProps> = ({ availableCash, positions, onTradeSuccess }) => {
  const queryClient = useQueryClient();
  const [side, setSide] = useState<OrderSide>('buy');
  const [symbol, setSymbol] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolSearchResult | null>(null);

  // Search symbols
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['symbolSearch', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 1) return [];
      const { data } = await apiClient.get<{ results: SymbolSearchResult[] }>(
        '/market/search',
        { params: { q: searchQuery, limit: 10 } }
      );
      return data.results;
    },
    enabled: searchQuery.length >= 1,
  });

  // Get quote for selected symbol
  const { data: quote, isLoading: isLoadingQuote } = useQuery({
    queryKey: ['quote', symbol],
    queryFn: async () => {
      if (!symbol) return null;
      const { data } = await apiClient.get<QuoteResponse>(`/market/quote/${symbol}`);
      return data;
    },
    enabled: !!symbol,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Submit trade mutation
  const tradeMutation = useMutation({
    mutationFn: async (tradeData: { symbol: string; side: OrderSide; quantity: number }) => {
      const { data } = await apiClient.post('/trades', tradeData);
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch portfolio data
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });

      // Reset form
      setQuantity('');
      if (onTradeSuccess) {
        onTradeSuccess();
      }
    },
  });

  const handleSearch = debounce((value: string) => {
    setSearchQuery(value);
  }, 300);

  const handleSymbolSelect = (_event: any, value: SymbolSearchResult | null) => {
    setSelectedSymbol(value);
    if (value) {
      setSymbol(value.symbol);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!symbol || !quantity) {
      return;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      return;
    }

    tradeMutation.mutate({ symbol, side, quantity: qty });
  };

  const calculateOrderSummary = () => {
    if (!quote || !quantity) return null;
    const qty = parseFloat(quantity);
    if (isNaN(qty)) return null;

    const price = Number(quote.price);
    const subtotal = qty * price;
    const fee = subtotal * TRADING_FEE_RATE;

    // For BUY/SHORT: Total = subtotal + fee (deducted from cash)
    // For SELL/COVER: Net Proceeds = subtotal - fee (received in cash)
    const isBuySide = side === 'buy' || side === 'short';
    const total = isBuySide ? subtotal + fee : subtotal - fee;

    return { subtotal, fee, total, isBuySide };
  };

  const orderSummary = calculateOrderSummary();
  // For BUY/SHORT: need cash to cover the total cost
  // For SELL/COVER: no cash check needed (backend validates share ownership)
  const canAfford = orderSummary
    ? (orderSummary.isBuySide ? orderSummary.total <= availableCash : true)
    : true;
  const isValid = symbol && quantity && parseFloat(quantity) > 0 && canAfford;

  const sideColors = {
    buy: 'success',
    sell: 'error',
    short: 'warning',
    cover: 'info',
  } as const;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Place Trade
      </Typography>

      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
        {/* Order Side Selection */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Order Type</InputLabel>
          <Select
            value={side}
            label="Order Type"
            onChange={(e) => setSide(e.target.value as OrderSide)}
          >
            <MenuItem value="buy">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUp fontSize="small" color="success" />
                Buy
              </Box>
            </MenuItem>
            <MenuItem value="sell">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingDown fontSize="small" color="error" />
                Sell
              </Box>
            </MenuItem>
            <MenuItem value="short">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingDown fontSize="small" color="warning" />
                Short
              </Box>
            </MenuItem>
            <MenuItem value="cover">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUp fontSize="small" color="info" />
                Cover
              </Box>
            </MenuItem>
          </Select>
        </FormControl>

        {/* Symbol Search */}
        <Autocomplete
          options={searchResults || []}
          loading={isSearching}
          value={selectedSymbol}
          onChange={handleSymbolSelect}
          onInputChange={(_, value) => handleSearch(value)}
          getOptionLabel={(option) => `${option.symbol} - ${option.name}`}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Search Symbol"
              placeholder="Start typing symbol or company name..."
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: (
                  <>
                    {isSearching ? <CircularProgress size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          renderOption={(props, option) => (
            <Box component="li" {...props}>
              <Box sx={{ width: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" fontWeight="bold">
                    {option.symbol}
                  </Typography>
                  {option.sector && (
                    <Chip label={option.sector} size="small" variant="outlined" />
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {option.name}
                </Typography>
              </Box>
            </Box>
          )}
          sx={{ mb: 2 }}
        />

        {/* Quote Display */}
        {quote && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Current Price
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  ${Number(quote.price).toFixed(2)}
                </Typography>
              </Box>
              {quote.change !== null && quote.change_pct !== null && (
                <Chip
                  label={`${Number(quote.change) >= 0 ? '+' : ''}${Number(quote.change_pct).toFixed(2)}%`}
                  color={Number(quote.change) >= 0 ? 'success' : 'error'}
                />
              )}
            </Box>
            {isLoadingQuote && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="caption" color="text.secondary">
                  Updating price...
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Quantity Input */}
        <TextField
          fullWidth
          label="Quantity"
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          inputProps={{ min: 1, step: 1 }}
          sx={{ mb: 2 }}
        />

        {/* Order Summary */}
        {orderSummary && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Quantity</Typography>
              <Typography variant="body2" fontWeight="medium">
                {parseFloat(quantity).toLocaleString()}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Price per Share</Typography>
              <Typography variant="body2" fontWeight="medium">
                ${Number(quote!.price).toFixed(2)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Subtotal</Typography>
              <Typography variant="body2" fontWeight="medium">
                ${orderSummary.subtotal.toFixed(2)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Trading Fee (0.1%)
              </Typography>
              <Typography variant="body2" fontWeight="medium" color="text.secondary">
                ${orderSummary.fee.toFixed(2)}
              </Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body1" fontWeight="bold">
                {orderSummary.isBuySide ? 'Total Cost' : 'Net Proceeds'}
              </Typography>
              <Typography
                variant="body1"
                fontWeight="bold"
                color={canAfford ? 'text.primary' : 'error.main'}
              >
                ${orderSummary.total.toFixed(2)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Available Cash
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ${availableCash.toFixed(2)}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Error Messages */}
        {!canAfford && orderSummary && orderSummary.total > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Insufficient cash. You need ${(orderSummary.total - availableCash).toFixed(2)} more.
          </Alert>
        )}

        {tradeMutation.isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {tradeMutation.error instanceof Error
              ? tradeMutation.error.message
              : 'Failed to submit trade. Please try again.'}
          </Alert>
        )}

        {tradeMutation.isSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Trade executed successfully!
          </Alert>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={!isValid || tradeMutation.isPending}
          color={sideColors[side]}
          sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}
        >
          {tradeMutation.isPending ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            `${side} ${symbol || 'Stock'}`
          )}
        </Button>
      </Box>
    </Paper>
  );
};

export default TradeForm;
