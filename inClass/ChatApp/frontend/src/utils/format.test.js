import { formatAgo, formatBadgeCount, formatChatTime, formatClock, formatDateTime } from './format';

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

describe('formatLogTime', () => {
  it('pads 24-hour time with seconds', () => {
    const { formatLogTime } = jest.requireActual('./format');
    expect(formatLogTime(new Date(2026, 0, 1, 21, 5, 7))).toBe('21:05:07');
    expect(formatLogTime('nope')).toBe('');
  });
});

describe('formatAgo', () => {
  const now = new Date(2026, 10, 10, 12, 0, 0).getTime();
  it.each([
    [now - 2000, 'now'],
    [now - 12000, '12 s ago'],
    [now - 3 * 60000, '3 min ago'],
    [now - 2 * 3600000, '2 h ago'],
    [now + 5000, 'now'],
  ])('%p -> %s', (time, text) => expect(formatAgo(time, now)).toBe(text));
});

describe('formatChatTime', () => {
  const now = new Date(2026, 10, 10, 18, 0, 0).getTime(); // a tuesday
  it('shows the clock today, then yesterday, a weekday, then a date', () => {
    expect(formatChatTime(new Date(2026, 10, 10, 9, 5), now)).toBe('9:05 am');
    expect(formatChatTime(new Date(2026, 10, 9, 23, 59), now)).toBe('yesterday');
    expect(formatChatTime(new Date(2026, 10, 6, 10, 0), now)).toBe('fri');
    expect(formatChatTime(new Date(2026, 9, 2, 10, 0), now)).toBe('2 oct');
    expect(formatChatTime('nope', now)).toBe('');
  });
});
