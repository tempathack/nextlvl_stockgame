/**
 * Market data API calls
 */
import apiClient from './client';

export interface Quote {
  symbol: string;
  price: string;
  change: string | null;
  change_pct: string | null;
  volume: number | null;
  name: string | null;
  sector: string | null;
  updated_at: string;
}

export interface SectorData {
  sector: string;
  change_pct: string;
  market_cap: number | null;
}

export interface SectorHeatmapResponse {
  sectors: SectorData[];
  updated_at: string;
}

export interface TopMover {
  symbol: string;
  name: string | null;
  price: string;
  change_pct: string;
  volume: number | null;
}

export interface TopMoversResponse {
  gainers: TopMover[];
  losers: TopMover[];
  most_active: TopMover[];
  updated_at: string;
}

export interface IndexData {
  symbol: string;
  name: string;
  value: string;
  change: string | null;
  change_pct: string | null;
}

export interface MarketIndicesResponse {
  indices: IndexData[];
  updated_at: string;
}

export interface SymbolSearchResult {
  symbol: string;
  name: string;
  sector: string | null;
}

export interface SymbolSearchResponse {
  results: SymbolSearchResult[];
}

/**
 * Get quote for a specific symbol
 */
export const getQuote = async (symbol: string): Promise<Quote> => {
  const response = await apiClient.get<Quote>(`/market/quote/${symbol}`);
  return response.data;
};

/**
 * Get sector heatmap data
 */
export const getSectorHeatmap = async (): Promise<SectorHeatmapResponse> => {
  const response = await apiClient.get<SectorHeatmapResponse>('/market/sectors');
  return response.data;
};

/**
 * Get top movers
 */
export const getTopMovers = async (limit = 10): Promise<TopMoversResponse> => {
  const response = await apiClient.get<TopMoversResponse>('/market/movers', {
    params: { limit },
  });
  return response.data;
};

/**
 * Get market indices
 */
export const getMarketIndices = async (): Promise<MarketIndicesResponse> => {
  const response = await apiClient.get<MarketIndicesResponse>('/market/indices');
  return response.data;
};

/**
 * Search for symbols
 */
export const searchSymbols = async (
  query: string,
  limit = 20
): Promise<SymbolSearchResponse> => {
  const response = await apiClient.get<SymbolSearchResponse>('/market/search', {
    params: { q: query, limit },
  });
  return response.data;
};
