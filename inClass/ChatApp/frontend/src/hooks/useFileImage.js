/**
 * useFileImage: the data URI of an uploaded image, from the in-memory cache
 * or downloaded once with GET /file/{id}.
 */
import { useEffect, useState } from 'react';
import { cachedImageUri, loadImageUri } from '../store/imageCache';
import { log } from '../utils/logger';

/**
 * @param {string | null | undefined} fileId
 * @returns {{ uri: string | undefined, status: 'loading' | 'ready' | 'error', reload: () => void }}
 */
export function useFileImage(fileId) {
  const [uri, setUri] = useState(() => (fileId ? cachedImageUri(fileId) : undefined));
  const [status, setStatus] = useState(uri ? 'ready' : 'loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!fileId) return undefined;
    let isActive = true;
    loadImageUri(fileId)
      .then((loaded) => {
        if (!isActive) return;
        setUri(loaded);
        setStatus('ready');
      })
      .catch((error) => {
        if (!isActive) return;
        setStatus('error');
        log.warn(`image ${fileId}: ${error?.message ?? error}`);
      });
    return () => {
      isActive = false;
    };
  }, [fileId, attempt]);

  return {
    uri,
    status,
    reload: () => {
      setStatus('loading');
      setAttempt((count) => count + 1);
    },
  };
}
