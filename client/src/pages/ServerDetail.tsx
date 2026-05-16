import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Terminal as TermIcon, FolderOpen, Activity, Edit2, Trash2 } from 'lucide-react';
import { serversApi } from '../api/servers';
import { metricsApi } from '../api/files';
import Terminal from '../components/Terminal';
import FileExplorer from '../components/FileExplorer';
import MetricBar from '../components/MetricBar';
import MetricChart from '../components/MetricChart';
import type { ServerEntity, ServerMetric } from '../types';

type Tab = 'terminal' | 'files' | 'metrics';

export default function ServerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [server, setServer] = useState<ServerEntity | null>(null);
  const [metric, setMetric] = useState<ServerMetric | null>(null);
  const [history, setHistory] = useState<ServerMetric[]>([]);
  const [tab, setTab] = useState<Tab>('terminal');
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', host: '', port: 22, sshUsername: '', authType: 'password', sshPassword: '', sshKey: '' });

  const fetchServer = useCallback(async () => {
    if (!id) return;
    try {
      const res = await serversApi.list();
      const s = res.data.find((s) => s.id === id);
      if (s) {
        setServer(s);
        setEditForm({ name: s.name, host: s.host, port: s.port, sshUsername: s.sshUsername, authType: s.authType, sshPassword: '', sshKey: '' });
      }
    } catch {}
  }, [id]);

  const fetchMetrics = useCallback(async () => {
    if (!id) return;
    try {
      const [latest, hist] = await Promise.all([
        metricsApi.latest(id),
        metricsApi.history(id),
      ]);
      setMetric(latest.data || null);
      setHistory(hist.data || []);
    } catch {}
  }, [id]);

  useEffect(() => {
    fetchServer();
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, [fetchServer, fetchMetrics]);

  const handleDelete = async () => {
    if (!id) return;
    await serversApi.delete(id);
    navigate('/');
  };

  const handleSaveEdit = async () => {
    if (!id) return;
    const data: any = { ...editForm };
    if (!editForm.sshPassword) delete data.sshPassword;
    if (!editForm.sshKey) delete data.sshKey;
    await serversApi.update(id, data);
    setEditMode(false);
    fetchServer();
  };

  if (!server) {
    return <div className="flex items-center justify-center h-64 text-gray-500">加载中...</div>;
  }

  const tabs: { key: Tab; icon: React.ReactNode; label: string }[] = [
    { key: 'terminal', icon: <TermIcon className="w-4 h-4" />, label: '终端' },
    { key: 'files', icon: <FolderOpen className="w-4 h-4" />, label: '文件' },
    { key: 'metrics', icon: <Activity className="w-4 h-4" />, label: '监控' },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>

        {editMode ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm w-32"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
            <button onClick={handleSaveEdit} className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs text-white">保存</button>
            <button onClick={() => setEditMode(false)} className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-xs">取消</button>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold">{server.name}</h1>
            <span className={`w-2 h-2 rounded-full ${server.status === 'online' ? 'bg-green-500' : server.status === 'offline' ? 'bg-red-500' : 'bg-gray-500'}`} />
            <span className="text-xs text-gray-400">{server.status}</span>
            <button onClick={() => setEditMode(true)} className="ml-auto text-gray-400 hover:text-white">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={handleDelete} className="text-gray-400 hover:text-red-400">
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      <div className="flex gap-1 mb-4 border-b border-gray-800">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px ${
              tab === t.key ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'terminal' && id && <Terminal serverId={id} />}
      {tab === 'files' && id && <FileExplorer serverId={id} />}
      {tab === 'metrics' && (
        <div className="space-y-6">
          {metric && <MetricBar metric={metric} />}
          <MetricChart history={history} />
        </div>
      )}
    </div>
  );
}
