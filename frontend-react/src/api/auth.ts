/**
 * Authentication API calls
 */
import apiClient from './client';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface User {
  id: number;
  username: string;
  email: string;
  display_name?: string;
  profile?: UserProfile;
}

export interface UserProfile {
  display_name: string;
  bio?: string;
  avatar_url?: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  display_name?: string;
}

/**
 * Login user
 */
export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  const formData = new URLSearchParams();
  formData.append('username', credentials.username);
  formData.append('password', credentials.password);

  const response = await apiClient.post<LoginResponse>('/auth/login', formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  return response.data;
};

/**
 * Register new user
 */
export const register = async (data: RegisterRequest): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/auth/register', data);
  return response.data;
};

/**
 * Logout user
 */
export const logout = async (): Promise<void> => {
  await apiClient.post('/auth/logout');
};

/**
 * Get current user
 */
export const getCurrentUser = async (): Promise<User> => {
  const response = await apiClient.get<User>('/auth/me');
  return response.data;
};

/**
 * Refresh access token
 */
export const refreshToken = async (refreshToken: string): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/auth/refresh', {
    refresh_token: refreshToken,
  });
  return response.data;
};
