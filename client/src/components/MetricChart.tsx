import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import type { ServerMetric } from '../types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface Props {
  history: ServerMetric[];
}

export default function MetricChart({ history }: Props) {
  if (!history || history.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center text-gray-500 text-sm">
        暂无监控数据，系统每 30 秒采集一次资源指标。
      </div>
    );
  }

  const labels = history.map((m) =>
    new Date(m.recordedAt).toLocaleTimeString(),
  );

  const cpuData = history.map((m) => m.cpuUsage ?? null);
  const memData = history.map((m) =>
    m.memUsage != null && m.memTotal != null
      ? (m.memUsage / m.memTotal) * 100
      : null,
  );

  const data = {
    labels,
    datasets: [
      {
        label: 'CPU 使用率 %',
        data: cpuData,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 1.5,
      },
      {
        label: '内存使用率 %',
        data: memData,
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 1.5,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: '#9ca3af', font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: '#1f2937',
        borderColor: '#374151',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: { color: '#6b7280', font: { size: 10 }, maxTicksLimit: 10 },
        grid: { color: '#1f2937' },
      },
      y: {
        min: 0,
        max: 100,
        ticks: { color: '#6b7280', font: { size: 10 }, callback: (v: string | number) => v + '%' },
        grid: { color: '#1f2937' },
      },
    },
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <h3 className="text-sm font-semibold mb-3 text-gray-300">CPU / 内存 历史趋势</h3>
      <div className="h-72">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
