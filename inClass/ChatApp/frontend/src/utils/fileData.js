/**
 * Helpers for sending and showing images as base64 (the backend's only
 * file format: POST /file takes base64, GET /file/{id} returns it).
 */
import { MAX_UPLOAD_BYTES } from '../constants/config';

const MIME_BY_EXTENSION = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
};

/**
 * Decoded size of a base64 string (or data URL) in bytes.
 * @param {string} data
 */
export function base64Bytes(data) {
  const body = data.includes(',') ? data.slice(data.indexOf(',') + 1) : data;
  const padding = body.endsWith('==') ? 2 : body.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((body.length * 3) / 4) - padding);
}

/** @param {string} data */
export function isTooLarge(data) {
  return base64Bytes(data) > MAX_UPLOAD_BYTES;
}

/**
 * A data URI for <Image>; data that is already a data URL is returned as is.
 * @param {string} mimeType
 * @param {string} data base64
 */
export function toDataUri(mimeType, data) {
  if (data.startsWith('data:')) return data;
  return `data:${mimeType || 'image/jpeg'};base64,${data}`;
}

/** @param {string | null | undefined} fileName */
export function guessMimeType(fileName) {
  const extension = (fileName ?? '').split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXTENSION[extension] ?? 'image/jpeg';
}

/**
 * Name to upload a picked photo under; pickers often give none.
 * @param {string | null | undefined} fileName
 * @param {number} [now]
 */
export function uploadFileName(fileName, now = Date.now()) {
  return fileName?.trim() || `photo-${now}.jpg`;
}

/** Human file size, e.g. "1.4 MB". @param {number} bytes */
export function formatBytes(bytes) {
  if (!(bytes > 0)) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
