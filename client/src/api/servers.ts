import apiClient from './client';
import type { ServerEntity, CreateServerDto } from '../types';

export const serversApi = {
  list: () => apiClient.get<ServerEntity[]>('/servers'),
  create: (data: CreateServerDto) => apiClient.post<ServerEntity>('/servers', data),
  update: (id: string, data: Partial<CreateServerDto>) =>
    apiClient.put<ServerEntity>(`/servers/${id}`, data),
  delete: (id: string) => apiClient.delete(`/servers/${id}`),
  checkHealth: (id: string) => apiClient.post<{ status: string }>(`/servers/${id}/health`),
};
