'use client';

import { AlertCircle, CheckCircle2, ChevronDown, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { BidCheckerResult, BidScore, SpecificIssue } from '@/lib/bid-checker-types';

const SCORE_STYLES: Record<
  BidScore,
  {
    title: string;
    summary: string;
    cardClassName: string;
    icon: typeof CheckCircle2;
    badgeVariant: 'default' | 'secondary' | 'destructive';
  }
> = {
  sensible: {
    title: 'Sensible Bid',
    summary: 'The bid appears reasonably aligned with the stated repair, with no major red flags.',
    cardClassName: 'border-emerald-300 bg-emerald-50',
    icon: CheckCircle2,
    badgeVariant: 'default',
  },
  warning: {
    title: 'Warning',
    summary: 'Some parts of the bid need clarification before you agree to the work.',
    cardClassName: 'border-amber-300 bg-amber-50',
    icon: AlertCircle,
    badgeVariant: 'secondary',
  },
  do_not_move_forward: {
    title: 'Do Not Move Forward',
    summary: 'The bid shows serious concerns or overscope and should not be accepted as written.',
    cardClassName: 'border-red-300 bg-red-50',
    icon: ShieldAlert,
    badgeVariant: 'destructive',
  },
};

function formatCategoryName(key: string) {
  return key
    .split('_')
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ');
}

function scoreLabel(score: BidScore) {
  return score === 'do_not_move_forward' ? 'Do Not Move Forward' : score[0].toUpperCase() + score.slice(1);
}

function IssueItem({ issue, index }: { issue: SpecificIssue; index: number }) {
  return (
    <Collapsible className="group/collapsible rounded-lg border border-slate-200 bg-white">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={issue.severity === 'high' ? 'destructive' : 'secondary'}>{issue.severity}</Badge>
            <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
              {formatCategoryName(issue.category)}
            </span>
          </div>
          <p className="text-sm font-medium text-slate-900">{index + 1}. {issue.message}</p>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-data-[state=open]/collapsible:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
        Ask the contractor: &quot;{issue.follow_up_question}&quot;
      </CollapsibleContent>
    </Collapsible>
  );
}

export function BidCheckerResults({ result }: { result: BidCheckerResult }) {
  const overall = SCORE_STYLES[result.overall_score];
  const OverallIcon = overall.icon;

  return (
    <div className="space-y-4">
      <Card className={overall.cardClassName}>
        <CardContent className="flex items-start gap-4 pt-6">
          <OverallIcon className="mt-0.5 h-7 w-7 shrink-0" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">{overall.title}</h2>
              <Badge variant={overall.badgeVariant}>{scoreLabel(result.overall_score)}</Badge>
            </div>
            <p className="text-sm text-slate-700">{overall.summary}</p>
          </div>
        </CardContent>
      </Card>

      {result.sfw_tm_suggestion && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-base">Targeted Repair Option</CardTitle>
            <CardDescription className="text-blue-900">{result.sfw_tm_suggestion}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Category Breakdown</CardTitle>
          <CardDescription>Each category shows where the bid looks sound and where it needs scrutiny.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(result.category_scores).map(([category, score]) => (
            <div key={category} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={SCORE_STYLES[score.rating].badgeVariant}>{scoreLabel(score.rating)}</Badge>
                <p className="text-sm font-medium text-slate-900">{formatCategoryName(category)}</p>
              </div>
              <p className="mt-2 text-sm text-slate-600">{score.explanation}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {result.specific_issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Specific Issues</CardTitle>
            <CardDescription>These are the concrete points to challenge before approving the bid.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.specific_issues.map((issue, index) => <IssueItem key={`${issue.category}-${index}`} issue={issue} index={index} />)}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Follow-up Questions</CardTitle>
          <CardDescription>Use these questions to tighten the scope and terms before signing.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {result.follow_up_questions.map((question, index) => (
              <li key={`${question}-${index}`} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                <span className="mr-2 font-semibold text-slate-900">{index + 1}.</span>
                {question}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
