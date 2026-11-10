import {
  applyPage,
  backoffMs,
  checkGapMs,
  latestMessage,
  messagePreview,
  newFromOthers,
  nextChatToCheck,
  totalUnread,
  unreadCount,
} from './inboxLogic';

const at = (minute) => new Date(2026, 10, 10, 12, minute).toISOString();
const msg = (id, senderId, minute, extra = {}) => ({
  id,
  senderId,
  createdAt: at(minute),
  content: `text ${id}`,
  type: 'TEXT',
  ...extra,
});

describe('checkGapMs: spreads one cycle evenly over every chat', () => {
  it('divides the cycle by the number of chats', () => {
    expect(checkGapMs(10000, 4)).toBe(2500);
  });
  it('never goes below the floor, even with many chats', () => {
    expect(checkGapMs(10000, 200)).toBe(1000);
  });
  it('waits a full cycle when there is nothing to check', () => {
    expect(checkGapMs(10000, 0)).toBe(10000);
  });
});

describe('nextChatToCheck: round robin that skips the open chat', () => {
  const ids = ['a', 'b', 'c'];
  it('walks the list in order and wraps around', () => {
    expect(nextChatToCheck(ids, null, null)).toBe('a');
    expect(nextChatToCheck(ids, 'a', null)).toBe('b');
    expect(nextChatToCheck(ids, 'c', null)).toBe('a');
  });
  it('skips the chat that is on screen (it polls itself)', () => {
    expect(nextChatToCheck(ids, 'a', 'b')).toBe('c');
  });
  it('restarts when the last checked chat disappeared', () => {
    expect(nextChatToCheck(ids, 'gone', null)).toBe('a');
  });
  it('returns null when nothing else is left', () => {
    expect(nextChatToCheck([], null, null)).toBeNull();
    expect(nextChatToCheck(['a'], null, 'a')).toBeNull();
  });
});

describe('latestMessage and preview', () => {
  it('finds the newest message whatever the order', () => {
    expect(latestMessage([msg('1', 'u', 1), msg('3', 'u', 3), msg('2', 'u', 2)]).id).toBe('3');
    expect(latestMessage([])).toBeNull();
  });
  it('describes text, photos and empty messages', () => {
    expect(messagePreview(msg('1', 'u', 1, { content: '  hello  there ' }))).toBe('hello there');
    expect(messagePreview(msg('1', 'u', 1, { type: 'IMAGE', content: '', fileId: 'f' }))).toBe(
      'photo',
    );
    expect(messagePreview(msg('1', 'u', 1, { fileId: 'f', content: 'look' }))).toBe('photo: look');
    expect(messagePreview(null)).toBe('');
  });
});

describe('unreadCount: messages from others since this phone last opened the chat', () => {
  const page = [msg('1', 'me', 1), msg('2', 'diya', 2), msg('3', 'diya', 3)];
  it('counts only other people, newer than the last read time', () => {
    expect(unreadCount(page, 'me', at(2))).toBe(1);
    expect(unreadCount(page, 'me', 0)).toBe(2);
  });
  it('treats a chat as read once I have replied after the messages', () => {
    expect(unreadCount([msg('2', 'diya', 2), msg('4', 'me', 4)], 'me', 0)).toBe(0);
  });
});

describe('newFromOthers: what arrived since the last check', () => {
  it('returns only unseen messages from others, oldest first', () => {
    const seen = new Set(['1']);
    const page = [
      msg('3', 'diya', 3),
      msg('1', 'diya', 1),
      msg('2', 'me', 2),
      msg('4', 'kabir', 4),
    ];
    expect(newFromOthers(page, seen, 'me').map((m) => m.id)).toEqual(['3', '4']);
  });
});

describe('applyPage: one chat entry from a fresh page', () => {
  it('records the latest message, unread count and seen ids', () => {
    const entry = applyPage(undefined, [msg('1', 'diya', 1), msg('2', 'diya', 2)], {
      myId: 'me',
      lastReadAt: at(1),
      now: 5,
    });
    expect(entry).toMatchObject({ unread: 1, checkedAt: 5, failures: 0 });
    expect(entry.latest.id).toBe('2');
    expect(entry.seenIds).toEqual(['1', '2']);
  });

  it('keeps the old latest message when a page comes back empty', () => {
    const before = applyPage(undefined, [msg('1', 'diya', 1)], {
      myId: 'me',
      lastReadAt: 0,
      now: 1,
    });
    const after = applyPage(before, [], { myId: 'me', lastReadAt: 0, now: 2 });
    expect(after.latest.id).toBe('1');
  });
});

describe('totalUnread', () => {
  it('sums unread chats and counts how many have any', () => {
    const byChat = { a: { unread: 2 }, b: { unread: 0 }, c: { unread: 3 } };
    expect(totalUnread(byChat)).toEqual({ messages: 5, chats: 2 });
  });
});

describe('backoffMs', () => {
  it('doubles per failure up to a ceiling', () => {
    expect(backoffMs(0, 1000)).toBe(0);
    expect(backoffMs(1, 1000)).toBe(1000);
    expect(backoffMs(3, 1000)).toBe(4000);
    expect(backoffMs(20, 1000)).toBe(60000);
  });
});
