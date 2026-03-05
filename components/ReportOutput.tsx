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

function IssueCard({ issue }: { issue: Issue }) {
  const config = PRIORITY_CONFIG[issue.priority];
  return (
    <div className={`border rounded-lg p-4 space-y-2 ${config.color}`}>
      <div className="flex items-center gap-2">
        <Badge variant={config.badge}>{issue.category}</Badge>
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
        <PrioritySection priority="critical" issues={critical} />
        <PrioritySection priority="major" issues={major} />
        <PrioritySection priority="minor" issues={minor} />
      </CardContent>
    </Card>
  );
}
