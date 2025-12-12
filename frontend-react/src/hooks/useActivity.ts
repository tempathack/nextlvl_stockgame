/**
 * Activity feed hooks using React Query
 */
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import * as activityApi from '../api/activity';

/**
 * Hook to fetch activity feed with auto-refresh every 5 seconds
 */
export const useActivityFeed = (
  limit = 50,
  offset = 0
): UseQueryResult<activityApi.ActivityFeedResponse> => {
  return useQuery({
    queryKey: ['activity', 'feed', limit, offset],
    queryFn: () => activityApi.getActivityFeed(limit, offset),
    staleTime: 5 * 1000, // 5 seconds
    refetchInterval: 5 * 1000, // Auto-refresh every 5 seconds
  });
};

/**
 * Hook to fetch activity for a specific user
 */
export const useUserActivity = (
  userId: number,
  limit = 50,
  offset = 0
): UseQueryResult<activityApi.ActivityFeedResponse> => {
  return useQuery({
    queryKey: ['activity', 'user', userId, limit, offset],
    queryFn: () => activityApi.getUserActivity(userId, limit, offset),
    enabled: !!userId,
    staleTime: 5 * 1000,
    refetchInterval: 5 * 1000,
  });
};
