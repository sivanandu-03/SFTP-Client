'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Folder, File, FileText, Image as ImageIcon, FileQuestion, Upload, Trash2, Edit2, X, Download, HardDrive } from 'lucide-react';

type FileItem = { name: string; type: string; size: number; modifyTime: number; rights: any };

export default function SftpClient({ initialPath, initialFiles, error }: { initialPath: string, initialFiles: FileItem[], error?: string }) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [files, setFiles] = useState<FileItem[]>(initialFiles);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<{ type: string, content: string | Blob, meta?: any } | null>(null);
  const [errorMsg, setErrorMsg] = useState(error || '');

  const fetchDir = async (path: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/sftp/list?path=${encodeURIComponent(path)}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setFiles(data);
      setCurrentPath(path);
      setPreviewFile(null);
      setPreviewContent(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load directory');
    } finally {
      setLoading(false);
    }
  };

  const handleDirClick = (dirName: string) => {
    const newPath = currentPath === '/' ? `/${dirName}` : `${currentPath}/${dirName}`;
    fetchDir(newPath);
  };

  const handleBreadcrumbClick = (index: number) => {
    const parts = currentPath.split('/').filter(Boolean);
    const target = '/' + parts.slice(0, index + 1).join('/');
    fetchDir(target);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    const formData = new FormData();
    formData.append('path', currentPath);
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/sftp/upload');
    
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setUploadProgress((event.loaded / event.total) * 100);
      }
    };

    xhr.onload = () => {
      setUploadProgress(null);
      if (xhr.status === 201) {
        fetchDir(currentPath);
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          setErrorMsg(err.error || 'Upload failed');
        } catch {
          setErrorMsg('Upload failed');
        }
      }
    };

    xhr.onerror = () => {
      setUploadProgress(null);
      setErrorMsg('Upload request failed');
    };

    xhr.send(formData);
  };

  const handleDelete = async (fileName: string) => {
    if (!confirm(`Are you sure you want to delete ${fileName}?`)) return;
    const target = currentPath === '/' ? `/${fileName}` : `${currentPath}/${fileName}`;
    try {
      const res = await fetch(`/api/sftp/delete?path=${encodeURIComponent(target)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      fetchDir(currentPath);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete');
    }
  };

  const handleRename = async (fileName: string) => {
    const newName = prompt(`Rename ${fileName} to:`, fileName);
    if (!newName || newName === fileName) return;
    
    const target = currentPath === '/' ? `/${fileName}` : `${currentPath}/${fileName}`;
    const newTarget = currentPath === '/' ? `/${newName}` : `${currentPath}/${newName}`;
    
    try {
      const res = await fetch('/api/sftp/rename', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromPath: target, toPath: newTarget })
      });
      if (!res.ok) throw new Error(await res.text());
      fetchDir(currentPath);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to rename');
    }
  };

  const handlePreview = async (file: FileItem) => {
    const target = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
    setPreviewFile(file.name);
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    
    if (['txt', 'json', 'md', 'csv'].includes(ext || '')) {
      try {
        const res = await fetch(`/api/sftp/download?path=${encodeURIComponent(target)}`);
        const text = await res.text();
        setPreviewContent({ type: 'text', content: text });
      } catch {
        setPreviewContent({ type: 'unsupported', content: '', meta: file });
      }
    } else if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext || '')) {
      try {
        const res = await fetch(`/api/sftp/download?path=${encodeURIComponent(target)}`);
        const blob = await res.blob();
        setPreviewContent({ type: 'image', content: blob });
      } catch {
        setPreviewContent({ type: 'unsupported', content: '', meta: file });
      }
    } else {
      setPreviewContent({ type: 'unsupported', content: '', meta: file });
    }
  };

  const getBreadcrumbs = () => {
    const parts = currentPath.split('/').filter(Boolean);
    return [
      { name: 'Root', path: '/' },
      ...parts.map((p, i) => ({ name: p, index: i }))
    ];
  };

  const sortedFiles = [...files].sort((a, b) => {
    if (a.type === 'd' && b.type !== 'd') return -1;
    if (a.type !== 'd' && b.type === 'd') return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="flex h-full min-h-[600px] text-zinc-300">
      {/* Directory Tree Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-900/50 p-4" data-test-id="directory-tree">
        <div className="font-semibold text-zinc-100 mb-4 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-indigo-400" />
          Directory Tree
        </div>
        <div className="space-y-1">
          <button 
            onClick={() => fetchDir('/')}
            className={`w-full text-left px-2 py-1.5 rounded flex items-center gap-2 hover:bg-zinc-800 transition-colors ${currentPath === '/' ? 'bg-indigo-500/20 text-indigo-300' : ''}`}
          >
            <Folder className="w-4 h-4" /> / (Root)
          </button>
          {currentPath !== '/' && (
             <div className="pl-4 mt-2">
               <button className="w-full text-left px-2 py-1.5 rounded flex items-center gap-2 bg-indigo-500/20 text-indigo-300">
                 <Folder className="w-4 h-4" /> {currentPath.split('/').pop()}
               </button>
             </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative bg-zinc-950">
        {/* Topbar: Breadcrumbs & Actions */}
        <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/30 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center space-x-2 text-sm" data-test-id="breadcrumbs">
            {getBreadcrumbs().map((b: any, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="text-zinc-600">/</span>}
                <button 
                  onClick={() => b.path ? fetchDir(b.path) : handleBreadcrumbClick(b.index)}
                  className="hover:text-indigo-400 hover:underline transition-colors focus:outline-none"
                >
                  {b.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-indigo-900/20">
              <Upload className="w-4 h-4" /> Upload
              <input type="file" className="hidden" onChange={handleUpload} />
            </label>
          </div>
        </div>

        {errorMsg && (
          <div className="m-4 p-3 bg-red-900/20 border border-red-900/50 text-red-400 rounded-md text-sm flex items-center justify-between">
            {errorMsg}
            <button onClick={() => setErrorMsg('')}><X className="w-4 h-4" /></button>
          </div>
        )}

        {uploadProgress !== null && (
          <div className="mx-6 mt-4">
            <div className="flex justify-between text-xs text-zinc-400 mb-1">
              <span>Uploading...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
                data-test-id="upload-progress-bar"
              ></div>
            </div>
          </div>
        )}

        {/* File List */}
        <div className="flex-1 overflow-auto p-6" data-test-id="file-list-view">
          {loading ? (
             <div className="flex flex-col items-center justify-center h-48 space-y-3 text-zinc-500">
               <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
               <p>Loading directory...</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedFiles.map((f, i) => (
                <div 
                  key={i} 
                  data-test-id={f.type === 'd' ? "dir-item" : "file-item"}
                  className="group relative bg-zinc-900/40 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 transition-all duration-200 flex items-center gap-3"
                >
                  <div className="flex-shrink-0" onClick={() => f.type === 'd' ? handleDirClick(f.name) : handlePreview(f)}>
                    {f.type === 'd' ? <Folder className="w-10 h-10 text-indigo-400 fill-indigo-400/20" /> : <File className="w-10 h-10 text-zinc-400" />}
                  </div>
                  <div className="flex-1 min-w-0" onClick={() => f.type === 'd' ? handleDirClick(f.name) : handlePreview(f)}>
                    <div className="text-sm font-medium text-zinc-200 truncate cursor-pointer hover:text-indigo-400">{f.name}</div>
                    <div className="text-xs text-zinc-500">
                      {f.type === 'd' ? 'Directory' : `${(f.size / 1024).toFixed(1)} KB`}
                    </div>
                  </div>
                  
                  {/* Hover Actions */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800/90 rounded-lg p-1 backdrop-blur-sm border border-zinc-700">
                    <button onClick={() => handleRename(f.name)} className="p-1.5 text-zinc-400 hover:text-indigo-400 rounded-md hover:bg-zinc-700" title="Rename"><Edit2 className="w-3.5 h-3.5" /></button>
                    {f.type !== 'd' && (
                      <a href={`/api/sftp/download?path=${encodeURIComponent(currentPath === '/' ? '/' + f.name : currentPath + '/' + f.name)}`} download className="p-1.5 text-zinc-400 hover:text-green-400 rounded-md hover:bg-zinc-700" title="Download"><Download className="w-3.5 h-3.5" /></a>
                    )}
                    <button onClick={() => handleDelete(f.name)} className="p-1.5 text-zinc-400 hover:text-red-400 rounded-md hover:bg-zinc-700" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
              {sortedFiles.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-zinc-500">
                  <Folder className="w-16 h-16 mb-4 opacity-20" />
                  <p>This directory is empty</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Preview Panel Overlay */}
        {previewFile && (
          <div className="absolute right-0 top-14 bottom-0 w-[400px] border-l border-zinc-800 bg-zinc-900 shadow-2xl flex flex-col transform transition-transform" data-test-id="preview-panel">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <h3 className="font-medium text-zinc-200 truncate pr-4">{previewFile}</h3>
              <button onClick={() => setPreviewFile(null)} className="text-zinc-500 hover:text-zinc-300 bg-zinc-800 p-1.5 rounded-md"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-zinc-950/50">
              {!previewContent ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-3">
                   <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
                   <span>Loading preview...</span>
                </div>
              ) : previewContent.type === 'text' ? (
                <pre className="text-xs bg-zinc-950 p-4 rounded-lg overflow-auto border border-zinc-800 text-zinc-300 font-mono shadow-inner h-full" data-test-id="preview-text">
                  {previewContent.content as string}
                </pre>
              ) : previewContent.type === 'image' ? (
                <div className="flex items-center justify-center h-full bg-zinc-950 rounded-lg border border-zinc-800 shadow-inner p-2">
                  <img src={URL.createObjectURL(previewContent.content as Blob)} alt="Preview" className="max-w-full max-h-full object-contain rounded" data-test-id="preview-image" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-zinc-400 bg-zinc-950 rounded-lg border border-zinc-800 p-6 text-center" data-test-id="preview-unsupported">
                  <FileQuestion className="w-16 h-16 text-zinc-600 mb-4" />
                  <h4 className="text-zinc-200 font-medium mb-1">Preview not available</h4>
                  <p className="text-sm mb-6">This file type cannot be previewed in the browser.</p>
                  
                  <div className="w-full bg-zinc-900 rounded p-4 text-left text-sm space-y-2 border border-zinc-800 mb-6">
                    <div className="flex justify-between"><span className="text-zinc-500">Name:</span> <span className="text-zinc-300 truncate ml-2">{previewContent.meta?.name}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500">Size:</span> <span className="text-zinc-300">{Math.round(previewContent.meta?.size / 1024)} KB</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500">Modified:</span> <span className="text-zinc-300">{new Date(previewContent.meta?.modifyTime).toLocaleString()}</span></div>
                  </div>

                  <a 
                    href={`/api/sftp/download?path=${encodeURIComponent(currentPath === '/' ? '/' + previewFile : currentPath + '/' + previewFile)}`} 
                    download
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-indigo-900/20"
                  >
                    <Download className="w-4 h-4" /> Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
