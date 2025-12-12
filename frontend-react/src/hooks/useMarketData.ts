/**
 * Market data hooks using React Query
 */
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import * as marketApi from '../api/market';

/**
 * Hook to fetch sector heatmap data
 */
export const useSectorHeatmap = (): UseQueryResult<marketApi.SectorHeatmapResponse> => {
  return useQuery({
    queryKey: ['market', 'sectors'],
    queryFn: marketApi.getSectorHeatmap,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};

/**
 * Hook to fetch top movers
 */
export const useTopMovers = (limit = 10): UseQueryResult<marketApi.TopMoversResponse> => {
  return useQuery({
    queryKey: ['market', 'movers', limit],
    queryFn: () => marketApi.getTopMovers(limit),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
};

/**
 * Hook to fetch market indices
 */
export const useMarketIndices = (): UseQueryResult<marketApi.MarketIndicesResponse> => {
  return useQuery({
    queryKey: ['market', 'indices'],
    queryFn: marketApi.getMarketIndices,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 2 * 60 * 1000,
  });
};

/**
 * Hook to fetch quote for a specific symbol
 */
export const useQuote = (
  symbol: string,
  enabled = true
): UseQueryResult<marketApi.Quote> => {
  return useQuery({
    queryKey: ['market', 'quote', symbol],
    queryFn: () => marketApi.getQuote(symbol),
    enabled: enabled && !!symbol,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000,
  });
};

/**
 * Hook to search symbols
 */
export const useSymbolSearch = (
  query: string,
  limit = 20
): UseQueryResult<marketApi.SymbolSearchResponse> => {
  return useQuery({
    queryKey: ['market', 'search', query, limit],
    queryFn: () => marketApi.searchSymbols(query, limit),
    enabled: query.length > 0,
    staleTime: 5 * 60 * 1000,
  });
};
