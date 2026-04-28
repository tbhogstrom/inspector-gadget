'use client';

import { FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { UploadZone } from '@/components/UploadZone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EstimateState, RepairEstimateResult } from '@/lib/repair-estimator-types';

interface RepairEstimatorProps {
  onResults: (result: RepairEstimateResult) => void;
}

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200';

export function RepairEstimator({ onResults }: RepairEstimatorProps) {
  const [clientName, setClientName] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [state, setState] = useState<EstimateState | null>(null);
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const canSubmit =
    clientName.trim().length > 0 &&
    propertyAddress.trim().length > 0 &&
    state !== null &&
    reportFile !== null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit || !reportFile || !state) {
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', reportFile);

      const parseResponse = await fetch('/api/parse-pdf', { method: 'POST', body: formData });
      const parseBody = await parseResponse.json();

      if (!parseResponse.ok) {
        throw new Error(parseBody.error || 'Failed to parse report');
      }

      const analyzeResponse = await fetch('/api/repair-estimator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName.trim(),
          propertyAddress: propertyAddress.trim(),
          state,
          reportText: parseBody.text,
        }),
      });
      const analyzeBody = await analyzeResponse.json();

      if (!analyzeResponse.ok) {
        throw new Error(analyzeBody.error || 'Failed to generate estimate');
      }

      onResults(analyzeBody);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  }

  if (isProcessing) {
    return (
      <Card>
        <CardContent>
          <div className="text-center py-16 space-y-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800 mx-auto" />
            <p className="text-slate-600 font-medium">Generating estimate...</p>
            <p className="text-slate-400 text-sm">This usually takes 20-40 seconds</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const stateOptions: EstimateState[] = ['WA', 'OR'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Repair Cost Estimator</CardTitle>
        <CardDescription>
          Generate a contractor-grade repair estimate from a home inspection report.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="client-name" className="text-sm font-medium text-slate-800">
              Client Name
            </label>
            <input
              id="client-name"
              type="text"
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              placeholder="Jane Smith"
              className={inputClass}
              disabled={isProcessing}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="property-address" className="text-sm font-medium text-slate-800">
              Property Address
            </label>
            <input
              id="property-address"
              type="text"
              value={propertyAddress}
              onChange={(event) => setPropertyAddress(event.target.value)}
              placeholder="123 Main St, Seattle, WA"
              className={inputClass}
              disabled={isProcessing}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-800">State</p>
            <div
              role="radiogroup"
              aria-label="State"
              className="inline-flex rounded-lg border border-slate-300 bg-slate-100 p-1"
            >
              {stateOptions.map((option) => {
                const selected = state === option;
                return (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setState(option)}
                    disabled={isProcessing}
                    className={`min-w-16 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                      selected
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-800">Inspection report</p>
            <UploadZone
              onFile={setReportFile}
              disabled={isProcessing}
              title="Upload your inspection report"
              description="Drag & drop a PDF, TXT, or DOCX file, or click to select"
            />
            {reportFile && <p className="text-xs text-slate-500">Selected file: {reportFile.name}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={isProcessing || !canSubmit}>
            {isProcessing ? 'Generating estimate...' : 'Generate Estimate'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
