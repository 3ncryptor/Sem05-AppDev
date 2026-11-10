import { saveJson } from '../store/persist';
import { sessionStore } from '../store/sessionStore';
import {
  inboxStore,
  markChatRead,
  onInboxNews,
  recordCheck,
  recordFailure,
  restoreInbox,
  setOpenChat,
} from './inboxStore';

jest.mock('../store/persist', () => ({
  loadJson: jest.fn(() => Promise.resolve({ c9: 5 })),
  saveJson: jest.fn(() => Promise.resolve(true)),
  removeKey: jest.fn(),
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
}));

const t = (minute) => new Date(2026, 10, 10, 12, minute).toISOString();
const msg = (id, senderId, minute) => ({ id, senderId, createdAt: t(minute), content: id });

beforeEach(() => {
  inboxStore.reset();
  saveJson.mockClear();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describe('inboxStore', () => {
  it('restores read times for the signed-in user', async () => {
    await restoreInbox('aarav');
    expect(inboxStore.get()).toMatchObject({ userKey: 'aarav', lastReadAt: { c9: 5 } });
  });

  it('treats what is already there as read on the first check', () => {
    recordCheck('c1', [msg('1', 'diya', 1), msg('2', 'diya', 2)], 'me');
    expect(inboxStore.get().byChat.c1).toMatchObject({ unread: 0 });
    expect(inboxStore.get().byChat.c1.latest.id).toBe('2');
  });

  it('counts and announces messages that arrive later', () => {
    const news = jest.fn();
    const stop = onInboxNews(news);
    recordCheck('c1', [msg('1', 'diya', 1)], 'me');
    recordCheck('c1', [msg('1', 'diya', 1), msg('2', 'diya', 2), msg('3', 'me', 3)], 'me');
    recordCheck(
      'c1',
      [msg('1', 'diya', 1), msg('2', 'diya', 2), msg('3', 'me', 3), msg('4', 'diya', 4)],
      'me',
    );
    stop();

    expect(news).toHaveBeenCalledTimes(2);
    expect(news.mock.calls[1][0]).toEqual({ chatId: 'c1', messages: [msg('4', 'diya', 4)] });
    expect(inboxStore.get().byChat.c1.unread).toBe(1);
  });

  it('marks a chat read when it is opened, and stays quiet about it', async () => {
    await restoreInbox('aarav');
    const news = jest.fn();
    const stop = onInboxNews(news);
    recordCheck('c1', [msg('1', 'diya', 1)], 'me');
    setOpenChat('c1');
    recordCheck('c1', [msg('1', 'diya', 1), msg('2', 'diya', 2)], 'me');
    stop();
    expect(news).not.toHaveBeenCalled();
    expect(saveJson).toHaveBeenCalled();
  });

  it('clears unread when the chat is read', () => {
    recordCheck('c1', [msg('1', 'diya', 1)], 'me');
    recordCheck('c1', [msg('1', 'diya', 1), msg('2', 'diya', 50)], 'me');
    expect(inboxStore.get().byChat.c1.unread).toBe(1);
    markChatRead('c1', Date.parse(t(51)));
    expect(inboxStore.get().byChat.c1.unread).toBe(0);
  });

  it('does not announce old history when the first check failed', () => {
    const news = jest.fn();
    const stop = onInboxNews(news);
    recordFailure('c1');
    recordCheck('c1', [msg('1', 'diya', 1), msg('2', 'diya', 2)], 'me');
    stop();
    expect(news).not.toHaveBeenCalled();
  });

  it('keeps read marks made before the saved copy loaded', async () => {
    markChatRead('c1', 99);
    await restoreInbox('aarav');
    expect(inboxStore.get().lastReadAt).toEqual({ c9: 5, c1: 99 });
  });

  it('counts failures for back off, and a success resets them', () => {
    recordFailure('c1');
    recordFailure('c1');
    expect(inboxStore.get().byChat.c1.failures).toBe(2);
    recordCheck('c1', [msg('1', 'diya', 1)], 'me');
    expect(inboxStore.get().byChat.c1.failures).toBe(0);
  });

  it('forgets everything on sign out', async () => {
    await restoreInbox('aarav');
    recordCheck('c1', [msg('1', 'diya', 1)], 'me');
    sessionStore.set({ status: 'signedOut' });
    expect(inboxStore.get()).toMatchObject({ byChat: {}, userKey: '' });
  });
});
