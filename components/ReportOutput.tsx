// components/ReportOutput.tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { AnalysisResult, Issue } from '@/lib/types';
import { useState } from 'react';

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', color: 'bg-red-100 border-red-300', badge: 'destructive' as const },
  major: { label: 'Major', color: 'bg-orange-100 border-orange-300', badge: 'secondary' as const },
  minor: { label: 'Minor', color: 'bg-yellow-50 border-yellow-200', badge: 'outline' as const },
};

function SFWCallBanner({ sfwCount, services }: { sfwCount: number; services: string[] }) {
  if (sfwCount === 0) return null;
  return (
    <a
      href="tel:5035632403"
      className="flex items-center justify-between w-full rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors p-4 text-white no-underline"
    >
      <div>
        <p className="font-semibold text-base">SFW can help with {sfwCount} item{sfwCount !== 1 ? 's' : ''} on this report</p>
        <p className="text-blue-100 text-sm">{services.join(' · ')} · and more</p>
      </div>
      <div className="text-right shrink-0 ml-4">
        <p className="font-bold text-lg">(503) 563-2403</p>
        <p className="text-blue-100 text-xs">Tap to call</p>
      </div>
    </a>
  );
}

function IssueCard({ issue }: { issue: Issue }) {
  const config = PRIORITY_CONFIG[issue.priority];
  return (
    <div className={`border rounded-lg p-4 space-y-2 ${config.color}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={config.badge}>{issue.category}</Badge>
        {issue.sfw_relevant && issue.sfw_service && (
          <Badge variant="outline" className="border-blue-400 text-blue-700 bg-blue-50">
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
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-white border hover:bg-gray-50">
        <div className="flex items-center gap-2">
          <Badge variant={config.badge}>{config.label}</Badge>
          <span className="text-sm text-gray-600">{issues.length} issue{issues.length !== 1 ? 's' : ''}</span>
        </div>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 mt-2">
        {issues.map((issue, i) => <IssueCard key={i} issue={issue} />)}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ReportOutput({ result }: { result: AnalysisResult }) {
  const critical = result.issues.filter(i => i.priority === 'critical');
  const major = result.issues.filter(i => i.priority === 'major');
  const minor = result.issues.filter(i => i.priority === 'minor');
  const sfwIssues = result.issues.filter(i => i.sfw_relevant);
  const sfwCount = sfwIssues.length;
  const sfwServices = [...new Set(sfwIssues.map(i => i.sfw_service).filter(Boolean) as string[])];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inspection Report Analysis</CardTitle>
        {result.address && (
          <p className="text-sm text-gray-500">{result.address}</p>
        )}
        <p className="text-sm text-gray-500">
          {result.issues.length} total issue{result.issues.length !== 1 ? 's' : ''} found
          {critical.length > 0 && ` — ${critical.length} critical`}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <SFWCallBanner sfwCount={sfwCount} services={sfwServices} />
        <PrioritySection priority="critical" issues={critical} />
        <PrioritySection priority="major" issues={major} />
        <PrioritySection priority="minor" issues={minor} />
      </CardContent>
    </Card>
  );
}
