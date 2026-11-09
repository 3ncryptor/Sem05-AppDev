import { hashString, pickBySeed } from './hash';

describe('hashString', () => {
  it('is stable for the same input', () => {
    expect(hashString('aarav')).toBe(hashString('aarav'));
  });

  it('differs for different inputs', () => {
    expect(hashString('aarav')).not.toBe(hashString('diya'));
  });

  it('returns a non-negative integer, also for an empty string', () => {
    for (const text of ['', 'a', 'kabir', 'a much longer name with spaces']) {
      const value = hashString(text);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('pickBySeed', () => {
  const items = ['a', 'b', 'c'];

  it('always picks the same item for the same seed', () => {
    expect(pickBySeed(items, 'meera')).toBe(pickBySeed(items, 'meera'));
  });

  it('always returns an item from the list', () => {
    for (const seed of ['aarav', 'diya', 'kabir', 'meera', 'rohan', '']) {
      expect(items).toContain(pickBySeed(items, seed));
    }
  });
});
