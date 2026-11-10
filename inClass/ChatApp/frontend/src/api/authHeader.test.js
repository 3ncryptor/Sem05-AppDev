import { buildAuthHeader, usernameError } from './authHeader';

describe('buildAuthHeader', () => {
  it('is the raw "Basic name:password" text', () => {
    expect(buildAuthHeader('aarav', 'demo123')).toBe('Basic aarav:demo123');
  });

  it('is never base64', () => {
    expect(buildAuthHeader('aarav', 'demo123')).not.toContain('YWFyYXY6ZGVtbzEyMw==');
  });
});

describe('usernameError', () => {
  it('accepts a plain name', () => {
    expect(usernameError('aarav')).toBeNull();
  });

  it('rejects empty, padded and colon names', () => {
    expect(usernameError('')).toMatch(/enter/i);
    expect(usernameError('   ')).toMatch(/enter/i);
    expect(usernameError(' aarav')).toMatch(/spaces/i);
    expect(usernameError('a:b')).toMatch(/":"/);
  });
});
