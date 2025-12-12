/**
 * User API Client
 *
 * Handles user profile and preferences management.
 */

import apiClient from './client';

export interface UserProfile {
  displayName: string;
  email: string;
}

export interface UserPreferences {
  emailNotifications: boolean;
  tradeAlerts: boolean;
  weeklyReport: boolean;
}

export interface UpdateProfileRequest {
  displayName: string;
  email: string;
}

export interface UpdatePreferencesRequest {
  emailNotifications: boolean;
  tradeAlerts: boolean;
  weeklyReport: boolean;
}

export const userApi = {
  /**
   * Get user profile
   */
  getProfile: async (): Promise<UserProfile> => {
    const response = await apiClient.get<UserProfile>('/users/profile');
    return response.data;
  },

  /**
   * Update user profile
   */
  updateProfile: async (data: UpdateProfileRequest): Promise<UserProfile> => {
    const response = await apiClient.put<UserProfile>('/users/profile', data);
    return response.data;
  },

  /**
   * Get user preferences
   */
  getPreferences: async (): Promise<UserPreferences> => {
    const response = await apiClient.get<UserPreferences>('/users/preferences');
    return response.data;
  },

  /**
   * Update user preferences
   */
  updatePreferences: async (data: UpdatePreferencesRequest): Promise<UserPreferences> => {
    const response = await apiClient.put<UserPreferences>('/users/preferences', data);
    return response.data;
  },
};
