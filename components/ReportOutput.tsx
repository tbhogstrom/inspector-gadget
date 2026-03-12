'use client';

import { ChevronDown, Phone } from 'lucide-react';
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
  const [expanded, setExpanded] = useState(false);

  if (sfwCount === 0) return null;

  const serviceSummary = services.length > 0 ? `${services.join(' | ')} | and more` : 'Recommended repair items';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setExpanded((value) => !value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setExpanded((value) => !value);
        }
      }}
      className="w-full cursor-pointer rounded-xl bg-blue-600 p-4 text-left text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-base font-semibold">SFW can help with {sfwCount} item{sfwCount !== 1 ? 's' : ''} on this report</p>
          <p className="mt-1 text-sm text-blue-100">{serviceSummary}</p>
        </div>
        <div className="flex items-center gap-2 whitespace-nowrap text-blue-100">
          <span className="text-xs font-medium">Tap to call</span>
          <ChevronDown className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      <div
        className={`grid overflow-hidden transition-[grid-template-rows,margin-top] duration-300 ease-out ${
          expanded ? 'mt-4 grid-rows-[1fr]' : 'mt-3 grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href="tel:5034769460"
              onClick={(event) => event.stopPropagation()}
              className="rounded-lg bg-white/12 p-3 no-underline transition-colors hover:bg-white/18"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-blue-100">Oregon</p>
              <p className="mt-2 flex items-center gap-2 text-lg font-bold text-white">
                <Phone className="size-4" />
                503-476-9460
              </p>
              <p className="text-xs text-blue-100">Tap to call</p>
            </a>
            <a
              href="tel:2062032046"
              onClick={(event) => event.stopPropagation()}
              className="rounded-lg bg-white/12 p-3 no-underline transition-colors hover:bg-white/18"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-blue-100">Washington</p>
              <p className="mt-2 flex items-center gap-2 text-lg font-bold text-white">
                <Phone className="size-4" />
                206-203-2046
              </p>
              <p className="text-xs text-blue-100">Tap to call</p>
            </a>
          </div>
        </div>
      </div>

    </div>
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
