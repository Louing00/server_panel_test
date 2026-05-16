import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';
import { serversApi } from '../api/servers';
import { metricsApi } from '../api/files';
import ServerCard from '../components/ServerCard';
import type { ServerEntity, ServerMetric } from '../types';

export default function Dashboard() {
  const [servers, setServers] = useState<ServerEntity[]>([]);
  const [metricsMap, setMetricsMap] = useState<Record<string, ServerMetric>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: '',
    host: '',
    port: 22,
    sshUsername: 'root',
    authType: 'password',
    sshPassword: '',
    sshKey: '',
  });

  const fetchServers = useCallback(async () => {
    try {
      const res = await serversApi.list();
      setServers(res.data);
    } catch {}
  }, []);

  const fetchMetrics = useCallback(async () => {
    if (servers.length === 0) return;
    const map: Record<string, ServerMetric> = {};
    await Promise.all(
      servers.map(async (s) => {
        try {
          const res = await metricsApi.latest(s.id);
          map[s.id] = res.data;
        } catch {}
      }),
    );
    setMetricsMap(map);
  }, [servers]);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  const handleAdd = async () => {
    try {
      await serversApi.create({
        name: form.name,
        host: form.host,
        port: form.port,
        sshUsername: form.sshUsername,
        authType: form.authType,
        sshPassword: form.sshPassword || undefined,
        sshKey: form.sshKey || undefined,
      });
      setShowAdd(false);
      setForm({ name: '', host: '', port: 22, sshUsername: 'root', authType: 'password', sshPassword: '', sshKey: '' });
      fetchServers();
    } catch {}
  };

  const handleDelete = async (id: string) => {
    await serversApi.delete(id);
    fetchServers();
  };

  const handleRefresh = async (id: string) => {
    await serversApi.checkHealth(id);
    fetchServers();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Servers</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Server
        </button>
      </div>

      {showAdd && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="Host (IP/Domain)"
              value={form.host}
              onChange={(e) => setForm({ ...form, host: e.target.value })}
            />
            <input
              type="number"
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="Port"
              value={form.port}
              onChange={(e) => setForm({ ...form, port: Number(e.target.value) })}
            />
            <input
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="SSH Username"
              value={form.sshUsername}
              onChange={(e) => setForm({ ...form, sshUsername: e.target.value })}
            />
            <select
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              value={form.authType}
              onChange={(e) => setForm({ ...form, authType: e.target.value })}
            >
              <option value="password">Password</option>
              <option value="key">Private Key</option>
            </select>
            {form.authType === 'password' ? (
              <input
                type="password"
                className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                placeholder="SSH Password"
                value={form.sshPassword}
                onChange={(e) => setForm({ ...form, sshPassword: e.target.value })}
              />
            ) : (
              <textarea
                className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 col-span-1"
                placeholder="Private Key"
                rows={3}
                value={form.sshKey}
                onChange={(e) => setForm({ ...form, sshKey: e.target.value })}
              />
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm text-white">
              Save
            </button>
            <button onClick={() => setShowAdd(false)} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {servers.length === 0 ? (
        <div className="text-center text-gray-500 py-20">
          <p className="text-lg">No servers added yet</p>
          <p className="text-sm mt-2">Click "Add Server" to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {servers.map((server) => (
            <ServerCard
              key={server.id}
              server={server}
              metric={metricsMap[server.id]}
              onDelete={handleDelete}
              onRefresh={handleRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}
