/**
 * Insider Trades API calls
 */
import apiClient from './client';

// Types
export interface InsiderTrade {
  id: number;
  symbol: string;
  company_name: string | null;
  insider_name: string;
  insider_title: string | null;
  relationship: string | null;
  transaction_type: string;
  transaction_code: string | null;
  shares_traded: number;
  price_per_share: number | null;
  total_value: number | null;
  shares_owned_after: number | null;
  transaction_date: string;
  filing_date: string;
  // Price impact
  price_at_trade: number | null;
  price_current: number | null;
  return_1w_pct: number | null;
  return_1m_pct: number | null;
  return_3m_pct: number | null;
  return_to_current_pct: number | null;
  // Benchmark
  sp500_return_1w_pct: number | null;
  sp500_return_1m_pct: number | null;
  sp500_return_3m_pct: number | null;
  alpha_1w_pct: number | null;
  alpha_1m_pct: number | null;
  alpha_3m_pct: number | null;
  filing_url: string | null;
}

export interface InsiderTradeListResponse {
  trades: InsiderTrade[];
  total: number;
  limit: number;
  offset: number;
}

export interface InsiderSummary {
  symbol: string;
  total_trades: number;
  buy_count: number;
  sell_count: number;
  total_buy_value: number;
  total_sell_value: number;
  net_insider_value: number;
  avg_buy_return_1m: number | null;
  avg_sell_return_1m: number | null;
  most_recent_trade_date: string;
  top_insider: string;
}

export interface TopInsider {
  insider_name: string;
  total_trades: number;
  buy_count: number;
  sell_count: number;
  symbols: string[];
  total_value: number;
  avg_return_1m: number | null;
}

export interface InsiderStats {
  period_days: number;
  total_trades: number;
  unique_stocks: number;
  unique_insiders: number;
  total_buy_value: number;
  total_sell_value: number;
  net_insider_sentiment: number;
  avg_buy_return_1m: number | null;
  avg_sell_return_1m: number | null;
}

export interface InsiderTradeParams {
  symbol?: string;
  transaction_type?: string;
  insider_name?: string;
  min_value?: number;
  days_back?: number;
  sort_by?: string;
  sort_order?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get insider trades with optional filters
 */
export const getInsiderTrades = async (
  params: InsiderTradeParams = {}
): Promise<InsiderTradeListResponse> => {
  const response = await apiClient.get<InsiderTradeListResponse>('/insider-trades/', {
    params,
  });
  return response.data;
};

/**
 * Get insider trades for a specific symbol
 */
export const getTradesBySymbol = async (
  symbol: string,
  params?: { days_back?: number; limit?: number; offset?: number }
): Promise<InsiderTradeListResponse> => {
  const response = await apiClient.get<InsiderTradeListResponse>(
    `/insider-trades/symbol/${symbol}`,
    {
      params,
    }
  );
  return response.data;
};

/**
 * Get insider summary by stock symbol
 */
export const getInsiderSummary = async (
  params?: { days_back?: number; sort_by?: string; limit?: number }
): Promise<InsiderSummary[]> => {
  const response = await apiClient.get<InsiderSummary[]>('/insider-trades/summary', {
    params,
  });
  return response.data;
};

/**
 * Get top performing insiders
 */
export const getTopInsiders = async (
  params?: { days_back?: number; transaction_type?: string; limit?: number }
): Promise<TopInsider[]> => {
  const response = await apiClient.get<TopInsider[]>('/insider-trades/top-insiders', {
    params,
  });
  return response.data;
};

/**
 * Get insider trading statistics
 */
export const getInsiderStats = async (days_back?: number): Promise<InsiderStats> => {
  const response = await apiClient.get<InsiderStats>('/insider-trades/stats', {
    params: days_back ? { days_back } : undefined,
  });
  return response.data;
};

/**
 * Get S&P 500 tickers for autocomplete
 */
export const getSP500Tickers = async (): Promise<string[]> => {
  const response = await apiClient.get<{ tickers: string[]; count: number }>(
    '/analysis/sp500/tickers'
  );
  return response.data.tickers;
};

/**
 * Insider Trades API object for consistent imports
 */
export const insiderTradesApi = {
  getInsiderTrades,
  getTradesBySymbol,
  getInsiderSummary,
  getTopInsiders,
  getInsiderStats,
  getSP500Tickers,
};

export default insiderTradesApi;
