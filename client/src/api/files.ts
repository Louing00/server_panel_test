import apiClient from './client';
import type { FileEntry, ServerMetric } from '../types';

export const filesApi = {
  list: (serverId: string, path = '/') =>
    apiClient.get<FileEntry[]>(`/servers/${serverId}/files`, { params: { path } }),
  read: (serverId: string, path: string) =>
    apiClient.get<string>(`/servers/${serverId}/files/read`, { params: { path } }),
  write: (serverId: string, path: string, content: string) =>
    apiClient.post(`/servers/${serverId}/files/write`, { path, content }),
  delete: (serverId: string, path: string) =>
    apiClient.delete(`/servers/${serverId}/files`, { params: { path } }),
  mkdir: (serverId: string, path: string) =>
    apiClient.post(`/servers/${serverId}/files/mkdir`, { path }),
  rename: (serverId: string, oldPath: string, newPath: string) =>
    apiClient.post(`/servers/${serverId}/files/rename`, { oldPath, newPath }),
};

export const metricsApi = {
  latest: (serverId: string) =>
    apiClient.get<ServerMetric>(`/servers/${serverId}/metrics/latest`),
  history: (serverId: string, from?: string, to?: string) =>
    apiClient.get<ServerMetric[]>(`/servers/${serverId}/metrics`, {
      params: { from, to },
    }),
};
