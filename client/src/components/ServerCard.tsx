import { Link } from 'react-router-dom';
import { Server, Trash2, RefreshCw } from 'lucide-react';
import type { ServerEntity, ServerMetric } from '../types';

interface Props {
  server: ServerEntity;
  metric?: ServerMetric;
  onDelete: (id: string) => void;
  onRefresh: (id: string) => void;
}

export default function ServerCard({ server, metric, onDelete, onRefresh }: Props) {
  const statusColor =
    server.status === 'online' ? 'bg-green-500' : server.status === 'offline' ? 'bg-red-500' : 'bg-gray-500';

  const uptimeStr = metric?.uptime ? formatUptime(metric.uptime) : null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors">
      <Link to={`/servers/${server.id}`} className="block">
        <div className="flex items-center gap-2 mb-2">
          <Server className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-sm truncate">{server.name}</h3>
          <span className={`ml-auto w-2 h-2 rounded-full shrink-0 ${statusColor}`} />
        </div>
        <p className="text-xs text-gray-500 mb-3">
          {server.host}:{server.port} · {server.sshUsername}
        </p>
      </Link>

      {metric && (
        <div className="space-y-1.5 mb-3">
          {metric.cpuUsage != null && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 w-8">CPU</span>
              <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full"
                  style={{ width: `${Math.min(metric.cpuUsage, 100)}%` }}
                />
              </div>
              <span className="text-gray-400 w-10 text-right">{metric.cpuUsage.toFixed(0)}%</span>
            </div>
          )}
          {metric.memUsage != null && metric.memTotal != null && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 w-8">MEM</span>
              <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                <div
                  className="bg-green-500 h-1.5 rounded-full"
                  style={{ width: `${Math.min((metric.memUsage / metric.memTotal) * 100, 100)}%` }}
                />
              </div>
              <span className="text-gray-400 w-16 text-right">{toGiB(metric.memUsage)} / {toGiB(metric.memTotal)}</span>
            </div>
          )}
          {uptimeStr && (
            <p className="text-xs text-gray-500">Up {uptimeStr}</p>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Link
          to={`/servers/${server.id}`}
          className="flex-1 bg-gray-800 hover:bg-gray-700 text-xs text-center px-3 py-1.5 rounded"
        >
          Open
        </Link>
        <button
          onClick={() => onRefresh(server.id)}
          className="text-gray-500 hover:text-white p-1"
          title="Check health"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(server.id)}
          className="text-gray-500 hover:text-red-400 p-1"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function toGiB(mb: number): string {
  const gb = mb / 1024;
  return gb >= 1 ? `${gb.toFixed(1)}G` : `${mb.toFixed(0)}M`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h`;
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}
