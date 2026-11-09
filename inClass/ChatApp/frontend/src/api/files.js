/** File endpoints (swagger: /file). Upload first, then send a message with the file id. */
import { request } from './client';

/**
 * @param {{ fileName: string, mimeType?: string, data: string }} input data is base64 or a data URL (10 MB max)
 */
export function uploadFile({ fileName, mimeType, data }) {
  return request('/file', {
    method: 'POST',
    body: { file_name: fileName, mime_type: mimeType, data },
  });
}

/** File details including its base64 data. */
export function getFile(id) {
  return request(`/file/${encodeURIComponent(id)}`);
}
