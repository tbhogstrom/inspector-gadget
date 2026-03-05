'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { UploadZone } from '@/components/UploadZone';
import { ReportOutput } from '@/components/ReportOutput';
import { HubSpotForm } from '@/components/HubSpotForm';
import { AnalysisResult } from '@/lib/types';

type AppState = 'upload' | 'processing' | 'results';

export default function Home() {
  const [state, setState] = useState<AppState>('upload');
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleFile = async (file: File) => {
    setState('processing');

    try {
      // Step 1: Parse the file
      const fd = new FormData();
      fd.append('file', file);
      const parseRes = await fetch('/api/parse-pdf', { method: 'POST', body: fd });
      const parseBody = await parseRes.json();
      if (!parseRes.ok) throw new Error(parseBody.error || 'Failed to parse file');

      // Step 2: Analyze the text
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: parseBody.text }),
      });
      const analyzeBody = await analyzeRes.json();
      if (!analyzeRes.ok) throw new Error(analyzeBody.error || 'Failed to analyze report');

      setResult(analyzeBody);
      setState('results');
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
      setState('upload');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="max-w-2xl mx-auto pt-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold text-slate-900">Inspector Gadget</h1>
          <p className="text-slate-500">Upload your inspection report and get a prioritized action list instantly.</p>
        </div>

        {state === 'upload' && (
          <UploadZone onFile={handleFile} />
        )}

        {state === 'processing' && (
          <div className="text-center py-16 space-y-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800 mx-auto" />
            <p className="text-slate-600 font-medium">Analyzing your inspection report...</p>
            <p className="text-slate-400 text-sm">This usually takes 15–30 seconds</p>
          </div>
        )}

        {state === 'results' && result && (
          <>
            <ReportOutput result={result} />
            <HubSpotForm address={result.address} email={result.client_email} />
            <button
              onClick={() => { setResult(null); setState('upload'); }}
              className="w-full text-sm text-slate-400 hover:text-slate-600 underline"
            >
              Analyze another report
            </button>
          </>
        )}
      </div>
    </main>
  );
}
