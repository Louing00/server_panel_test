import { useEffect, useRef, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { Power } from 'lucide-react';

interface Props {
  serverId: string;
}

export default function Terminal({ serverId }: Props) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const { connect, disconnect, socketRef } = useWebSocket();
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = () => {
    setError(null);

    if (!terminalRef.current) return;

    if (!xtermRef.current) {
      const term = new XTerm({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: { background: '#111827', foreground: '#e5e7eb', cursor: '#3b82f6' },
      });
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.loadAddon(new WebLinksAddon());
      term.open(terminalRef.current);
      fitAddon.fit();
      xtermRef.current = term;
      fitAddonRef.current = fitAddon;
    }

    const socket = connect(serverId);

    socket.on('terminal:connected', () => {
      setConnected(true);
    });

    socket.on('terminal:output', (data: string) => {
      xtermRef.current?.write(data);
    });

    socket.on('terminal:error', (msg: string) => {
      setError(msg);
      setConnected(false);
    });

    socket.on('terminal:close', () => {
      xtermRef.current?.writeln('\n\r\x1b[33m连接已关闭\x1b[0m');
      setConnected(false);
    });

    xtermRef.current?.onData((data) => {
      socket.emit('terminal:input', data);
    });

    xtermRef.current?.onResize(({ cols, rows }) => {
      socket.emit('terminal:resize', { cols, rows });
    });
  };

  const handleDisconnect = () => {
    disconnect();
    setConnected(false);
      xtermRef.current?.writeln('\n\r\x1b[33m已断开连接\x1b[0m');
  };

  useEffect(() => {
    return () => {
      disconnect();
      xtermRef.current?.dispose();
      xtermRef.current = null;
    };
  }, []);

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={connected ? handleDisconnect : handleConnect}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs ${
            connected
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          <Power className="w-3.5 h-3.5" />
          {connected ? '断开连接' : '连接'}
        </button>
        {connected && <span className="text-xs text-green-400">已连接</span>}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
      <div
        ref={terminalRef}
        className="w-full h-[500px] bg-gray-900 rounded border border-gray-800 overflow-hidden"
      />
    </div>
  );
}
