import { PDFDocument, PDFTextField, rgb } from 'pdf-lib';
import { PDFParse } from 'pdf-parse';

type PdfTextItem = {
  str?: string;
  width?: number;
  height?: number;
  transform?: number[];
};

type PdfTextMatch = PdfTextItem & { pageIndex: number };

const getValue = (data: Record<string, unknown>, key: string): string => {
  const value = key.split('.').reduce<unknown>((current, segment) => (
    current && typeof current === 'object'
      ? (current as Record<string, unknown>)[segment]
      : undefined
  ), data);
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
};

async function extractTextItems(source: Buffer): Promise<{ readableText: string; items: PdfTextMatch[] }> {
  const parser = new PDFParse({ data: source });
  await parser.getText();
  // pdf-parse keeps the loaded pdf.js document private in its typings, but it is
  // available at runtime and gives us the exact coordinates needed for replacement.
  const document = (parser as unknown as { doc: any }).doc;
  const items: PdfTextMatch[] = [];
  let readableText = '';

  for (let pageIndex = 0; pageIndex < document.numPages; pageIndex += 1) {
    const page = await document.getPage(pageIndex + 1);
    const content = await page.getTextContent();
    for (const item of content.items as PdfTextItem[]) {
      if (!item.str) continue;
      readableText += item.str;
      items.push({ ...item, pageIndex });
    }
  }
  await parser.destroy();
  return { readableText, items };
}

export async function assertPdfHasReadableText(source: Buffer) {
  try {
    const { readableText } = await extractTextItems(source);
    if (!readableText.trim()) throw new Error('empty text layer');
  } catch {
    throw new Error('PDF không có lớp văn bản có thể đọc. Hãy dùng PDF xuất từ Word/design tool, không dùng file scan ảnh.');
  }
}

export async function renderPdfTemplate(source: Buffer, data: Record<string, unknown>): Promise<Buffer> {
  const { items } = await extractTextItems(source);
  const document = await PDFDocument.load(source, { ignoreEncryption: true });

  // Fill actual PDF form fields when the template uses them. Field names are variable codes.
  const form = document.getForm();
  for (const field of form.getFields()) {
    if (field instanceof PDFTextField) field.setText(getValue(data, field.getName()));
  }

  // Plain-text placeholders are replaced in place when exported as a text PDF.
  for (const item of items) {
    const match = item.str?.match(/^\{\{\s*([\w.-]+)\s*\}\}$/);
    const transform = item.transform;
    if (!match || !transform) continue;
    const page = document.getPages()[item.pageIndex];
    const x = transform[4] || 0;
    const y = transform[5] || 0;
    const height = Math.max(Number(item.height) || Math.abs(transform[3]) || 11, 7);
    const width = Math.max(Number(item.width) || 0, 8);
    const value = getValue(data, match[1]);
    page.drawRectangle({ x: x - 1, y: y - 2, width: width + 2, height: height + 4, color: rgb(1, 1, 1) });
    if (value) page.drawText(value, { x, y, size: Math.min(height, 16), color: rgb(0, 0, 0) });
  }

  const bytes = await document.save();
  return Buffer.from(bytes);
}
