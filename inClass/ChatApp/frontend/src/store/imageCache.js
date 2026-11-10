/**
 * imageCache: images from GET /file/{id} as data URIs, kept in memory by
 * file id (buildPlan.md 8, Images). Requests for the same id share one
 * fetch; the cache is bounded because each entry is a big base64 string.
 */
import { getFile } from '../api/files';
import { MAX_IMAGE_CACHE } from '../constants/config';
import { toDataUri } from '../utils/fileData';
import { sessionStore } from './sessionStore';

const cache = new Map();
const inFlight = new Map();

function remember(fileId, uri) {
  if (cache.size >= MAX_IMAGE_CACHE) cache.delete(cache.keys().next().value);
  cache.set(fileId, uri);
}

/** @param {string} fileId @returns {string | undefined} */
export function cachedImageUri(fileId) {
  return cache.get(fileId);
}

/**
 * @param {string} fileId
 * @returns {Promise<string>} a data URI
 */
export function loadImageUri(fileId) {
  if (cache.has(fileId)) return Promise.resolve(cache.get(fileId));
  if (inFlight.has(fileId)) return inFlight.get(fileId);

  const request = getFile(fileId)
    .then((file) => {
      const uri = toDataUri(file.mimeType, file.data);
      remember(fileId, uri);
      return uri;
    })
    .finally(() => inFlight.delete(fileId));
  inFlight.set(fileId, request);
  return request;
}

/** Adds an image we just uploaded, so it never has to be downloaded again. */
export function primeImage(fileId, uri) {
  remember(fileId, uri);
}

export function clearImageCache() {
  cache.clear();
}

sessionStore.subscribe((session) => {
  if (session.status === 'signedOut') clearImageCache();
});
