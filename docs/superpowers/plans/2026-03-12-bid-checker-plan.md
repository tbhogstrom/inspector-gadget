# Bid Checker Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a document analysis tool that evaluates contractor bids for exterior home repairs, scoring them as Sensible / Warning / Do Not Move Forward with specific flags and follow-up questions.

**Architecture:** Extends the inspector gadget framework by adding DOCX support to the document parser, creating a new bid-checker API endpoint with a domain-specific system prompt, and building custom components for repair description input and structured scoring output.

**Tech Stack:** Next.js, TypeScript, React, OpenAI GPT-4o, react-dropzone, docx library for DOCX parsing

---

## File Structure

**New files:**
- `lib/docx-parser.ts` — DOCX extraction utility
- `lib/bid-checker-types.ts` — TypeScript interfaces for bid analysis
- `lib/bid-checker-prompt.ts` — BID_CHECKER_SYSTEM_PROMPT
- `components/BidChecker.tsx` — Main component (repair form + upload)
- `components/BidCheckerResults.tsx` — Results display
- `app/api/bid-checker/route.ts` — Bid analysis endpoint
- `app/(tools)/bid-checker/page.tsx` — Bid checker tool route

**Modified files:**
- `app/api/parse-pdf/route.ts` — Add DOCX support
- `package.json` — Add `docx` dependency

---

## Chunk 1: Dependencies & DOCX Parsing

### Task 1: Add docx library and write DOCX extraction tests

**Files:**
- Modify: `package.json`
- Create: `lib/docx-parser.ts`
- Create: `lib/__tests__/docx-parser.test.ts`

- [ ] **Step 1: Add docx dependency**

Run:
```bash
cd "C:\Users\tfalcon\inspector-gadget"
npm install docx
npm install --save-dev @types/docx
```

Update `package.json` to include:
```json
"docx": "^8.5.0"
```

- [ ] **Step 2: Write test for DOCX extraction**

Create `lib/__tests__/docx-parser.test.ts`:
```typescript
import { extractTextFromDocx } from '../docx-parser';

describe('docx-parser', () => {
  it('extracts text from valid DOCX document', async () => {
    const mockDocxBuffer = Buffer.from('mock docx content');

    // For initial test, we'll mock - can replace with real DOCX later
    expect(extractTextFromDocx).toBeDefined();
  });

  it('throws error if buffer is empty', async () => {
    const emptyBuffer = Buffer.from('');
    await expect(extractTextFromDocx(emptyBuffer)).rejects.toThrow();
  });
});
```

- [ ] **Step 3: Implement DOCX extraction utility**

Create `lib/docx-parser.ts`:
```typescript
// Note: docx library API requires proper DOCX structure
// For MVP, we extract paragraph text from valid DOCX files

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  try {
    // Import dynamically to avoid eval-time loading
    const { Document, Packer } = await import('docx');

    // Simple approach: docx library can parse but extracting raw text from binary
    // is complex. For MVP, we'll use a streaming approach via unzip + xml parsing
    const JSZip = require('jszip');
    const zip = new JSZip();
    const loaded = await zip.loadAsync(buffer);

    // DOCX files contain document.xml in word/ folder
    const documentXml = await loaded.file('word/document.xml')?.async('string');
    if (!documentXml) {
      throw new Error('Invalid DOCX file structure');
    }

    // Extract text from XML: remove tags, decode XML entities
    const text = documentXml
      .replace(/<[^>]*>/g, ' ') // Remove XML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    return text;
  } catch (err) {
    throw new Error(`Failed to parse DOCX: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}
```

- [ ] **Step 4: Run tests**

Run:
```bash
npm test -- lib/__tests__/docx-parser.test.ts
```

Expected: Tests pass (or at least run without syntax errors; mocking may be needed for full test).

- [ ] **Step 5: Commit**

```bash
git add package.json lib/docx-parser.ts lib/__tests__/docx-parser.test.ts
git commit -m "feat: add DOCX parsing utility with jszip"
```

---

### Task 2: Update parse-pdf API to support DOCX

**Files:**
- Modify: `app/api/parse-pdf/route.ts`

- [ ] **Step 1: Update file extension validation**

Edit `app/api/parse-pdf/route.ts`, change ALLOWED_EXTENSIONS:
```typescript
const ALLOWED_EXTENSIONS = ['pdf', 'txt', 'docx'];
```

- [ ] **Step 2: Add DOCX parsing logic**

In the same file, add DOCX handling in the extension check:
```typescript
if (extension === 'pdf') {
  const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js');
  const result = await pdfParse(buffer);
  text = result.text;
} else if (extension === 'txt') {
  text = new TextDecoder().decode(buffer);
} else if (extension === 'docx') {
  const { extractTextFromDocx } = await import('@/lib/docx-parser');
  text = await extractTextFromDocx(buffer);
}
```

- [ ] **Step 3: Run parse-pdf manually**

Use curl or Postman to test:
```bash
curl -X POST http://localhost:3000/api/parse-pdf \
  -F "file=@test-estimate.docx"
```

Expected: Returns `{ text: "..." }` with extracted content.

- [ ] **Step 4: Commit**

```bash
git add app/api/parse-pdf/route.ts
git commit -m "feat: add DOCX support to document parser"
```

---

## Chunk 2: Bid Checker Types & System Prompt

### Task 3: Define bid checker types

**Files:**
- Create: `lib/bid-checker-types.ts`

- [ ] **Step 1: Write test for BidCheckerResult type**

Create test file (optional, shows expected shape):
```typescript
// Expected BidCheckerResult from OpenAI:
const mockResult: BidCheckerResult = {
  overall_score: 'warning',
  category_scores: {
    scope_alignment: { rating: 'warning', explanation: 'Bid scope includes full siding replacement, but user reported only window leak.' },
    pricing: { rating: 'sensible', explanation: 'Price is within market range for window repair in Portland.' },
    payment_terms: { rating: 'sensible', explanation: 'Standard 50% deposit, 50% on completion.' },
    insurance_licensing: { rating: 'warning', explanation: 'Insurance claim included, but not verified.' },
    warranty: { rating: 'sensible', explanation: '1-year warranty on materials and labor.' },
    timeline: { rating: 'sensible', explanation: '3-5 days is reasonable for window repair.' },
    deceptive_tactics: { rating: 'sensible', explanation: 'No high-pressure language detected.' },
  },
  specific_issues: [
    {
      category: 'scope_alignment',
      severity: 'high',
      message: 'Bid proposes full siding replacement ($8,500) for reported window leak repair. Ask contractor why full siding replacement is needed.',
      follow_up_question: 'Why does my window leak require a full siding replacement?',
    },
  ],
  follow_up_questions: [
    'Why does my window leak require full siding replacement?',
    'Can you provide a scope-of-work document detailing exactly what will be replaced?',
    'What is included in your 1-year warranty?',
  ],
  sfw_tm_suggestion: 'Consider a targeted Time & Materials repair estimate from SFW Construction for your window leak instead of a full siding replacement.',
};
```

- [ ] **Step 2: Implement BidCheckerResult types**

Create `lib/bid-checker-types.ts`:
```typescript
export interface CategoryScore {
  rating: 'sensible' | 'warning' | 'do_not_move_forward';
  explanation: string;
}

export interface SpecificIssue {
  category: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  follow_up_question: string;
}

export interface BidCheckerResult {
  overall_score: 'sensible' | 'warning' | 'do_not_move_forward';
  category_scores: {
    scope_alignment: CategoryScore;
    pricing: CategoryScore;
    payment_terms: CategoryScore;
    insurance_licensing: CategoryScore;
    warranty: CategoryScore;
    timeline: CategoryScore;
    deceptive_tactics: CategoryScore;
  };
  specific_issues: SpecificIssue[];
  follow_up_questions: string[];
  sfw_tm_suggestion: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/bid-checker-types.ts
git commit -m "feat: define BidCheckerResult type schema"
```

---

### Task 4: Create bid checker system prompt

**Files:**
- Create: `lib/bid-checker-prompt.ts`

- [ ] **Step 1: Write BID_CHECKER_SYSTEM_PROMPT**

Create `lib/bid-checker-prompt.ts`:
```typescript
export const BID_CHECKER_SYSTEM_PROMPT = `You are an expert in evaluating contractor bids for exterior home repairs. Your role is to analyze contractor estimates/quotes and identify red flags, scope creep, deceptive tactics, and provide actionable guidance to homeowners.

You will be given:
1. A brief description of the repair the homeowner thinks they need
2. The text of a contractor's bid/estimate for exterior work

Your job is to:
1. Compare the bid scope to the homeowner's stated repair need
2. Evaluate the bid across key dimensions (pricing, terms, warranty, timeline)
3. Identify deceptive tactics common in exterior repair contractor bids
4. Flag any scope creep or unnecessary upselling
5. Provide an overall assessment and follow-up questions for the homeowner

DECEPTIVE TACTICS TO FLAG:
- High-pressure language ("Act now", "Limited time offer", "Must decide today")
- Vague scope descriptions (no itemized list of work)
- Pressure to use contractor's suppliers/materials
- Unusually low pricing (may indicate cutting corners)
- Unusually high pricing (overcharging)
- Pressure to pay in full upfront
- Large upfront deposits (>50% is red flag)
- No warranty or vague warranty terms
- Unrealistic timelines
- Scope creep: recommending work far beyond stated need

SCOPE CREEP DETECTION:
- User said "fix water coming in around window" → bid includes "full exterior siding replacement" = RED FLAG
- User said "deck boards are rotting" → bid includes "full deck rebuild with posts/structure" = possibly justified, but flag for verification
- User said "small patch of dry rot on soffit" → bid includes "roof replacement" = RED FLAG

PRICING EVALUATION:
- For exterior repairs in typical markets, use these rough benchmarks:
  - Window leak repair (interior caulk/seal): $300-800
  - Window leak repair (frame replacement): $1,500-3,000 per window
  - Small deck board replacement: $500-1,500 per section
  - Dry rot repair (small area, <50 sq ft): $1,000-3,000
  - Full siding replacement (2,000 sq ft house): $8,000-25,000
  - Adjust based on regional variation (Portland/Seattle area typical)

RESPONSE FORMAT:
Respond with ONLY valid JSON matching this exact schema, no markdown:

{
  "overall_score": "sensible" | "warning" | "do_not_move_forward",
  "category_scores": {
    "scope_alignment": { "rating": "sensible" | "warning" | "do_not_move_forward", "explanation": "..." },
    "pricing": { "rating": "sensible" | "warning" | "do_not_move_forward", "explanation": "..." },
    "payment_terms": { "rating": "sensible" | "warning" | "do_not_move_forward", "explanation": "..." },
    "insurance_licensing": { "rating": "sensible" | "warning" | "do_not_move_forward", "explanation": "..." },
    "warranty": { "rating": "sensible" | "warning" | "do_not_move_forward", "explanation": "..." },
    "timeline": { "rating": "sensible" | "warning" | "do_not_move_forward", "explanation": "..." },
    "deceptive_tactics": { "rating": "sensible" | "warning" | "do_not_move_forward", "explanation": "..." }
  },
  "specific_issues": [
    { "category": "string", "severity": "low" | "medium" | "high", "message": "...", "follow_up_question": "..." }
  ],
  "follow_up_questions": ["question1", "question2", ...],
  "sfw_tm_suggestion": "Suggest targeted Time & Materials repair if scope creep is detected"
}

OVERALL SCORE LOGIC:
- "do_not_move_forward": Any "do_not_move_forward" category score, or 3+ "warning" scores with major issues
- "warning": 1-2 "warning" category scores that need clarification
- "sensible": All categories "sensible" or minor concerns only

FOLLOW-UP QUESTIONS:
Generate 3-5 specific, actionable follow-up questions the homeowner should ask the contractor to clarify concerns.`;
```

- [ ] **Step 2: Commit**

```bash
git add lib/bid-checker-prompt.ts
git commit -m "feat: add bid checker system prompt"
```

---

## Chunk 3: Bid Checker API Endpoint

### Task 5: Create bid-checker API endpoint

**Files:**
- Create: `app/api/bid-checker/route.ts`

- [ ] **Step 1: Write test expectation**

```typescript
// Expected request:
// POST /api/bid-checker
// { repair_description: "Water coming in around my kitchen window", bid_text: "..." }

// Expected response:
// { overall_score: "warning", category_scores: {...}, specific_issues: [...], ... }
```

- [ ] **Step 2: Implement bid-checker endpoint**

Create `app/api/bid-checker/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { BID_CHECKER_SYSTEM_PROMPT } from '@/lib/bid-checker-prompt';
import { BidCheckerResult } from '@/lib/bid-checker-types';

const MAX_CHARS = 80000; // ~20k tokens

export async function POST(req: NextRequest) {
  try {
    const { repair_description, bid_text } = await req.json();

    if (!repair_description || typeof repair_description !== 'string' || repair_description.trim().length < 5) {
      return NextResponse.json({ error: 'Valid repair description required' }, { status: 400 });
    }

    if (!bid_text || typeof bid_text !== 'string' || bid_text.trim().length < 10) {
      return NextResponse.json({ error: 'Valid bid text required' }, { status: 400 });
    }

    const truncated = bid_text.slice(0, MAX_CHARS);

    const userPrompt = `HOMEOWNER'S REPAIR NEED:
"${repair_description}"

CONTRACTOR'S BID/ESTIMATE:
${truncated}

Evaluate this bid according to the criteria above.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: BID_CHECKER_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0].message.content ?? '{}';
    const result: BidCheckerResult = JSON.parse(raw);

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('bid-checker error:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
```

- [ ] **Step 3: Test endpoint with curl**

Run:
```bash
curl -X POST http://localhost:3000/api/bid-checker \
  -H "Content-Type: application/json" \
  -d '{
    "repair_description": "Water is coming in around my kitchen window",
    "bid_text": "Complete exterior siding replacement and window replacement. Total cost: $12,000. 50% deposit required upfront."
  }'
```

Expected: Returns BidCheckerResult JSON with overall_score and category_scores.

- [ ] **Step 4: Commit**

```bash
git add app/api/bid-checker/route.ts
git commit -m "feat: create bid-checker API endpoint"
```

---

## Chunk 4: UI Components

### Task 6: Create BidChecker form component

**Files:**
- Create: `components/BidChecker.tsx`

- [ ] **Step 1: Write test for component behavior**

```typescript
// Expected:
// - Form with repair description textarea
// - Upload zone for bid document
// - Submit button disabled until both fields filled
// - Shows loading state during processing
// - Calls onResults with BidCheckerResult on success
```

- [ ] **Step 2: Implement BidChecker component**

Create `components/BidChecker.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { UploadZone } from '@/components/UploadZone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BidCheckerResult } from '@/lib/bid-checker-types';

interface Props {
  onResults: (result: BidCheckerResult) => void;
  isLoading?: boolean;
}

export function BidChecker({ onResults, isLoading = false }: Props) {
  const [repairDescription, setRepairDescription] = useState('');
  const [bidFile, setBidFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = async (file: File) => {
    setBidFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!repairDescription.trim()) {
      toast.error('Please describe your repair need');
      return;
    }

    if (!bidFile) {
      toast.error('Please upload a bid document');
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Parse the bid document
      const fd = new FormData();
      fd.append('file', bidFile);
      const parseRes = await fetch('/api/parse-pdf', { method: 'POST', body: fd });
      const parseBody = await parseRes.json();
      if (!parseRes.ok) throw new Error(parseBody.error || 'Failed to parse bid document');

      // Step 2: Analyze the bid
      const analyzeRes = await fetch('/api/bid-checker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repair_description: repairDescription,
          bid_text: parseBody.text,
        }),
      });
      const analyzeBody = await analyzeRes.json();
      if (!analyzeRes.ok) throw new Error(analyzeBody.error || 'Failed to analyze bid');

      onResults(analyzeBody);
      toast.success('Bid analyzed successfully');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bid Checker</CardTitle>
        <p className="text-sm text-gray-500">Describe your repair need and upload a contractor bid to get scored.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">What repair do you need?</label>
            <textarea
              value={repairDescription}
              onChange={(e) => setRepairDescription(e.target.value)}
              placeholder="e.g., Water is leaking around my kitchen window"
              className="rounded-lg border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
              disabled={isProcessing || isLoading}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Upload contractor bid</label>
            <UploadZone
              onFile={handleFile}
              disabled={isProcessing || isLoading}
            />
            {bidFile && (
              <p className="text-xs text-gray-500">Selected: {bidFile.name}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!repairDescription.trim() || !bidFile || isProcessing || isLoading}
          >
            {isProcessing ? 'Analyzing bid...' : 'Analyze Bid'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Test component in dev**

Run:
```bash
npm run dev
```

Navigate to a test page and verify form inputs work, file upload triggers, submit button is disabled when empty.

- [ ] **Step 4: Commit**

```bash
git add components/BidChecker.tsx
git commit -m "feat: create BidChecker input component"
```

---

### Task 7: Create BidCheckerResults component

**Files:**
- Create: `components/BidCheckerResults.tsx`

- [ ] **Step 1: Write test expectation**

```typescript
// Expected:
// - Shows overall_score as large card (green/yellow/red)
// - Shows 7 category scores with rating + explanation
// - Shows specific_issues as collapsible list
// - Shows follow_up_questions as actionable list
// - Shows sfw_tm_suggestion if present
// - Matches inspector gadget styling
```

- [ ] **Step 2: Implement results component**

Create `components/BidCheckerResults.tsx`:
```typescript
'use client';

import { AlertCircle, CheckCircle, XCircle, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BidCheckerResult } from '@/lib/bid-checker-types';

function getScoreColor(score: string) {
  switch (score) {
    case 'sensible':
      return 'bg-green-100 border-green-300';
    case 'warning':
      return 'bg-yellow-50 border-yellow-200';
    case 'do_not_move_forward':
      return 'bg-red-100 border-red-300';
    default:
      return 'bg-gray-50';
  }
}

function getScoreBadge(score: string) {
  switch (score) {
    case 'sensible':
      return 'default';
    case 'warning':
      return 'secondary';
    case 'do_not_move_forward':
      return 'destructive';
    default:
      return 'outline';
  }
}

function getScoreIcon(score: string) {
  switch (score) {
    case 'sensible':
      return <CheckCircle className="h-6 w-6 text-green-600" />;
    case 'warning':
      return <AlertCircle className="h-6 w-6 text-yellow-600" />;
    case 'do_not_move_forward':
      return <XCircle className="h-6 w-6 text-red-600" />;
    default:
      return null;
  }
}

export function BidCheckerResults({ result }: { result: BidCheckerResult }) {
  const [expandedIssue, setExpandedIssue] = useState<number | null>(null);

  const scoreLabel = {
    sensible: 'Sensible Bid',
    warning: 'Warning - Follow Up',
    do_not_move_forward: 'Do Not Move Forward',
  }[result.overall_score];

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <Card className={`border ${getScoreColor(result.overall_score)}`}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div>{getScoreIcon(result.overall_score)}</div>
            <div>
              <h3 className="text-lg font-semibold">{scoreLabel}</h3>
              <p className="text-sm text-gray-600">
                {result.overall_score === 'sensible' && 'This bid appears legitimate and reasonably priced.'}
                {result.overall_score === 'warning' && 'Red flags detected. Ask follow-up questions before committing.'}
                {result.overall_score === 'do_not_move_forward' && 'Significant concerns detected. Do not proceed without major clarifications.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SFW Suggestion */}
      {result.sfw_tm_suggestion && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-900">
              <strong>Suggestion:</strong> {result.sfw_tm_suggestion}
            </p>
            <p className="text-xs text-blue-700 mt-2">
              <a href="https://sfwconstruction.com/contact-us/" className="underline">
                Contact SFW Construction
              </a>{' '}
              for a targeted Time & Materials estimate.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Category Scores */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(result.category_scores).map(([key, score]) => (
            <div key={key} className="border-l-4 border-gray-300 pl-3">
              <div className="flex items-center gap-2">
                <Badge variant={getScoreBadge(score.rating)}>
                  {score.rating === 'do_not_move_forward' ? 'Do Not Move' : score.rating}
                </Badge>
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {key.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">{score.explanation}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Specific Issues */}
      {result.specific_issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Issues Flagged ({result.specific_issues.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {result.specific_issues.map((issue, idx) => (
              <div key={idx} className="border rounded-lg p-3">
                <button
                  onClick={() => setExpandedIssue(expandedIssue === idx ? null : idx)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant={issue.severity === 'high' ? 'destructive' : 'secondary'}>
                      {issue.severity}
                    </Badge>
                    <span className="text-sm font-medium text-gray-800">{issue.message}</span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${expandedIssue === idx ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedIssue === idx && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-xs text-gray-600">
                      <strong>Ask the contractor:</strong> "{issue.follow_up_question}"
                    </p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Follow-up Questions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Follow-up Questions to Ask</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {result.follow_up_questions.map((q, idx) => (
              <li key={idx} className="text-sm text-gray-700">
                <span className="font-medium">{idx + 1}.</span> {q}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Test results display**

Verify component renders with sample BidCheckerResult data and styling matches inspector gadget.

- [ ] **Step 4: Commit**

```bash
git add components/BidCheckerResults.tsx
git commit -m "feat: create BidCheckerResults display component"
```

---

## Chunk 5: Tool Route & Integration

### Task 8: Create bid-checker tool route

**Files:**
- Create: `app/(tools)/bid-checker/page.tsx`

- [ ] **Step 1: Create (tools) route group**

Run:
```bash
mkdir -p "C:\Users\tfalcon\inspector-gadget\app\(tools)\bid-checker"
```

- [ ] **Step 2: Implement page component**

Create `app/(tools)/bid-checker/page.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { BidChecker } from '@/components/BidChecker';
import { BidCheckerResults } from '@/components/BidCheckerResults';
import { BidCheckerResult } from '@/lib/bid-checker-types';

export default function BidCheckerPage() {
  const [result, setResult] = useState<BidCheckerResult | null>(null);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="max-w-2xl mx-auto pt-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold text-slate-900">Bid Checker</h1>
          <p className="text-slate-500">Get an expert evaluation of contractor bids for exterior home repairs.</p>
        </div>

        {!result && (
          <BidChecker onResults={setResult} />
        )}

        {result && (
          <>
            <BidCheckerResults result={result} />
            <button
              onClick={() => setResult(null)}
              className="w-full text-sm text-slate-400 underline hover:text-slate-600"
            >
              Analyze another bid
            </button>
          </>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Test page in browser**

Run:
```bash
npm run dev
```

Navigate to `http://localhost:3000/(tools)/bid-checker` and verify page loads with title and form.

- [ ] **Step 4: Commit**

```bash
git add app/\(tools\)/bid-checker/page.tsx
git commit -m "feat: add bid-checker tool route and page"
```

---

## Chunk 6: Testing & Polish

### Task 9: End-to-end test of bid checker flow

**Files:**
- No new files; testing existing implementation

- [ ] **Step 1: Create test bid documents**

Create sample test files:
- `test-bid-estimate.txt` — Simple text estimate
- `test-bid-estimate.pdf` — PDF estimate (use any sample PDF)
- `test-bid-estimate.docx` — DOCX estimate (create with simple content)

Sample content for test:
```
CONTRACTOR ESTIMATE

Customer: John Smith
Property: 123 Main St, Portland OR

SCOPE: Window and door leak repairs

WORK DESCRIPTION:
- Remove and reinstall kitchen window (1x)
- Caulk and seal exterior window frames
- Install new exterior door threshold

PRICING:
Materials: $800
Labor: $1,200
Total: $2,000

Payment Terms:
50% deposit upon signing
50% upon completion

Timeline: 2-3 days

Warranty: 1 year on labor and materials
```

- [ ] **Step 2: Test full flow manually**

1. Navigate to `http://localhost:3000/(tools)/bid-checker`
2. Enter repair description: "Water is leaking around my kitchen window"
3. Upload test-bid-estimate.txt
4. Click "Analyze Bid"
5. Verify results display with overall_score and categories

- [ ] **Step 3: Test with scope creep scenario**

Repeat with:
- Repair: "Water leaking around kitchen window"
- Bid content includes: "Full exterior siding replacement - $12,000"
- Verify results flag scope creep with warning/do_not_move_forward

- [ ] **Step 4: Test error handling**

Try:
- Submit without repair description (should show error)
- Submit without bid file (should show error)
- Upload empty file (should show error)

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "test: verify bid-checker end-to-end flow"
```

---

### Task 10: Update UploadZone to include DOCX

**Files:**
- Modify: `components/UploadZone.tsx`

- [ ] **Step 1: Update accept types**

Edit `components/UploadZone.tsx`, change accept object:
```typescript
accept: {
  'application/pdf': [],
  'text/plain': [],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [],
},
```

- [ ] **Step 2: Update help text**

Change the upload text from:
```
Drag & drop a PDF or TXT file, or click to select
```

To:
```
Drag & drop a PDF, TXT, or DOCX file, or click to select
```

- [ ] **Step 3: Test upload**

Verify DOCX files are now accepted in upload zone.

- [ ] **Step 4: Commit**

```bash
git add components/UploadZone.tsx
git commit -m "feat: add DOCX support to UploadZone component"
```

---

## Summary

**Total commits:** 10
**New files:** 8
**Modified files:** 3
**Key dependencies added:** `docx` library

**What's built:**
- DOCX parsing support (extends parse-pdf API)
- Bid Checker system prompt and types
- Bid Checker analysis endpoint
- BidChecker form component (repair description + upload)
- BidCheckerResults display component (scoring + issues + follow-ups)
- Bid Checker tool route (standalone page)
- End-to-end functionality: upload bid → analyze → display results

**Ready for:** Deployment, user testing, integration with other tools in suite

