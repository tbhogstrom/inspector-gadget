'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { AnalysisResult, Issue } from '@/lib/types';

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', color: 'bg-red-100 border-red-300', badge: 'destructive' as const },
  major: { label: 'Major', color: 'bg-orange-100 border-orange-300', badge: 'secondary' as const },
  minor: { label: 'Minor', color: 'bg-yellow-50 border-yellow-200', badge: 'outline' as const },
};

function SFWCallBanner({ sfwCount, services }: { sfwCount: number; services: string[] }) {
  if (sfwCount === 0) return null;

  const serviceSummary = services.length > 0 ? `${services.join(' | ')} | and more` : 'Recommended repair items';

  return (
    <a
      href="tel:5035632403"
      className="flex w-full items-center justify-between rounded-lg bg-blue-600 p-4 text-white no-underline transition-colors hover:bg-blue-700"
    >
      <div>
        <p className="text-base font-semibold">SFW can help with {sfwCount} item{sfwCount !== 1 ? 's' : ''} on this report</p>
        <p className="text-sm text-blue-100">{serviceSummary}</p>
      </div>
      <div className="ml-4 shrink-0 text-right">
        <p className="text-lg font-bold">(503) 563-2403</p>
        <p className="text-xs text-blue-100">Tap to call</p>
      </div>
    </a>
  );
}

function IssueCard({ issue }: { issue: Issue }) {
  const config = PRIORITY_CONFIG[issue.priority];

  return (
    <div className={`space-y-2 rounded-lg border p-4 ${config.color}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={config.badge}>{issue.category}</Badge>
        {issue.sfw_relevant && issue.sfw_service && (
          <Badge variant="outline" className="border-blue-400 bg-blue-50 text-blue-700">
            SFW: {issue.sfw_service}
          </Badge>
        )}
        <span className="text-xs text-gray-500">{issue.location}</span>
      </div>
      <p className="text-sm font-medium text-gray-800">{issue.description}</p>
      <p className="text-sm text-gray-600"><span className="font-medium">Action:</span> {issue.action}</p>
    </div>
  );
}

function PrioritySection({ priority, issues }: { priority: 'critical' | 'major' | 'minor'; issues: Issue[] }) {
  const [open, setOpen] = useState(true);
  const config = PRIORITY_CONFIG[priority];

  if (issues.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-white p-3 hover:bg-gray-50">
        <div className="flex items-center gap-2">
          <Badge variant={config.badge}>{config.label}</Badge>
          <span className="text-sm text-gray-600">{issues.length} issue{issues.length !== 1 ? 's' : ''}</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2">
        {issues.map((issue, index) => <IssueCard key={index} issue={issue} />)}
      </CollapsibleContent>
    </Collapsible>
  );
}

function IssueSections({ issues }: { issues: Issue[] }) {
  const critical = issues.filter((issue) => issue.priority === 'critical');
  const major = issues.filter((issue) => issue.priority === 'major');
  const minor = issues.filter((issue) => issue.priority === 'minor');

  return (
    <>
      <PrioritySection priority="critical" issues={critical} />
      <PrioritySection priority="major" issues={major} />
      <PrioritySection priority="minor" issues={minor} />
    </>
  );
}

export function ReportOutput({ result }: { result: AnalysisResult }) {
  const [showOtherIssues, setShowOtherIssues] = useState(false);
  const criticalCount = result.issues.filter((issue) => issue.priority === 'critical').length;
  const sfwIssues = result.issues.filter((issue) => issue.sfw_relevant);
  const otherIssues = result.issues.filter((issue) => !issue.sfw_relevant);
  const sfwCount = sfwIssues.length;
  const sfwServices = [...new Set(sfwIssues.map((issue) => issue.sfw_service).filter(Boolean) as string[])];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inspection Report Analysis</CardTitle>
        {result.address && (
          <p className="text-sm text-gray-500">{result.address}</p>
        )}
        <p className="text-sm text-gray-500">
          {result.issues.length} total issue{result.issues.length !== 1 ? 's' : ''} found
          {criticalCount > 0 && ` - ${criticalCount} critical`}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <SFWCallBanner sfwCount={sfwCount} services={sfwServices} />

        {sfwIssues.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">Recommended for SFW</p>
            <IssueSections issues={sfwIssues} />
          </div>
        )}

        {otherIssues.length > 0 && (
          <Collapsible open={showOtherIssues} onOpenChange={setShowOtherIssues}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left hover:bg-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {sfwIssues.length > 0 ? 'Show remaining report items' : 'Show report items'}
                </p>
                <p className="text-xs text-slate-500">
                  {otherIssues.length} non-SFW item{otherIssues.length !== 1 ? 's' : ''} hidden by default
                </p>
              </div>
              <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${showOtherIssues ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-3">
              {sfwIssues.length === 0 && (
                <p className="text-sm text-slate-500">
                  No SFW-match items were found. Expand this section to review the full report findings.
                </p>
              )}
              <IssueSections issues={otherIssues} />
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
