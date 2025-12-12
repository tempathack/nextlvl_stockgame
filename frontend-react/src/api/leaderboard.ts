/**
 * Leaderboard API Client
 *
 * Re-exports leaderboard-related functions from portfolio API
 * for better organization and cleaner imports.
 */

import { getUserPortfolio, getLeaderboard } from './portfolio';

export const leaderboardApi = {
  getUserPortfolio,
  getLeaderboard,
};

export * from './portfolio';
