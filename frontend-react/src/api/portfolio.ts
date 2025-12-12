/**
 * Portfolio API calls
 */
import apiClient from './client';

export interface Position {
  id: number;
  symbol: string;
  quantity: number;
  average_price: number;
  current_price: number;
  cost_basis: number;
  market_value: number;
  pnl: number;
  pnl_pct: number;
  is_short: boolean;
  // Legacy fields for compatibility
  gain_loss?: number | null;
  gain_loss_pct?: number | null;
}

export interface Portfolio {
  user_id: number;
  display_name: string;
  portfolio_id: number;
  cash_balance: number;
  equity_value: number;
  total_value: number;
  total_return_pct: number;
  positions: Position[];
  last_updated: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  display_name: string;
  portfolio_value: number;
  cash_balance: number;
  equity_value: number;
  total_return_pct: number;
  positions_count: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total_players: number;
  limit: number;
  offset: number;
}

export interface TradeRequest {
  symbol: string;
  side: 'buy' | 'sell' | 'short' | 'cover';
  quantity: number;
}

export interface TradeOrder {
  id: number;
  portfolio_id: number;
  user_id: number;
  symbol: string;
  side: string;
  quantity: string;
  price: string;
  notional_value: string;
  fee_amount: string | null;
  status: string;
  submitted_at: string;
  executed_at: string | null;
}

/**
 * Get current user's portfolio
 */
export const getMyPortfolio = async (): Promise<Portfolio> => {
  const response = await apiClient.get<Portfolio>('/users/portfolio');
  return response.data;
};

/**
 * Get public portfolio for any user
 */
export const getUserPortfolio = async (userId: number): Promise<Portfolio> => {
  const response = await apiClient.get<Portfolio>(`/leaderboard/${userId}/portfolio`);
  return response.data;
};

/**
 * Get leaderboard
 */
export const getLeaderboard = async (
  limit = 50,
  offset = 0
): Promise<LeaderboardResponse> => {
  const response = await apiClient.get<LeaderboardResponse>('/leaderboard', {
    params: { limit, offset },
  });
  return response.data;
};

/**
 * Submit a trade order
 */
export const submitTrade = async (trade: TradeRequest): Promise<TradeOrder> => {
  const response = await apiClient.post<TradeOrder>('/trades', trade);
  return response.data;
};

/**
 * Get trade history
 */
export const getTradeHistory = async (
  limit = 50,
  offset = 0
): Promise<{ orders: TradeOrder[]; total: number }> => {
  const response = await apiClient.get('/trades/history', {
    params: { limit, offset },
  });
  return response.data;
};

/**
 * Portfolio API object for consistent imports
 */
export const portfolioApi = {
  getMyPortfolio,
  getUserPortfolio,
  getLeaderboard,
  submitTrade,
  getTradeHistory,
};
