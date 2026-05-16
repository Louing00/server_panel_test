export interface User {
  id: string;
  username: string;
  email: string;
  createdAt?: string;
}

export interface ServerEntity {
  id: string;
  name: string;
  host: string;
  port: number;
  sshUsername: string;
  authType: string;
  status: 'online' | 'offline' | 'unknown';
  lastCheckedAt?: string;
  createdAt: string;
}

export interface ServerMetric {
  id: string;
  serverId: string;
  cpuUsage: number | null;
  memUsage: number | null;
  memTotal: number | null;
  diskUsage: number | null;
  diskTotal: number | null;
  netRx: number | null;
  netTx: number | null;
  loadAvg: number | null;
  uptime: number | null;
  recordedAt: string;
}

export interface FileEntry {
  name: string;
  type: 'file' | 'dir' | 'link';
  size: number;
  permissions: string;
  mtime: number;
}

export interface CreateServerDto {
  name: string;
  host: string;
  port: number;
  sshUsername: string;
  authType: string;
  sshPassword?: string;
  sshKey?: string;
}
