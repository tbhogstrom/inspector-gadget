'use client';

import { useEffect, useState } from 'react';
import { BidChecker } from '@/components/BidChecker';
import { BidCheckerResults } from '@/components/BidCheckerResults';
import { Button } from '@/components/ui/button';
import { BidCheckerResult } from '@/lib/bid-checker-types';

export default function BidCheckerPage() {
  const [result, setResult] = useState<BidCheckerResult | null>(null);

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
          <h1 className="text-3xl font-bold text-slate-900">Contractor Bid Checker</h1>
          <p className="text-sm text-slate-500">
            Upload an estimate and compare it against the repair you actually need before you commit.
          </p>
        </div>

        {result ? (
          <>
            <BidCheckerResults result={result} />
            <Button variant="outline" className="w-full" onClick={() => setResult(null)}>
              Analyze Another Bid
            </Button>
          </>
        ) : (
          <BidChecker onResults={setResult} />
        )}
      </div>
    </main>
  );
}
