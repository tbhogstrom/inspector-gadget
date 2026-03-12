import JSZip from 'jszip';

const XML_ENTITY_MAP: Record<string, string> = {
  amp: '&',
  apos: '\'',
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
};

function decodeXmlEntities(value: string) {
  return value.replace(/&(#x?[0-9a-f]+|\w+);/gi, (_match, entity: string) => {
    if (entity.startsWith('#x')) {
      const codePoint = Number.parseInt(entity.slice(2), 16);
      return Number.isNaN(codePoint) ? '' : String.fromCodePoint(codePoint);
    }

    if (entity.startsWith('#')) {
      const codePoint = Number.parseInt(entity.slice(1), 10);
      return Number.isNaN(codePoint) ? '' : String.fromCodePoint(codePoint);
    }

    return XML_ENTITY_MAP[entity] ?? '';
  });
}

function normalizeDocxXml(xml: string) {
  return xml
    .replace(/<w:tab\b[^>]*\/>/g, '\t')
    .replace(/<w:br\b[^>]*\/>/g, '\n')
    .replace(/<w:cr\b[^>]*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<\/w:tr>/g, '\n')
    .replace(/<\/w:tc>/g, '\t')
    .replace(/<[^>]+>/g, '')
    .split('\n')
    .map((line) => decodeXmlEntities(line).replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  if (!buffer.length) {
    throw new Error('DOCX file is empty');
  }

  try {
    const zip = await JSZip.loadAsync(buffer);
    const contentFiles = zip
      .file(/^word\/(document|header\d+|footer\d+|footnotes|endnotes)\.xml$/)
      .sort((left, right) => left.name.localeCompare(right.name));

    if (contentFiles.length === 0) {
      throw new Error('Invalid DOCX file structure');
    }

    const sections = await Promise.all(
      contentFiles.map(async (file) => normalizeDocxXml(await file.async('string')))
    );
    const text = sections.filter(Boolean).join('\n\n').trim();

    if (!text) {
      throw new Error('No text content found in DOCX file');
    }

    return text;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to parse DOCX: ${message}`);
  }
}
