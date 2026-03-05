# Inspector Gadget Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a stateless Next.js 14 app that accepts a home inspection PDF/TXT, analyzes it with GPT-4o, and returns a prioritized action list with a stubbed HubSpot email form.

**Architecture:** Single Next.js 14 App Router project on Vercel. Two API routes handle PDF/TXT parsing and OpenAI analysis. The single-page UI drives a linear upload → process → results flow. The app is embedded as an iframe on WordPress and Astro sites.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, pdf-parse, react-dropzone, OpenAI SDK, sonner, Vercel

---

### Task 1: Scaffold the Next.js 14 project

**Files:**
- Create: `inspector-gadget/` (project root)

**Step 1: Scaffold with create-next-app**

Run from `C:/Users/tfalcon/`:
```bash
npx create-next-app@latest inspector-gadget \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --eslint
```

When prompted, accept all defaults.

**Step 2: Verify it runs**

```bash
cd inspector-gadget
npm run dev
```

Expected: server starts at http://localhost:3000

**Step 3: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold Next.js 14 project"
```

---

### Task 2: Install dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install runtime dependencies**

```bash
npm install openai pdf-parse react-dropzone sonner
npm install @types/pdf-parse --save-dev
```

**Step 2: Install shadcn/ui**

```bash
npx shadcn@latest init
```

When prompted:
- Style: Default
- Base color: Slate
- CSS variables: Yes

Then add the components we need:
```bash
npx shadcn@latest add card button badge collapsible
```

**Step 3: Verify no build errors**

```bash
npm run build
```

Expected: build succeeds with no errors

**Step 4: Commit**

```bash
git add .
git commit -m "chore: install dependencies and shadcn/ui"
```

---

### Task 3: Create environment variable setup

**Files:**
- Create: `.env.local`
- Create: `.env.example`

**Step 1: Create `.env.local`**

```bash
# .env.local — never commit this file
OPENAI_API_KEY=sk-your-key-here
```

**Step 2: Create `.env.example`**

```bash
# .env.example — commit this file
OPENAI_API_KEY=
```

**Step 3: Ensure `.env.local` is gitignored**

Check that `.gitignore` already contains `.env.local` (create-next-app adds this by default). If not, add it.

**Step 4: Commit**

```bash
git add .env.example .gitignore
git commit -m "chore: add env variable setup"
```

---

### Task 4: Create the parse-pdf API route

**Files:**
- Create: `app/api/parse-pdf/route.ts`

**Step 1: Write the route**

```typescript
// app/api/parse-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['pdf', 'txt'];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const fileEntry = formData.get('file');

    if (!fileEntry || typeof (fileEntry as any).arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const file = fileEntry as Blob & { name?: string };
    const extension = file.name?.split('.').pop()?.toLowerCase() ?? '';

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Only PDF and TXT files are allowed.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File too large. Max 10MB.' },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let text = '';

    if (extension === 'pdf') {
      const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js');
      const result = await pdfParse(buffer);
      text = result.text;
    } else if (extension === 'txt') {
      text = new TextDecoder().decode(buffer);
    }

    if (!text || text.trim().length < 10) {
      return NextResponse.json(
        { error: 'Could not extract text from this file. Try a different file.' },
        { status: 422 }
      );
    }

    return NextResponse.json({ text });
  } catch (err: any) {
    console.error('parse-pdf error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
```

**Step 2: Manual smoke test**

Start dev server (`npm run dev`), then in a new terminal use curl with a sample PDF:
```bash
curl -X POST http://localhost:3000/api/parse-pdf \
  -F "file=@/path/to/sample.pdf"
```

Expected: `{ "text": "... extracted text ..." }`

**Step 3: Commit**

```bash
git add app/api/parse-pdf/route.ts
git commit -m "feat: add parse-pdf API route"
```

---

### Task 5: Create the OpenAI client and system prompt

**Files:**
- Create: `lib/openai.ts`

**Step 1: Write the OpenAI client and prompt**

```typescript
// lib/openai.ts
import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const SYSTEM_PROMPT = `You are an expert home inspection analyst.
You will be given the raw text of a home inspection report.

Your job is to:
1. Extract the property address and client email if present
2. Identify every inspection issue mentioned in the report
3. Classify each issue by priority: "critical", "major", or "minor"
   - critical: safety hazards, structural problems, or items requiring immediate repair
   - major: significant defects that need repair soon but are not immediate safety hazards
   - minor: cosmetic issues, maintenance items, or minor defects
4. For each issue, identify the category (e.g. Roof, Plumbing, Electrical, Foundation, HVAC, etc.)
5. Note the location or section reference from the report
6. Provide a clear, actionable recommended action for the homeowner

You MUST respond with ONLY valid JSON matching this exact schema — no markdown, no explanation:

{
  "address": "string or null",
  "client_email": "string or null",
  "issues": [
    {
      "priority": "critical" | "major" | "minor",
      "category": "string",
      "description": "string",
      "location": "string",
      "action": "string"
    }
  ]
}

Order issues within each priority group by severity (most severe first).
If no issues are found, return an empty issues array.`;
```

**Step 2: Commit**

```bash
git add lib/openai.ts
git commit -m "feat: add OpenAI client and system prompt"
```

---

### Task 6: Create the analyze API route

**Files:**
- Create: `app/api/analyze/route.ts`

**Step 1: Write the route**

```typescript
// app/api/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { openai, SYSTEM_PROMPT } from '@/lib/openai';

const MAX_CHARS = 80000; // ~20k tokens, well within GPT-4o's 128k context

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string' || text.trim().length < 10) {
      return NextResponse.json({ error: 'No inspection text provided' }, { status: 400 });
    }

    // Truncate if extremely long — PoC simplification
    const truncated = text.slice(0, MAX_CHARS);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: truncated },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0].message.content ?? '{}';
    const result = JSON.parse(raw);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('analyze error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
```

**Step 2: Manual smoke test**

With dev server running, test with curl (replace text with a short inspection snippet):
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "Roof: Missing shingles on north slope. Recommend immediate repair. Electrical panel: Double-tapped breakers found. HVAC filter dirty, needs replacement."}'
```

Expected: JSON object with `address`, `client_email`, and `issues` array

**Step 3: Commit**

```bash
git add app/api/analyze/route.ts
git commit -m "feat: add analyze API route with GPT-4o"
```

---

### Task 7: Create the UploadZone component

**Files:**
- Create: `components/UploadZone.tsx`

**Step 1: Write the component**

```tsx
// components/UploadZone.tsx
'use client';

import { useDropzone } from 'react-dropzone';

interface Props {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function UploadZone({ onFile, disabled }: Props) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files[0] && onFile(files[0]),
    accept: {
      'application/pdf': [],
      'text/plain': [],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />
      <div className="space-y-2">
        <p className="text-lg font-medium text-gray-700">
          {isDragActive ? 'Drop your inspection report here' : 'Upload your inspection report'}
        </p>
        <p className="text-sm text-gray-500">
          Drag & drop a PDF or TXT file, or click to select
        </p>
        <p className="text-xs text-gray-400">Max 10MB</p>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/UploadZone.tsx
git commit -m "feat: add UploadZone component"
```

---

### Task 8: Create the ReportOutput component

**Files:**
- Create: `components/ReportOutput.tsx`

**Step 1: Define the shared type**

Create `lib/types.ts`:

```typescript
// lib/types.ts
export interface Issue {
  priority: 'critical' | 'major' | 'minor';
  category: string;
  description: string;
  location: string;
  action: string;
}

export interface AnalysisResult {
  address: string | null;
  client_email: string | null;
  issues: Issue[];
}
```

**Step 2: Write the component**

```tsx
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
```

**Step 3: Commit**

```bash
git add lib/types.ts components/ReportOutput.tsx
git commit -m "feat: add ReportOutput component with collapsible priority sections"
```

---

### Task 9: Create the HubSpot stub form component

**Files:**
- Create: `components/HubSpotForm.tsx`

**Step 1: Write the stub form**

```tsx
// components/HubSpotForm.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface Props {
  address: string | null;
  email: string | null;
}

export function HubSpotForm({ address, email }: Props) {
  const [formEmail, setFormEmail] = useState(email ?? '');
  const [formAddress, setFormAddress] = useState(address ?? '');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Replace with real HubSpot form submission
    // window.hbspt.forms.create({ portalId: '...', formId: '...' })
    console.log('HubSpot submit:', { email: formEmail, address: formAddress });
    toast.success('Report sent! Check your inbox.');
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-green-600 font-medium">Report sent to {formEmail}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Email me this report</CardTitle>
        <p className="text-sm text-gray-500">Review and confirm your details, then we'll send the report to your inbox.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Property Address</label>
            <input
              type="text"
              value={formAddress}
              onChange={e => setFormAddress(e.target.value)}
              className="p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="123 Main St, Springfield, IL"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Email Address</label>
            <input
              type="email"
              value={formEmail}
              onChange={e => setFormEmail(e.target.value)}
              required
              className="p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="you@email.com"
            />
          </div>
          <Button type="submit" className="w-full">Send Report to My Inbox</Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add components/HubSpotForm.tsx
git commit -m "feat: add HubSpot stub form component"
```

---

### Task 10: Wire up the main page

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`

**Step 1: Update layout.tsx to add Sonner toaster**

Replace the contents of `app/layout.tsx` with:

```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Inspector Gadget',
  description: 'AI-powered home inspection report analyzer',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

**Step 2: Write the main page**

Replace the contents of `app/page.tsx` with:

```tsx
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { UploadZone } from '@/components/UploadZone';
import { ReportOutput } from '@/components/ReportOutput';
import { HubSpotForm } from '@/components/HubSpotForm';
import { AnalysisResult } from '@/lib/types';

type AppState = 'upload' | 'processing' | 'results';

export default function Home() {
  const [state, setState] = useState<AppState>('upload');
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleFile = async (file: File) => {
    setState('processing');

    try {
      // Step 1: Parse the file
      const fd = new FormData();
      fd.append('file', file);
      const parseRes = await fetch('/api/parse-pdf', { method: 'POST', body: fd });
      const parseBody = await parseRes.json();
      if (!parseRes.ok) throw new Error(parseBody.error || 'Failed to parse file');

      // Step 2: Analyze the text
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: parseBody.text }),
      });
      const analyzeBody = await analyzeRes.json();
      if (!analyzeRes.ok) throw new Error(analyzeBody.error || 'Failed to analyze report');

      setResult(analyzeBody);
      setState('results');
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
      setState('upload');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="max-w-2xl mx-auto pt-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold text-slate-900">Inspector Gadget</h1>
          <p className="text-slate-500">Upload your inspection report and get a prioritized action list instantly.</p>
        </div>

        {state === 'upload' && (
          <UploadZone onFile={handleFile} />
        )}

        {state === 'processing' && (
          <div className="text-center py-16 space-y-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800 mx-auto" />
            <p className="text-slate-600 font-medium">Analyzing your inspection report...</p>
            <p className="text-slate-400 text-sm">This usually takes 15–30 seconds</p>
          </div>
        )}

        {state === 'results' && result && (
          <>
            <ReportOutput result={result} />
            <HubSpotForm address={result.address} email={result.client_email} />
            <button
              onClick={() => { setResult(null); setState('upload'); }}
              className="w-full text-sm text-slate-400 hover:text-slate-600 underline"
            >
              Analyze another report
            </button>
          </>
        )}
      </div>
    </main>
  );
}
```

**Step 3: Verify the full flow**

```bash
npm run dev
```

Open http://localhost:3000, upload a real inspection PDF, verify:
- Spinner appears during processing
- Results render with Critical/Major/Minor sections
- HubSpot form pre-populates with extracted address and email
- "Analyze another report" resets to upload state

**Step 4: Commit**

```bash
git add app/page.tsx app/layout.tsx
git commit -m "feat: wire up main page with full upload → analyze → results flow"
```

---

### Task 11: Deploy to Vercel

**Files:**
- None (Vercel reads from git)

**Step 1: Install Vercel CLI if not already installed**

```bash
npm install -g vercel
```

**Step 2: Deploy**

```bash
vercel
```

When prompted:
- Link to existing project? No — create new
- Project name: `inspector-gadget`
- Root directory: `./` (default)

**Step 3: Add environment variable in Vercel dashboard**

Go to the Vercel project → Settings → Environment Variables, add:
```
OPENAI_API_KEY = sk-your-key-here
```

**Step 4: Redeploy with env var**

```bash
vercel --prod
```

**Step 5: Test the live URL**

Upload a PDF to the live Vercel URL and verify the full flow works end-to-end.

**Step 6: Commit**

```bash
git add .
git commit -m "chore: production deployment to Vercel"
```

---

### Task 12: Test iframe embedding

**Step 1: Create a quick test HTML file**

Create `test-embed.html` in your home directory (`C:/Users/tfalcon/`):

```html
<!DOCTYPE html>
<html>
<head><title>iframe embed test</title></head>
<body>
  <h1>Host page</h1>
  <iframe
    src="https://your-inspector-gadget.vercel.app"
    width="100%"
    height="800"
    style="border: none; border-radius: 8px;"
  ></iframe>
</body>
</html>
```

Replace `your-inspector-gadget.vercel.app` with the actual Vercel URL.

**Step 2: Open in browser and verify**

Open the file in Chrome. Confirm the app loads inside the iframe and the full flow works.

**Step 3: Clean up**

```bash
rm C:/Users/tfalcon/test-embed.html
```

---

## Post-PoC: HubSpot Wiring

When ready to connect the real HubSpot form, replace the `handleSubmit` function in `components/HubSpotForm.tsx` with the HubSpot embed script approach:

```tsx
// Load HubSpot forms script in layout.tsx (add to <head>)
// <script src="//js.hsforms.net/forms/embed/v2.js" async />

// Then in HubSpotForm.tsx useEffect:
window.hbspt.forms.create({
  portalId: 'YOUR_PORTAL_ID',
  formId: 'YOUR_FORM_ID',
  target: '#hubspot-form-container',
});
```

You'll need the portal ID and form ID from your HubSpot account.
