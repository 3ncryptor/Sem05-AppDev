import { formatBadgeCount } from './format';

describe('formatBadgeCount', () => {
  it('shows nothing for zero, negative or invalid counts', () => {
    expect(formatBadgeCount(0)).toBe('');
    expect(formatBadgeCount(-3)).toBe('');
    expect(formatBadgeCount(Number.NaN)).toBe('');
  });

  it('shows small counts as they are', () => {
    expect(formatBadgeCount(1)).toBe('1');
    expect(formatBadgeCount(9)).toBe('9');
  });

  it('caps large counts at 9+', () => {
    expect(formatBadgeCount(10)).toBe('9+');
    expect(formatBadgeCount(250)).toBe('9+');
  });
});
