import { activeFaces, byActivity, greeting, unreadSummary } from './homeSummary';

describe('greeting', () => {
  it.each([
    [6, 'good morning'],
    [11, 'good morning'],
    [12, 'good afternoon'],
    [17, 'good evening'],
    [22, 'good night'],
    [2, 'good night'],
  ])('%i:00 -> %s', (hour, text) => expect(greeting(hour)).toBe(text));
});

describe('unreadSummary', () => {
  it.each([
    [{ messages: 0, chats: 0 }, 'all caught up'],
    [{ messages: 1, chats: 1 }, '1 new message'],
    [{ messages: 4, chats: 1 }, '4 new messages'],
    [{ messages: 3, chats: 2 }, '3 new in 2 chats'],
  ])('%j -> %s', (total, text) => expect(unreadSummary(total)).toBe(text));
});

const at = (minute) => new Date(2026, 10, 10, 12, minute).toISOString();

describe('byActivity', () => {
  const chats = [
    { id: 'a', createdAt: at(1) },
    { id: 'b', createdAt: at(2) },
    { id: 'c', createdAt: at(3) },
  ];
  it('puts the chat with the newest message first, then newest created', () => {
    const byChat = { a: { latest: { createdAt: at(50) } }, b: { latest: { createdAt: at(10) } } };
    expect(byActivity(chats, byChat).map((chat) => chat.id)).toEqual(['a', 'b', 'c']);
  });
  it('does not change the input array', () => {
    const copy = [...chats];
    byActivity(chats, {});
    expect(chats).toEqual(copy);
  });
});

describe('activeFaces', () => {
  const rows = [
    { id: 'a', name: 'diya', unread: 0, lastAt: Date.parse(at(10)) },
    { id: 'b', name: 'kabir', unread: 2, lastAt: Date.parse(at(5)) },
    { id: 'c', name: 'meera', unread: 0, lastAt: 0 },
  ];
  it('keeps people with any message, unread first, then most recent', () => {
    expect(activeFaces(rows, 8).map((face) => face.name)).toEqual(['kabir', 'diya']);
  });
  it('respects the limit', () => {
    expect(activeFaces(rows, 1)).toHaveLength(1);
  });
});
