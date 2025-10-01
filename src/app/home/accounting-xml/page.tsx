'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, FileText, Upload, X } from 'lucide-react';
import { Button } from '@/components/sellemond-bakery/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/sellemond-bakery/ui/card';
import ExcelPreviewSheet from '@/components/ExcelPreviewSheet';

// ==== Shared types ====
type UploadStatus = 'queued' | 'uploading' | 'done' | 'error' | 'canceled';
interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: UploadStatus;
  error?: string;
  xhr?: XMLHttpRequest;
}

// ==== Reusable Upload Panel (STATE IS ISOLATED PER INSTANCE) ====
function UploadPanel({
  title,
  subtitle,
  accept = '.pdf,.doc,.docx,.txt,.xml',
  apiPath,
  maxFileSizeMB = 10,
}: {
  title: string;
  subtitle: string;
  accept?: string;
  apiPath: string; // e.g. '/api/rag-agent?bucket=amazon' or '/api/rag-agent?bucket=others'
  maxFileSizeMB?: number;
}) {
  const MAX_FILE_SIZE = maxFileSizeMB * 1024 * 1024;

  // 👉 These states are independent PER panel instance
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isUploadingAny, setIsUploadingAny] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Prevent global drag/drop from navigating away
  useEffect(() => {
    const prevent = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return () => {
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop', prevent);
    };
  }, []);

  const handleChooseFile = () => fileInputRef.current?.click();

  const addFiles = (files: FileList | null) => {
    if (!files || !files.length) return;
    const newItems: UploadItem[] = [];

    Array.from(files).forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        // You can toast here if you like
        return;
      }
      newItems.push({
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        progress: 0,
        status: 'queued',
      });
    });

    if (newItems.length) setUploads((prev) => [...prev, ...newItems]);
  };

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    addFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // DnD helpers (scoped to this panel)
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
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const onDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  };
  const onDragLeave: React.DragEventHandler<HTMLDivElement> = (e) => {
    if (e.currentTarget === e.target) setIsDragging(false);
  };
  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = getFilesFromDataTransfer(e.dataTransfer);
    if (files.length) addFilesFromArray(files);
  };

  // Upload one file with XHR (to keep progress events realistic)
  const uploadOne = (item: UploadItem): Promise<void> =>
    new Promise((resolve) => {
      const fd = new FormData();
      fd.append('file', item.file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', apiPath, true);
      xhr.responseType = 'arraybuffer'; // Handle binary responses

      xhr.upload.onprogress = (evt) => {
        if (!evt.lengthComputable) return;
        const percent = Math.round((evt.loaded / evt.total) * 100);
        setUploads((prev) => prev.map((u) => (u.id === item.id ? { ...u, progress: percent } : u)));
      };

      xhr.onreadystatechange = () => {
        if (xhr.readyState !== XMLHttpRequest.DONE) return;
        const ok = xhr.status >= 200 && xhr.status < 300;
        
        if (ok && xhr.getResponseHeader('Content-Type')?.includes('spreadsheetml')) {
          // Handle Excel file download
          const blob = new Blob([xhr.response], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
          });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = item.file.name.replace(/\.xml$/i, '_extracted_data.xlsx');
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          setUploads((prev) =>
            prev.map((u) =>
              u.id === item.id
                ? {
                    ...u,
                    status: 'done',
                    progress: 100,
                  }
                : u
            )
          );
        } else {
          // Handle error case
          let errorMessage = 'Upload failed';
          try {
            // Try to parse as JSON first
            const textResponse = new TextDecoder().decode(xhr.response);
            const payload = JSON.parse(textResponse);
            errorMessage = payload?.error || xhr.statusText || 'Upload failed';
          } catch {
            // If not JSON, use status text
            errorMessage = xhr.statusText || 'Upload failed';
          }

          setUploads((prev) =>
            prev.map((u) =>
              u.id === item.id
                ? {
                    ...u,
                    status: u.status === 'canceled' ? 'canceled' : 'error',
                    error: errorMessage,
                    progress: u.progress,
                  }
                : u
            )
          );
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
        try {
          u.xhr?.abort?.();
        } catch {}
        return { ...u, status: 'canceled', error: 'Canceled by user' };
      })
    );
  };

  const removeItem = (id: string) => setUploads((prev) => prev.filter((u) => u.id !== id));

  return (
    <div className="flex-1 flex flex-col gap-4">
      <Card className="shadow-md rounded-2xl">
        <CardHeader>
          <CardTitle className="text-gray-900">{title}</CardTitle>
          <p className="text-gray-700 text-sm">{subtitle}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Controls */}
          <div className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
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
          </div>

          {/* Dropzone */}

          <div className="max-h-44 min-h-44 mt-3 overflow-auto">
            {uploads.length > 0 ? (
              <div className="space-y-3">
                {uploads.map((u) => (
                  <div key={u.id} className="w-full flex flex-row gap-2">
                    <div className="w-full rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-800 truncate">{u.file.name}</div>
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
                    <div className="flex flex-col justify-center space-y-2">
                      <button
                        type="button"
                        onClick={() => (u.status === 'uploading' ? cancelUpload(u.id) : removeItem(u.id))}
                        className="p-1.5 rounded-lg border border-gray-200 text-red-500 hover:bg-red-50 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      {/* <button
                        type="button"
                        // onClick={() => downloadFile(u.id)}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
                      >
                        <Download className="w-4 h-4" />
                      </button> */}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className={`h-44 border-2 border-dashed rounded-xl flex items-center justify-center transition-colors bg-white ${
                  isDragging ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-400'
                }`}
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
                  <p className="text-xs mt-1 text-gray-400">PDF, DOCX, TXT — max. {maxFileSizeMB}MB each</p>
                </div>
              </div>
            )}
          </div>

          <div className="text-center">
            <Button
              type="button"
              onClick={handleUploadAll}
              disabled={!uploads.some((u) => u.status === 'queued' || u.status === 'error') || isUploadingAny}
              className="bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 transition-all duration-200"
            >
              {isUploadingAny ? 'UPLOADING…' : 'UPLOAD'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AccountingPage() {
  const SHEET_ID = '1f26QX1dXyGpF_HDqafesLUZ2BYtPGvxk7PV8Yy50MmE';
  const GID = '388910260';
  return (
    <>
      {/* HEADER */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-20 items-center justify-between px-8">
          <div>
            <h1 className="text-xl font-bold text-black">Accounting XML</h1>
            <p className="text-gray-700">Upload your PDF or XML</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-4">
        <div className="flex flex-row gap-4">
          {/* Panel 1: PDFs */}
          <UploadPanel
            title="Upload PDF"
            subtitle="These go to the PDF extractor"
            accept=".pdf"
            apiPath="/api/accounting-pdf"
          />

          {/* Panel 2: Other invoices */}
          <UploadPanel
            title="Upload XML"
            subtitle="These go to the XML extractor"
            accept=".xml"
            apiPath="/api/accounting-xml"
          />
        </div>
        <Card>
          <CardContent className="p-5 overflow-x-auto min-h-80 max-h-80 max-w-[1600px]">
            <CardTitle className="text-gray-900">Excel Preview</CardTitle>
            <p className="text-gray-700 text-sm mb-3">Preview in Excel all the files</p>
            <ExcelPreviewSheet sheetId={SHEET_ID} gid={GID} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
