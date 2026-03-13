'use client';

import { FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { UploadZone } from '@/components/UploadZone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingGame } from '@/components/LoadingGame';
import { BidCheckerResult } from '@/lib/bid-checker-types';

interface BidCheckerProps {
  onResults: (result: BidCheckerResult) => void;
}

export function BidChecker({ onResults }: BidCheckerProps) {
  const [repairDescription, setRepairDescription] = useState('');
  const [bidFile, setBidFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisReady, setAnalysisReady] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!repairDescription.trim()) {
      toast.error('Please describe the repair you need.');
      return;
    }

    if (!bidFile) {
      toast.error('Please upload a contractor bid.');
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', bidFile);

      const parseResponse = await fetch('/api/parse-pdf', { method: 'POST', body: formData });
      const parseBody = await parseResponse.json();

      if (!parseResponse.ok) {
        throw new Error(parseBody.error || 'Failed to parse bid document');
      }

      const analyzeResponse = await fetch('/api/bid-checker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repair_description: repairDescription,
          bid_text: parseBody.text,
        }),
      });
      const analyzeBody = await analyzeResponse.json();

      if (!analyzeResponse.ok) {
        throw new Error(analyzeBody.error || 'Failed to analyze bid');
      }

      onResults(analyzeBody);
      setAnalysisReady(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  }

  if (isProcessing) {
    return (
      <LoadingGame
        isAnalysisComplete={analysisReady}
        onGameEnd={(score) => {
          setFinalScore(score);
        }}
        onViewResults={() => {
          setIsProcessing(false);
          setAnalysisReady(false);
        }}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bid Checker</CardTitle>
        <CardDescription>
          Describe the repair you expected and upload the contractor&apos;s bid to check for scope creep, pricing
          problems, and risky terms.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="repair-description" className="text-sm font-medium text-slate-800">
              What repair do you think you need?
            </label>
            <textarea
              id="repair-description"
              value={repairDescription}
              onChange={(event) => setRepairDescription(event.target.value)}
              placeholder="Example: Water is coming in around my kitchen window during heavy rain."
              className="min-h-28 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              disabled={isProcessing}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-800">Upload contractor bid</p>
            <UploadZone
              onFile={setBidFile}
              disabled={isProcessing}
              title={isProcessing ? 'Processing your bid' : 'Upload your contractor bid'}
              description="Drag & drop a PDF, TXT, or DOCX file, or click to select"
            />
            {bidFile && <p className="text-xs text-slate-500">Selected file: {bidFile.name}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={isProcessing || !repairDescription.trim() || !bidFile}>
            {isProcessing ? 'Analyzing bid...' : 'Analyze Bid'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
