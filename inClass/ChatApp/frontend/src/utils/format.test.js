import { formatBadgeCount, formatClock, formatDateTime } from './format';

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

describe('formatClock', () => {
  it('formats morning, noon, evening and midnight', () => {
    expect(formatClock(new Date(2026, 0, 1, 7, 5))).toBe('7:05 am');
    expect(formatClock(new Date(2026, 0, 1, 12, 0))).toBe('12:00 pm');
    expect(formatClock(new Date(2026, 0, 1, 19, 55))).toBe('7:55 pm');
    expect(formatClock(new Date(2026, 0, 1, 0, 30))).toBe('12:30 am');
  });

  it('returns empty text for an invalid date', () => {
    expect(formatClock('nope')).toBe('');
  });
});

describe('formatDateTime', () => {
  it('includes the date and time', () => {
    expect(formatDateTime(new Date(2026, 2, 12, 19, 55))).toBe('12 Mar 2026, 7:55 pm');
    expect(formatDateTime('bad')).toBe('');
  });
});
