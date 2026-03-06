'use client';

import { Info } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface Props {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function UploadZone({ onFile, disabled }: Props) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files[0] && onFile(files[0]),
    accept: {
      'application/pdf': [],
      'text/plain': [],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />
      <div className="space-y-3">
        <p className="text-lg font-medium text-gray-700">
          {isDragActive ? 'Drop your inspection report here' : 'Upload your inspection report'}
        </p>
        <p className="text-sm text-gray-500">
          Drag & drop a PDF or TXT file, or click to select
        </p>
        <p className="text-xs text-gray-400">Max 10MB</p>
        <div className="flex justify-center">
          <div className="group relative inline-flex items-center gap-2 text-xs text-gray-500">
            <span>Privacy notice</span>
            <button
              type="button"
              aria-label="View privacy notice"
              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-500 shadow-sm transition-colors hover:border-gray-400 hover:text-gray-700"
              onClick={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <Info className="h-3.5 w-3.5" />
            </button>
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-72 -translate-x-1/2 rounded-md border border-slate-200 bg-white p-3 text-left text-[11px] leading-5 text-slate-600 opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 invisible translate-y-1">
              Uploaded reports are used only to generate this analysis. Avoid submitting highly sensitive personal
              information, and confirm you have permission to share any report you upload.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
