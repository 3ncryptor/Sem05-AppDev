import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

const BASE64_BODY = /^[A-Za-z0-9+/]*={0,2}$/;
const MIME_TYPE = /^[\w.+-]+\/[\w.+-]+$/;
const FALLBACK_MIME = 'application/octet-stream';

/** Image formats recognised from their bytes. Anything else is stored as kind FILE. */
const RECOGNISED_IMAGE_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/heic',
  'image/heif',
]);
const MIME_ALIASES: Record<string, string> = { 'image/jpg': 'image/jpeg' };
const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis']);
const HEIF_BRANDS = new Set(['mif1', 'msf1', 'heif']);

export interface StoredContent {
  bytes: Buffer;
  mimeType: string;
  kind: 'IMAGE' | 'FILE';
}

function normaliseMime(mime: string | undefined): string | undefined {
  if (!mime) return undefined;
  const lower = mime.trim().toLowerCase();
  if (!MIME_TYPE.test(lower)) {
    throw new BadRequestException(`Invalid MIME type '${mime}'`);
  }
  return MIME_ALIASES[lower] ?? lower;
}

/** Splits "data:<mime>;base64,<body>" or plain base64 into its parts. */
function splitPayload(input: string): { body: string; dataUrlMime?: string } {
  if (!input.startsWith('data:')) return { body: input };

  const comma = input.indexOf(',');
  const header = comma === -1 ? '' : input.slice(5, comma);
  if (!header.toLowerCase().split(';').includes('base64')) {
    throw new BadRequestException('Invalid base64: data URLs must use ";base64,"');
  }
  return { body: input.slice(comma + 1), dataUrlMime: header.split(';')[0] || undefined };
}

function decodeBase64(body: string): Buffer {
  const clean = body.replace(/\s/g, '');
  if (clean.length % 4 !== 0 || !BASE64_BODY.test(clean)) {
    throw new BadRequestException('Invalid base64');
  }
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const decodedSize = (clean.length / 4) * 3 - padding;
  if (decodedSize > MAX_FILE_BYTES) {
    throw new PayloadTooLargeException('File larger than 10 MB');
  }
  if (decodedSize === 0) {
    throw new BadRequestException('File is empty');
  }
  return Buffer.from(clean, 'base64');
}

function ascii(bytes: Buffer, start: number, end: number): string {
  return bytes.subarray(start, end).toString('latin1');
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const BMP_MIN_HEADER = 26;

/** Detects a supported image format from its magic bytes. */
export function detectImageMime(bytes: Buffer): string | undefined {
  if (bytes.subarray(0, 8).equals(PNG_SIGNATURE)) return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  const head6 = ascii(bytes, 0, 6);
  if (head6 === 'GIF87a' || head6 === 'GIF89a') return 'image/gif';
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') return 'image/webp';
  if (bytes.length >= BMP_MIN_HEADER && ascii(bytes, 0, 2) === 'BM') return 'image/bmp';
  if (ascii(bytes, 4, 8) === 'ftyp') {
    const brand = ascii(bytes, 8, 12);
    if (HEIC_BRANDS.has(brand)) return 'image/heic';
    if (HEIF_BRANDS.has(brand)) return 'image/heif';
  }
  return undefined;
}

function sameImageFamily(declared: string, detected: string): boolean {
  const heifFamily = ['image/heic', 'image/heif'];
  return declared === detected || (heifFamily.includes(declared) && heifFamily.includes(detected));
}

/**
 * Decodes an upload and decides how to store it.
 * Detected image bytes win over the declared type; a declared image type
 * whose bytes do not match is rejected.
 */
export function resolveUploadContent(data: string, mimeTypeField?: string): StoredContent {
  const { body, dataUrlMime } = splitPayload(data.trim());
  const declared = normaliseMime(mimeTypeField) ?? normaliseMime(dataUrlMime);
  const bytes = decodeBase64(body);
  const detected = detectImageMime(bytes);

  const declaredImageMismatch =
    declared !== undefined &&
    RECOGNISED_IMAGE_MIMES.has(declared) &&
    !(detected && sameImageFamily(declared, detected));
  if (declaredImageMismatch) {
    throw new BadRequestException(`Data is not a valid ${declared} image`);
  }
  if (detected) {
    return { bytes, mimeType: detected, kind: 'IMAGE' };
  }
  return { bytes, mimeType: declared ?? FALLBACK_MIME, kind: 'FILE' };
}

/** Builds a Content-Disposition value that cannot break out of the header. */
export function contentDisposition(type: 'inline' | 'attachment', fileName: string): string {
  const asciiName = fileName.replace(/[^\x20-\x7e]|["\\]/g, '_');
  const encoded = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `${type}; filename="${asciiName}"; filename*=UTF-8''${encoded}`;
}
