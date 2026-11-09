import { LOG_STRING_LIMIT } from '../constants/config';
import { previewBody, safeForLog } from './logBody';

describe('safeForLog', () => {
  it('hides password-like keys at any depth', () => {
    const out = safeForLog({ name: 'aarav', password: 'demo123', nested: { token: 'x' } });
    expect(out).toEqual({ name: 'aarav', password: '<hidden>', nested: { token: '<hidden>' } });
  });

  it('shortens long strings such as base64 images', () => {
    const data = 'A'.repeat(LOG_STRING_LIMIT + 50);
    expect(safeForLog({ data })).toEqual({ data: `<${data.length} chars>` });
  });

  it('keeps short strings, numbers and arrays', () => {
    expect(safeForLog({ ids: ['a', 'b'], n: 3, ok: true })).toEqual({
      ids: ['a', 'b'],
      n: 3,
      ok: true,
    });
  });

  it('does not change the input', () => {
    const input = { password: 'demo123' };
    safeForLog(input);
    expect(input.password).toBe('demo123');
  });

  it('stops at deep nesting', () => {
    expect(safeForLog({ a: { b: { c: { d: { e: 1 } } } } })).toEqual({
      a: { b: { c: { d: '<nested>' } } },
    });
  });
});

describe('previewBody', () => {
  it('is empty for no body', () => {
    expect(previewBody(undefined)).toBe('');
    expect(previewBody(null)).toBe('');
  });

  it('prints a safe one-line JSON preview', () => {
    expect(previewBody({ content: 'hi', password: 'p' })).toBe(
      '{"content":"hi","password":"<hidden>"}',
    );
  });
});
