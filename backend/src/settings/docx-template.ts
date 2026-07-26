import { deflateRawSync, inflateRawSync } from 'zlib';

type ZipEntry = { name: string; data: Buffer };

const LOCAL_SIGNATURE = 0x04034b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const END_SIGNATURE = 0x06054b50;

export function renderDocxTemplate(source: Buffer, values: Record<string, unknown>) {
  const entries = readZip(source).map((entry) => ({
    ...entry,
    data: shouldRenderXml(entry.name) ? Buffer.from(replaceWordText(entry.data.toString('utf8'), values)) : entry.data,
  }));
  return writeZip(entries);
}

function shouldRenderXml(name: string) {
  return /^word\/(document|header\d+|footer\d+|footnotes|endnotes)\.xml$/.test(name);
}

function replaceWordText(xml: string, values: Record<string, unknown>) {
  return xml.replace(/(<w:t(?:\s[^>]*)?>)([\s\S]*?)(<\/w:t>)/g, (_whole, open, text, close) => {
    const replaced = text.replace(/{{\s*([\w.]+)\s*}}/g, (token: string, key: string) => {
      const value = resolveValue(values, key);
      return value === undefined || value === null ? token : escapeXml(String(value));
    });
    return `${open}${replaced}${close}`;
  });
}

function resolveValue(values: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce<unknown>((current, segment) => (
    current && typeof current === 'object' ? (current as Record<string, unknown>)[segment] : undefined
  ), values);
}

function escapeXml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function readZip(source: Buffer): ZipEntry[] {
  const end = source.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0) throw new Error('File DOCX không hợp lệ');
  const count = source.readUInt16LE(end + 10);
  let offset = source.readUInt32LE(end + 16);
  const entries: ZipEntry[] = [];
  for (let index = 0; index < count; index += 1) {
    if (source.readUInt32LE(offset) !== CENTRAL_SIGNATURE) throw new Error('Không đọc được cấu trúc DOCX');
    const method = source.readUInt16LE(offset + 10);
    const compressedSize = source.readUInt32LE(offset + 20);
    const nameLength = source.readUInt16LE(offset + 28);
    const extraLength = source.readUInt16LE(offset + 30);
    const commentLength = source.readUInt16LE(offset + 32);
    const localOffset = source.readUInt32LE(offset + 42);
    const name = source.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');
    if (source.readUInt32LE(localOffset) !== LOCAL_SIGNATURE) throw new Error('Không đọc được nội dung DOCX');
    const localNameLength = source.readUInt16LE(localOffset + 26);
    const localExtraLength = source.readUInt16LE(localOffset + 28);
    const compressed = source.subarray(localOffset + 30 + localNameLength + localExtraLength, localOffset + 30 + localNameLength + localExtraLength + compressedSize);
    entries.push({ name, data: method === 0 ? Buffer.from(compressed) : inflateRawSync(compressed) });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function writeZip(entries: ZipEntry[]) {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  entries.forEach((entry) => {
    const name = Buffer.from(entry.name);
    const compressed = deflateRawSync(entry.data);
    const crc = crc32(entry.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(LOCAL_SIGNATURE, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0, 6); local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(compressed.length, 18); local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26); local.writeUInt16LE(0, 28);
    locals.push(local, name, compressed);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(CENTRAL_SIGNATURE, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0, 8); central.writeUInt16LE(8, 10);
    central.writeUInt32LE(crc, 16); central.writeUInt32LE(compressed.length, 20); central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(name.length, 28); central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += local.length + name.length + compressed.length;
  });
  const centralSize = centrals.reduce((sum, item) => sum + item.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(END_SIGNATURE, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(centralSize, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

function crc32(value: Buffer) {
  let crc = 0xffffffff;
  for (const byte of value) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
