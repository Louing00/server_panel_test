import { Cpu, HardDrive, Network, Clock, BarChart3 } from 'lucide-react';
import type { ServerMetric } from '../types';

interface Props {
  metric: ServerMetric;
}

export default function MetricBar({ metric }: Props) {
  const items = [
    {
      icon: <Cpu className="w-4 h-4" />,
      label: 'CPU',
      value: metric.cpuUsage != null ? `${metric.cpuUsage.toFixed(1)}%` : '-',
      pct: metric.cpuUsage ?? 0,
      color: 'bg-blue-500',
    },
    {
      icon: <BarChart3 className="w-4 h-4" />,
      label: 'Load',
      value: metric.loadAvg != null ? metric.loadAvg.toFixed(2) : '-',
      pct: 0,
      color: '',
    },
    {
      icon: <HardDrive className="w-4 h-4" />,
      label: 'Disk',
      value:
        metric.diskUsage != null && metric.diskTotal != null
          ? `${toGiB(metric.diskUsage)} / ${toGiB(metric.diskTotal)}`
          : '-',
      pct: metric.diskUsage != null && metric.diskTotal != null ? (metric.diskUsage / metric.diskTotal) * 100 : 0,
      color: 'bg-yellow-500',
    },
    {
      icon: <Network className="w-4 h-4" />,
      label: 'Net',
      value:
        metric.netRx != null && metric.netTx != null
          ? `↓${formatBytes(metric.netRx)}/s ↑${formatBytes(metric.netTx)}/s`
          : '-',
      pct: 0,
      color: '',
    },
    {
      icon: <Clock className="w-4 h-4" />,
      label: 'Uptime',
      value: metric.uptime != null ? formatUptime(metric.uptime) : '-',
      pct: 0,
      color: '',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {items.map((item) => (
        <div key={item.label} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            {item.icon} {item.label}
          </div>
          <div className="text-sm font-semibold">{item.value}</div>
          {item.pct > 0 && (
            <div className="mt-1 bg-gray-800 rounded-full h-1.5">
              <div
                className={`${item.color} h-1.5 rounded-full`}
                style={{ width: `${Math.min(item.pct, 100)}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function toGiB(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return gb >= 1 ? `${gb.toFixed(1)}G` : `${(bytes / (1024 * 1024)).toFixed(0)}M`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}K`;
  return `${(bytes / 1048576).toFixed(1)}M`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h`;
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}
