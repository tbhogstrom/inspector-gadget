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
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
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
