import { getFile } from '../api/files';
import { MAX_IMAGE_CACHE } from '../constants/config';
import { cachedImageUri, clearImageCache, loadImageUri, primeImage } from './imageCache';

jest.mock('../api/files', () => ({ getFile: jest.fn() }));
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn() }));

beforeEach(() => {
  clearImageCache();
  getFile
    .mockReset()
    .mockImplementation((id) => Promise.resolve({ id, mimeType: 'image/png', data: 'YWJj' }));
});

describe('imageCache', () => {
  it('downloads once and serves later calls from memory', async () => {
    expect(await loadImageUri('f1')).toBe('data:image/png;base64,YWJj');
    await loadImageUri('f1');
    expect(getFile).toHaveBeenCalledTimes(1);
    expect(cachedImageUri('f1')).toBe('data:image/png;base64,YWJj');
  });

  it('shares one request between simultaneous callers', async () => {
    await Promise.all([loadImageUri('f2'), loadImageUri('f2')]);
    expect(getFile).toHaveBeenCalledTimes(1);
  });

  it('can be primed with an image we uploaded', async () => {
    primeImage('f3', 'data:x');
    expect(await loadImageUri('f3')).toBe('data:x');
    expect(getFile).not.toHaveBeenCalled();
  });

  it('forgets the oldest entry past the cap', () => {
    for (let i = 0; i <= MAX_IMAGE_CACHE; i += 1) primeImage(`p${i}`, 'u');
    expect(cachedImageUri('p0')).toBeUndefined();
    expect(cachedImageUri(`p${MAX_IMAGE_CACHE}`)).toBe('u');
  });

  it('lets a failed download be retried', async () => {
    getFile.mockRejectedValueOnce(new Error('down'));
    await expect(loadImageUri('f4')).rejects.toThrow('down');
    expect(await loadImageUri('f4')).toMatch(/^data:/);
  });
});
