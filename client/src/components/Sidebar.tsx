import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Server, LogOut } from 'lucide-react';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  return (
    <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
      <Link to="/" className="flex items-center gap-2 px-4 py-4 border-b border-gray-800">
        <Server className="w-5 h-5 text-blue-500" />
        <span className="font-semibold text-sm">ServerManager</span>
      </Link>

      <nav className="flex-1 px-2 py-3 space-y-1">
        <Link
          to="/"
          className={`block px-3 py-2 rounded text-sm ${
            pathname === '/' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
          }`}
        >
          服务器列表
        </Link>
      </nav>

      <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-between">
        <span className="text-sm text-gray-400 truncate">{user?.username}</span>
        <button onClick={logout} className="text-gray-500 hover:text-red-400">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
