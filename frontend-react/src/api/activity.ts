/**
 * Activity feed API calls
 */
import apiClient from './client';

export interface TradeActivity {
  id: number;
  user_id: number;
  portfolio_id: number;
  display_name: string;
  symbol: string;
  side: 'buy' | 'sell' | 'short' | 'cover';
  quantity: string;
  price: string;
  total_value: string;
  executed_at: string;
}

export interface ActivityFeedResponse {
  activities: TradeActivity[];
  total: number;
  limit: number;
  offset: number;
}

export interface ActivityFeedParams {
  limit?: number;
  offset?: number;
}

/**
 * Get recent activity feed
 */
export const getActivityFeed = async (
  params: ActivityFeedParams = {}
): Promise<ActivityFeedResponse> => {
  const { limit = 50, offset = 0 } = params;
  const response = await apiClient.get<ActivityFeedResponse>('/activity', {
    params: { limit, offset },
  });
  return response.data;
};

/**
 * Get activity for specific user
 */
export const getUserActivity = async (
  userId: number,
  params: ActivityFeedParams = {}
): Promise<ActivityFeedResponse> => {
  const { limit = 50, offset = 0 } = params;
  const response = await apiClient.get<ActivityFeedResponse>(`/activity/user/${userId}`, {
    params: { limit, offset },
  });
  return response.data;
};

/**
 * Activity API object for consistent imports
 */
export const activityApi = {
  getActivityFeed,
  getUserActivity,
};
