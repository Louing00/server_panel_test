import apiClient from './client';
import type { User } from '../types';

export interface LoginData {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export const authApi = {
  login: (data: LoginData) => apiClient.post<{ user: User }>('/auth/login', data),
  register: (data: RegisterData) => apiClient.post<{ user: User }>('/auth/register', data),
  logout: () => apiClient.post('/auth/logout'),
  me: () => apiClient.get<User>('/auth/me'),
};
