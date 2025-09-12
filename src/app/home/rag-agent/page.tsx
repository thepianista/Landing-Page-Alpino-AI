'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload, X, Mic, Target, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/sellemond-bakery/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/sellemond-bakery/ui/card';
import Link from 'next/link';
import '@n8n/chat/style.css';
import { createChat } from '@n8n/chat';

type UploadStatus = 'queued' | 'uploading' | 'done' | 'error' | 'canceled';

type UploadItem = {
  id: string;
  file: File;
  progress: number;      // 0-100
  status: UploadStatus;
  error?: string;
  xhr?: XMLHttpRequest;  // para cancelar
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function RAGChatbot() {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isUploadingAny, setIsUploadingAny] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Toast
  const [toastStatus, setToastStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [toastTitle, setToastTitle] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatRef = useRef<any>(null);

  // sessionId estable para memoria del agente
  const [sessionId] = useState(() => {
    if (typeof window === 'undefined') return '';
    const key = 'rag_session_id';
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(key, id);
    return id;
  });

  // ----- Toast helper -----
  const showToast = (status: 'success' | 'error', title: string, message: string) => {
    setToastStatus(status);
    setToastTitle(title);
    setToastMessage(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastStatus('idle'), 4000);
  };

  // ===== n8n Chat =====
  useEffect(() => {
    if (chatRef.current) return;
    chatRef.current = createChat({
      webhookUrl: 'https://ai.alpino-ai.com/webhook/b5721431-951b-4e54-b39d-72eaadff2007/chat',
      target: '#n8n-chat',
      mode: 'fullscreen',
      loadPreviousSession: true,
      chatInputKey: 'chatInput',
      chatSessionKey: 'sessionId',
      metadata: { source: 'rag-agent-front', sessionId },
      showWelcomeScreen: false,
      initialMessages: [
        "Hi! I'm your AI assistant. Ask me anything about the documents you've uploaded.",
      ],
      i18n: {
        en: {
          title: '',
          subtitle: '',
          footer: '',
          getStarted: '',
          inputPlaceholder: 'Type your message…',
          closeButtonTooltip: '',
        },
      },
      enableStreaming: false,
    });
    return () => {
      chatRef.current?.destroy?.();
      chatRef.current = null;
    };
  }, [sessionId]);

  // ===== Previene drag/drop global que rompe el dropzone =====
  useEffect(() => {
    const prevent = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return () => {
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop', prevent);
    };
  }, []);

  // ===== Files: selección manual =====
  const handleChooseFile = () => fileInputRef.current?.click();

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: UploadItem[] = [];
    const tooBig: string[] = [];

    Array.from(files).forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        tooBig.push(`${file.name} (${(file.size / (1024 * 1024)).toFixed(1)}MB)`);
        return;
      }
      newItems.push({
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        progress: 0,
        status: 'queued',
      });
    });

    if (tooBig.length) {
      showToast('error', 'Some files are too large', `These files exceed 10MB and were skipped: ${tooBig.join(', ')}`);
    }

    if (newItems.length) setUploads((prev) => [...prev, ...newItems]);
  };

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    addFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ===== Drag & Drop =====
  const getFilesFromDataTransfer = (dt: DataTransfer): File[] => {
    const out: File[] = [];
    if (dt.items?.length) {
      for (const item of Array.from(dt.items)) {
        if (item.kind === 'file') {
          const f = item.getAsFile();
          if (f) out.push(f);
        }
      }
    } else if (dt.files?.length) {
      out.push(...Array.from(dt.files));
    }
    return out;
  };

  const addFilesFromArray = (files: File[]) => {
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    addFiles(dt.files);
  };

  const onDragEnter: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(true);
  };
  const onDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; setIsDragging(true);
  };
  const onDragLeave: React.DragEventHandler<HTMLDivElement> = (e) => {
    if (e.currentTarget === e.target) setIsDragging(false);
  };
  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const files = getFilesFromDataTransfer(e.dataTransfer);
    if (files.length) addFilesFromArray(files);
  };

  // ===== Upload con XHR (progreso real) =====
  const uploadOne = (item: UploadItem): Promise<void> =>
    new Promise((resolve) => {
      const fd = new FormData();
      fd.append('file', item.file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/rag-agent', true); // <--- tu route actual

      xhr.upload.onprogress = (evt) => {
        if (!evt.lengthComputable) return;
        const percent = Math.round((evt.loaded / evt.total) * 100);
        setUploads((prev) => prev.map((u) => (u.id === item.id ? { ...u, progress: percent } : u)));
      };

      xhr.onreadystatechange = () => {
        if (xhr.readyState !== XMLHttpRequest.DONE) return;

        const ok = xhr.status >= 200 && xhr.status < 300;
        let payload: any = null;
        try { payload = JSON.parse(xhr.responseText || '{}'); } catch { payload = { text: xhr.responseText }; }

        setUploads((prev) =>
          prev.map((u) =>
            u.id === item.id
              ? {
                  ...u,
                  status: ok ? 'done' : u.status === 'canceled' ? 'canceled' : 'error',
                  error: ok ? undefined : payload?.error || xhr.statusText || 'Upload failed',
                  progress: ok ? 100 : u.progress,
                }
              : u
          )
        );

        if (ok) {
          showToast('success', 'File uploaded', `"${item.file.name}" indexed for RAG.`);
        } else if (item.status !== 'canceled') {
          showToast('error', 'Upload failed', `"${item.file.name}" could not be uploaded. ${payload?.error ? `(${payload.error})` : ''}`);
        }
        resolve();
      };

      setUploads((prev) => prev.map((u) => (u.id === item.id ? { ...u, status: 'uploading', xhr } : u)));
      xhr.send(fd);
    });

  const handleUploadAll = async () => {
    const toUpload = uploads.filter((u) => u.status === 'queued' || u.status === 'error');
    if (!toUpload.length) return;

    setIsUploadingAny(true);
    for (const item of toUpload) {
      const current = uploads.find((u) => u.id === item.id);
      if (current?.status === 'canceled') continue;
      await uploadOne(item);
    }
    setIsUploadingAny(false);
  };

  const cancelUpload = (id: string) => {
    setUploads((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        try { u.xhr?.abort?.(); } catch {}
        showToast('error', 'Upload canceled', `"${u.file.name}" was canceled by the user.`);
        return { ...u, status: 'canceled', error: 'Canceled by user' };
      })
    );
  };

  const removeItem = (id: string) => setUploads((prev) => prev.filter((u) => u.id !== id));

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Toast */}
      {(toastStatus === 'success' || toastStatus === 'error') && (
        <div
          className={`fixed top-6 right-6 z-50 min-w-[320px] max-w-md px-6 py-4 rounded-xl shadow-lg flex items-center gap-4 transition-all duration-300
            ${toastStatus === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}
        >
          {toastStatus === 'success' ? <CheckCircle className="h-6 w-6 flex-shrink-0" /> : <AlertCircle className="h-6 w-6 flex-shrink-0" />}
          <div className="flex-1">
            <h3 className="text-sm font-semibold mb-0.5">{toastTitle}</h3>
            <p className="text-sm">{toastMessage}</p>
          </div>
          <button
            onClick={() => setToastStatus('idle')}
            className="ml-2 text-xl font-bold text-inherit hover:opacity-60 focus:outline-none"
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-20 items-center justify-between px-8">
          <div>
            <h1 className="text-xl font-bold text-black">AI Agent Chatbot</h1>
            <p className="text-gray-700">RAG Agent</p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Upload */}
          <Card className="rounded-2xl shadow-md">
            <CardHeader>
              <CardTitle className="text-gray-900">Documents for RAG</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                  aria-label="File input"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleChooseFile}
                  className="flex-1 bg-white border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 transition-all duration-200 cursor-pointer"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  CHOOSE FILES
                </Button>
                <Button
                  type="button"
                  onClick={handleUploadAll}
                  disabled={!uploads.some((u) => u.status === 'queued' || u.status === 'error') || isUploadingAny}
                  className="bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 transition-all duration-200"
                >
                  {isUploadingAny ? 'UPLOADING…' : 'UPLOAD ALL'}
                </Button>
              </div>

              {/* Dropzone */}
              <div
                className={`h-64 border-2 border-dashed rounded-xl flex items-center justify-center transition-colors bg-white
                  ${isDragging ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-400'}`}
                role="button"
                tabIndex={0}
                onClick={handleChooseFile}
                onKeyDown={(e) => (e.key === 'Enter' ? handleChooseFile() : null)}
                onDragEnter={onDragEnter}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                aria-label="Drop files here or click to upload"
              >
                <div className="text-center text-gray-500 px-6 pointer-events-none">
                  <Upload className="w-12 h-12 mx-auto mb-3 opacity-80" />
                  <p className="font-medium">Drop files here or click to upload</p>
                  <p className="text-xs mt-1 text-gray-400">PDF, DOCX, TXT — max. 10MB c/u</p>
                </div>
              </div>

              {/* Hint */}
              <p className="text-xs text-gray-500">
                Uploaded documents are indexed to answer with RAG (retrieval augmented generation).
              </p>

              {/* Lista de uploads */}
              <div className="space-y-3">
                {uploads.map((u) => (
                  <div key={u.id} className="w-full rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-800 truncate">{u.file.name}</div>
                      <button
                        type="button"
                        onClick={() => (u.status === 'uploading' ? cancelUpload(u.id) : removeItem(u.id))}
                        className="ml-3 text-gray-500 hover:text-gray-700"
                        title={u.status === 'uploading' ? 'Cancel' : 'Remove'}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {u.file.type || 'file'} • {(u.file.size / (1024 * 1024)).toFixed(1)} MB
                    </div>

                    <div className="mt-2 h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className={`h-2 transition-all ${
                          u.status === 'error' ? 'bg-red-500' : u.status === 'done' ? 'bg-green-600' : 'bg-blue-600'
                        }`}
                        style={{ width: `${u.progress}%` }}
                      />
                    </div>

                    <div className="mt-1 text-xs text-gray-600">
                      {u.status === 'queued' && 'Queued'}
                      {u.status === 'uploading' && `Uploading… ${u.progress}%`}
                      {u.status === 'done' && 'Completed ✅'}
                      {u.status === 'canceled' && 'Canceled'}
                      {u.status === 'error' && `Error: ${u.error || 'Upload failed'}`}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Right: Chat */}
          <Card className="bg-gray-50 border border-gray-200 rounded-2xl shadow-md">
            <CardHeader>
              <CardTitle className="text-gray-900 text-center">AI CHAT</CardTitle>
            </CardHeader>
            <CardContent>
              <div id="n8n-chat" className="h-[420px] w-full" />
            </CardContent>
          </Card>
        </div>

        <div className="mt-5 bg-accent/30 rounded-xl p-6 border border-accent/50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center shrink-0">
              <Target className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground mb-2">RAG Chat & Voicebot</h3>
              <p className="text-muted-foreground mb-4">
                Combine the power of retrieval augmented generation (RAG) with advanced chatbot and voicebot
                capabilities. Upload documents, ask questions, and get answers.
              </p>
              <div className="flex gap-3">
                <Link href="https://t.me/your_telegram_bot" target="_blank" rel="noopener noreferrer">
                  <Button variant="default" className="cursor-pointer">
                    <Mic className="w-5 h-5 mr-2" /> CONNECT TO OUR TELEGRAM VOICEBOT
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
