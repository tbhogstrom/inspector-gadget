import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { BID_CHECKER_SYSTEM_PROMPT } from '@/lib/bid-checker-prompt';
import { BidCheckerResult } from '@/lib/bid-checker-types';

const MAX_CHARS = 80000;

export async function POST(req: NextRequest) {
  try {
    const { repair_description, bid_text } = await req.json();

    if (!repair_description || typeof repair_description !== 'string' || repair_description.trim().length < 5) {
      return NextResponse.json({ error: 'Valid repair description required' }, { status: 400 });
    }

    if (!bid_text || typeof bid_text !== 'string' || bid_text.trim().length < 10) {
      return NextResponse.json({ error: 'Valid bid text required' }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: BID_CHECKER_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `HOMEOWNER REPAIR NEED:\n${repair_description.trim()}\n\nCONTRACTOR BID:\n${bid_text
            .slice(0, MAX_CHARS)
            .trim()}`,
        },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    const result: BidCheckerResult = JSON.parse(raw);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('bid-checker error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
