import { MAX_UPLOAD_BYTES } from '../constants/config';
import {
  base64Bytes,
  formatBytes,
  guessMimeType,
  isTooLarge,
  toDataUri,
  uploadFileName,
} from './fileData';

describe('base64Bytes', () => {
  it('counts decoded bytes including padding', () => {
    expect(base64Bytes('aGk=')).toBe(2); // "hi"
    expect(base64Bytes('aGVsbG8=')).toBe(5); // "hello"
    expect(base64Bytes('YWJj')).toBe(3); // "abc"
    expect(base64Bytes('')).toBe(0);
  });

  it('ignores a data URL prefix', () => {
    expect(base64Bytes('data:image/png;base64,YWJj')).toBe(3);
  });
});

describe('isTooLarge', () => {
  it('flags data over the 10 MB cap', () => {
    const justOver = 'A'.repeat(Math.ceil(((MAX_UPLOAD_BYTES + 3) * 4) / 3));
    expect(isTooLarge(justOver)).toBe(true);
    expect(isTooLarge('YWJj')).toBe(false);
  });
});

describe('toDataUri', () => {
  it('wraps base64 and leaves data URLs alone', () => {
    expect(toDataUri('image/png', 'YWJj')).toBe('data:image/png;base64,YWJj');
    expect(toDataUri('', 'YWJj')).toBe('data:image/jpeg;base64,YWJj');
    expect(toDataUri('image/png', 'data:image/gif;base64,x')).toBe('data:image/gif;base64,x');
  });
});

describe('guessMimeType and uploadFileName', () => {
  it('maps extensions with a jpeg fallback', () => {
    expect(guessMimeType('a.PNG')).toBe('image/png');
    expect(guessMimeType('noext')).toBe('image/jpeg');
    expect(guessMimeType(null)).toBe('image/jpeg');
  });

  it('names nameless photos', () => {
    expect(uploadFileName('IMG_1.jpg')).toBe('IMG_1.jpg');
    expect(uploadFileName(null, 42)).toBe('photo-42.jpg');
    expect(uploadFileName('  ', 7)).toBe('photo-7.jpg');
  });
});

describe('formatBytes', () => {
  it('formats B, KB and MB', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.5 MB');
  });
});
