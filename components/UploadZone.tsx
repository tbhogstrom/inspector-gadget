// components/UploadZone.tsx
'use client';

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
      <div className="space-y-2">
        <p className="text-lg font-medium text-gray-700">
          {isDragActive ? 'Drop your inspection report here' : 'Upload your inspection report'}
        </p>
        <p className="text-sm text-gray-500">
          Drag & drop a PDF or TXT file, or click to select
        </p>
        <p className="text-xs text-gray-400">Max 10MB</p>
      </div>
    </div>
  );
}
