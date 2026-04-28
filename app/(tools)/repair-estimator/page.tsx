'use client';

import { useEffect, useState } from 'react';
import { RepairEstimator } from '@/components/RepairEstimator';
import { RepairEstimatorResults } from '@/components/RepairEstimatorResults';
import { Button } from '@/components/ui/button';
import { RepairEstimateResult } from '@/lib/repair-estimator-types';

export default function RepairEstimatorPage() {
  const [result, setResult] = useState<RepairEstimateResult | null>(null);

  useEffect(() => {
    const sendHeight = () => {
      window.parent.postMessage({ iframeHeight: document.body.scrollHeight }, '*');
    };

    window.addEventListener('resize', sendHeight);
    const observer = new ResizeObserver(sendHeight);
    observer.observe(document.body);
    sendHeight();

    return () => {
      window.removeEventListener('resize', sendHeight);
      observer.disconnect();
    };
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="mx-auto max-w-3xl space-y-6 pt-8">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-slate-900">Repair Cost Estimator</h1>
          <p className="text-sm text-slate-500">
            Upload a home inspection report and generate a contractor-grade repair estimate for negotiation or budgeting.
          </p>
        </div>

        {result ? (
          <>
            <RepairEstimatorResults result={result} />
            <Button variant="outline" className="w-full" onClick={() => setResult(null)}>
              Generate Another Estimate
            </Button>
          </>
        ) : (
          <RepairEstimator onResults={setResult} />
        )}
      </div>
    </main>
  );
}
