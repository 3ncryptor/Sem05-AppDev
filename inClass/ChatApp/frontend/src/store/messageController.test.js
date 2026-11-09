import { ApiError } from '../api/ApiError';
import { listMessages, sendMessage } from '../api/messages';
import { createMessageController } from './messageController';

jest.mock('../api/messages', () => ({ listMessages: jest.fn(), sendMessage: jest.fn() }));
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn() }));

const msg = (id, minute, senderId = 'other') => ({
  id,
  senderId,
  content: id,
  createdAt: `2026-01-01T10:${String(minute).padStart(2, '0')}:00Z`,
  status: {},
});

let chat;
beforeEach(() => {
  listMessages.mockReset();
  sendMessage.mockReset();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  chat = createMessageController({ conversationId: 'conv123456', myId: 'me' });
});
afterEach(() => jest.restoreAllMocks());

const ids = () => chat.store.get().messages.map((m) => m.id);

describe('messageController', () => {
  it('loads the newest page newest first', async () => {
    listMessages.mockResolvedValue({
      data: [msg('m1', 1), msg('m2', 2)],
      nextCursor: 'm1',
      count: 2,
    });
    await chat.loadInitial();
    expect(ids()).toEqual(['m2', 'm1']);
    expect(chat.store.get()).toMatchObject({ status: 'ready', nextCursor: 'm1' });
  });

  it('polls in new messages, counts unseen ones and marks them fresh', async () => {
    listMessages.mockResolvedValueOnce({ data: [msg('m1', 1)], nextCursor: null });
    await chat.loadInitial();
    listMessages.mockResolvedValueOnce({ data: [msg('m1', 1), msg('m2', 2)], nextCursor: null });
    await chat.poll();
    expect(ids()).toEqual(['m2', 'm1']);
    expect(chat.store.get().unseen).toBe(1);
    expect(chat.store.get().messages[0].isFresh).toBe(true);
    expect(listMessages).toHaveBeenLastCalledWith('conv123456', { isPoll: true });
    chat.markSeen();
    expect(chat.store.get().unseen).toBe(0);
  });

  it('loads older pages with the cursor and stops at the end', async () => {
    listMessages.mockResolvedValueOnce({ data: [msg('m3', 3)], nextCursor: 'm3' });
    await chat.loadInitial();
    listMessages.mockResolvedValueOnce({ data: [msg('m1', 1), msg('m2', 2)], nextCursor: null });
    await chat.loadOlder();
    expect(listMessages).toHaveBeenLastCalledWith('conv123456', { cursor: 'm3' });
    expect(ids()).toEqual(['m3', 'm2', 'm1']);
    await chat.loadOlder();
    expect(listMessages).toHaveBeenCalledTimes(2);
  });

  it('sends optimistically and swaps in the server copy', async () => {
    let resolve;
    sendMessage.mockReturnValue(new Promise((r) => (resolve = r)));
    const pending = chat.send('  hi  ');
    expect(chat.store.get().messages[0]).toMatchObject({ content: 'hi', localState: 'sending' });
    resolve(msg('s1', 5, 'me'));
    expect(await pending).toBe(true);
    expect(ids()).toEqual(['s1']);
    expect(sendMessage).toHaveBeenCalledWith({ conversationId: 'conv123456', content: 'hi' });
  });

  it('marks a failed send and retries it', async () => {
    sendMessage.mockRejectedValueOnce(new ApiError({ kind: 'network', message: 'x' }));
    expect(await chat.send('hi')).toBe(false);
    const failed = chat.store.get().messages[0];
    expect(failed.localState).toBe('failed');

    sendMessage.mockResolvedValueOnce(msg('s1', 5, 'me'));
    expect(await chat.retry(failed.id)).toBe(true);
    expect(ids()).toEqual(['s1']);
  });

  it('ignores empty messages and unknown retries', async () => {
    expect(await chat.send('   ')).toBe(false);
    expect(await chat.retry('local-nope')).toBe(false);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('shows an error when the first load fails and goes offline on poll failure', async () => {
    listMessages.mockRejectedValueOnce(
      new ApiError({ kind: 'http', status: 404, message: 'Not found' }),
    );
    await chat.loadInitial();
    expect(chat.store.get()).toMatchObject({ status: 'error', error: 'Not found' });
    listMessages.mockRejectedValueOnce(new ApiError({ kind: 'network', message: 'x' }));
    await chat.poll();
    expect(chat.store.get().isLive).toBe(false);
  });
});
