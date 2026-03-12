'use client';

import { Download, FileCheck2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { downloadInspectionPdf } from '@/lib/pdf-generator';
import type { AnalysisResult } from '@/lib/types';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Failed to generate PDF report';
}

export function PDFDownloadSection({ result }: { result: AnalysisResult }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [lastDownloadName, setLastDownloadName] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsDownloading(true);

    try {
      const download = await downloadInspectionPdf(result);
      setLastDownloadName(download.filename);
      toast.success('PDF report downloaded');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">Save your report</p>
        <h2 className="text-2xl font-semibold text-slate-900">Download Report as PDF</h2>
        <p className="text-sm text-slate-600">Save your actionable checklist for later.</p>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          type="button"
          size="lg"
          onClick={handleDownload}
          disabled={isDownloading}
          className="bg-blue-700 text-white hover:bg-blue-800"
        >
          {isDownloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          {isDownloading ? 'Generating PDF...' : 'Download Report as PDF'}
        </Button>
        {lastDownloadName && (
          <p className="flex items-center gap-2 text-sm text-emerald-700">
            <FileCheck2 className="size-4" />
            {lastDownloadName}
          </p>
        )}
      </div>
    </section>
  );
}
