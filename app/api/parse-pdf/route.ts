// app/api/parse-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['pdf', 'txt', 'docx'];

function isFileLike(value: FormDataEntryValue | null): value is File {
  return value instanceof File;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const fileEntry = formData.get('file');

    if (!isFileLike(fileEntry)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const file = fileEntry;
    const extension = file.name?.split('.').pop()?.toLowerCase() ?? '';

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Only PDF, TXT, and DOCX files are allowed.' },
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
    let extractionHint = '';

    if (extension === 'pdf') {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore — import lib directly to avoid pdf-parse index.js loading a test file at eval time
      const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js');
      const result = await pdfParse(buffer);
      text = result.text;
      extractionHint = 'If this PDF is a scan or image-only document, text extraction will fail without OCR.';
    } else if (extension === 'txt') {
      text = new TextDecoder().decode(buffer);
    } else if (extension === 'docx') {
      const { extractTextFromDocx } = await import('@/lib/docx-parser');
      text = await extractTextFromDocx(buffer);
    }

    if (!text || !text.trim()) {
      return NextResponse.json(
        {
          error: extractionHint
            ? `Could not extract text from this file. ${extractionHint}`
            : 'Could not extract text from this file. Try a different file.',
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ text });
  } catch (err: unknown) {
    console.error('parse-pdf error:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
