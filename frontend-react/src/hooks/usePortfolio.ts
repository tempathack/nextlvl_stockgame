/**
 * Portfolio hooks using React Query
 */
import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import * as portfolioApi from '../api/portfolio';
import { useAuth } from './useAuth';

/**
 * Hook to fetch current user's portfolio
 */
export const useMyPortfolio = (): UseQueryResult<portfolioApi.Portfolio> => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['portfolio', 'me'],
    queryFn: portfolioApi.getMyPortfolio,
    enabled: isAuthenticated,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000,
  });
};

/**
 * Hook to fetch any user's portfolio (public)
 */
export const useUserPortfolio = (userId: number): UseQueryResult<portfolioApi.Portfolio> => {
  return useQuery({
    queryKey: ['portfolio', 'user', userId],
    queryFn: () => portfolioApi.getUserPortfolio(userId),
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
  });
};

/**
 * Hook to fetch leaderboard
 */
export const useLeaderboard = (
  limit = 50,
  offset = 0
): UseQueryResult<portfolioApi.LeaderboardResponse> => {
  return useQuery({
    queryKey: ['leaderboard', limit, offset],
    queryFn: () => portfolioApi.getLeaderboard(limit, offset),
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000,
  });
};

/**
 * Hook to submit a trade
 */
export const useTrade = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: portfolioApi.submitTrade,
    onSuccess: () => {
      // Invalidate and refetch portfolio data
      queryClient.invalidateQueries({ queryKey: ['portfolio', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
    },
  });
};

/**
 * Hook to fetch trade history
 */
export const useTradeHistory = (
  limit = 50,
  offset = 0,
  enabled = true
): UseQueryResult<{ orders: portfolioApi.TradeOrder[]; total: number }> => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['trades', 'history', limit, offset],
    queryFn: () => portfolioApi.getTradeHistory(limit, offset),
    enabled: isAuthenticated && enabled,
    staleTime: 30 * 1000,
  });
};
