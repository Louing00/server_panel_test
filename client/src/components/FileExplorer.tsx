import { useEffect, useState, useCallback } from 'react';
import { Folder, File, ChevronRight, ChevronDown, Plus, Trash2, Edit3, X } from 'lucide-react';
import { filesApi } from '../api/files';
import type { FileEntry } from '../types';

interface Props {
  serverId: string;
}

export default function FileExplorer({ serverId }: Props) {
  const [path, setPath] = useState('/');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [editing, setEditing] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [creatingDir, setCreatingDir] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await filesApi.list(serverId, path);
      setFiles(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to list files');
    } finally {
      setLoading(false);
    }
  }, [serverId, path]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleOpenFile = async (file: FileEntry) => {
    if (file.type === 'dir') {
      setPath((prev) => prev === '/' ? `/${file.name}` : `${prev}/${file.name}`);
      return;
    }
    setSelectedFile(file);
    try {
      const filePath = path === '/' ? `/${file.name}` : `${path}/${file.name}`;
      const res = await filesApi.read(serverId, filePath);
      setFileContent(res.data);
    } catch (err: any) {
      setFileContent('Error reading file');
    }
  };

  const handleSaveFile = async () => {
    if (!selectedFile) return;
    const filePath = path === '/' ? `/${selectedFile.name}` : `${path}/${selectedFile.name}`;
    await filesApi.write(serverId, filePath, fileContent);
    setEditing(false);
  };

  const handleDelete = async (name: string, type: string) => {
    const fullPath = path === '/' ? `/${name}` : `${path}/${name}`;
    await filesApi.delete(serverId, fullPath);
    fetchFiles();
  };

  const handleCreateDir = async () => {
    if (!newItemName) return;
    const fullPath = path === '/' ? `/${newItemName}` : `${path}/${newItemName}`;
    await filesApi.mkdir(serverId, fullPath);
    setNewItemName('');
    setCreatingDir(false);
    fetchFiles();
  };

  const handleRename = async (oldName: string) => {
    if (!renameValue || renameValue === oldName) { setRenaming(null); return; }
    const oldPath = path === '/' ? `/${oldName}` : `${path}/${oldName}`;
    const newPath = path === '/' ? `/${renameValue}` : `${path}/${renameValue}`;
    await filesApi.rename(serverId, oldPath, newPath);
    setRenaming(null);
    fetchFiles();
  };

  const goUp = () => {
    if (path === '/') return;
    const parts = path.split('/').filter(Boolean);
    parts.pop();
    setPath(parts.length === 0 ? '/' : `/${parts.join('/')}`);
  };

  const breadcrumbs = path === '/' ? ['/'] : ['/', ...path.split('/').filter(Boolean)];

  return (
    <div className="flex gap-4" style={{ minHeight: 450 }}>
      <div className="w-80 shrink-0 bg-gray-900 rounded border border-gray-800 p-3">
        <div className="flex items-center gap-1 text-xs text-gray-400 mb-2 flex-wrap">
          {breadcrumbs.map((part, idx) => (
            <span key={idx} className="flex items-center gap-1">
              <button
                onClick={() =>
                  setPath(
                    idx === 0 ? '/' : '/' + breadcrumbs.slice(1, idx + 1).join('/')
                  )
                }
                className="hover:text-white"
              >
                {part === '/' ? '/' : `/${part}`}
              </button>
              {idx < breadcrumbs.length - 1 && <span>/</span>}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-1 mb-2">
          <button
            onClick={() => goUp()}
            className="bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-xs"
          >
            ..
          </button>
          <button
            onClick={() => setCreatingDir(true)}
            className="bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-xs flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Dir
          </button>
        </div>

        {creatingDir && (
          <div className="flex gap-1 mb-2">
            <input
              autoFocus
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateDir()}
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white"
            />
            <button onClick={handleCreateDir} className="bg-blue-600 px-2 py-1 rounded text-xs">OK</button>
            <button onClick={() => setCreatingDir(false)} className="bg-gray-700 px-2 py-1 rounded text-xs"><X className="w-3 h-3" /></button>
          </div>
        )}

        {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

        {loading ? (
          <p className="text-xs text-gray-500">加载中...</p>
        ) : (
          <div className="space-y-0.5 max-h-96 overflow-auto">
            {files.map((f) => (
              <div key={f.name} className="flex items-center gap-1 group hover:bg-gray-800 rounded px-1 py-0.5">
                {renaming === f.name ? (
                  <div className="flex gap-1 flex-1">
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRename(f.name)}
                      className="flex-1 bg-gray-700 border border-gray-600 rounded px-1 py-0 text-xs text-white"
                    />
                    <button onClick={() => handleRename(f.name)} className="text-green-400 text-xs">OK</button>
                    <button onClick={() => setRenaming(null)} className="text-gray-400 text-xs"><X className="w-3 h-3" /></button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => handleOpenFile(f)}
                      className="flex items-center gap-1 text-xs text-gray-300 hover:text-white flex-1 truncate text-left"
                    >
                      {f.type === 'dir' ? (
                        <Folder className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                      ) : (
                        <File className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      )}
                      <span className="truncate">{f.name}</span>
                    </button>
                    <span className="text-[10px] text-gray-600 shrink-0">{formatSize(f.size)}</span>
                    <button
                      onClick={() => { setRenaming(f.name); setRenameValue(f.name); }}
                      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-white"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(f.name, f.type)}
                      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 bg-gray-900 rounded border border-gray-800">
        {selectedFile ? (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-2 border-b border-gray-800">
              <span className="text-xs text-gray-400">{selectedFile.name}</span>
              <div className="flex gap-2">
                {editing ? (
                  <>
                    <button onClick={handleSaveFile} className="bg-blue-600 px-2 py-1 rounded text-xs text-white">保存</button>
                    <button onClick={() => setEditing(false)} className="bg-gray-700 px-2 py-1 rounded text-xs">取消</button>
                  </>
                ) : (
                  <button onClick={() => setEditing(true)} className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-xs">
                    <Edit3 className="w-3 h-3" />
                  </button>
                )}
                <button onClick={() => setSelectedFile(null)} className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-xs">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
            {editing ? (
              <textarea
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                className="flex-1 bg-gray-950 text-gray-200 p-3 text-sm font-mono resize-none focus:outline-none border-0"
                spellCheck={false}
              />
            ) : (
              <pre className="flex-1 bg-gray-950 text-gray-300 p-3 text-sm font-mono overflow-auto whitespace-pre-wrap m-0">
                {fileContent}
              </pre>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-600 text-sm">
            选择文件进行查看
          </div>
        )}
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0';
  const k = 1024;
  const sizes = ['B', 'K', 'M', 'G'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
}
