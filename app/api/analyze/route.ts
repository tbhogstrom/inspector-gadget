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
  } catch (err: unknown) {
    console.error('analyze error:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
