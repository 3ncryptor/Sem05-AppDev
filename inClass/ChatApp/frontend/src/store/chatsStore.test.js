import { listConversations } from '../api/conversations';
import { ApiError } from '../api/ApiError';
import { listUsers } from '../api/users';
import { addConversation, chatsStore, loadConversations } from './chatsStore';
import { directoryStore } from './directoryStore';
import { sessionStore } from './sessionStore';

jest.mock('../api/conversations', () => ({ listConversations: jest.fn() }));
jest.mock('../api/users', () => ({ listUsers: jest.fn() }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
}));

const dm = {
  id: 'c1',
  type: 'DM',
  name: null,
  participants_ids: ['me', 'u2'],
  createdAt: '2026-01-01',
};

beforeEach(() => {
  chatsStore.reset();
  directoryStore.reset();
  listConversations.mockReset();
  listUsers.mockReset().mockResolvedValue([
    { id: 'me', name: 'aarav' },
    { id: 'u2', name: 'diya' },
  ]);
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describe('chatsStore', () => {
  it('loads conversations and fetches unknown users', async () => {
    listConversations.mockResolvedValue([dm]);
    await loadConversations();
    expect(chatsStore.get()).toMatchObject({ status: 'ready', conversations: [dm] });
    expect(listUsers).toHaveBeenCalled();
  });

  it('keeps the same list object when a poll finds no change', async () => {
    listConversations.mockResolvedValue([dm]);
    await loadConversations();
    const before = chatsStore.get().conversations;
    listConversations.mockResolvedValue([{ ...dm }]);
    await loadConversations({ isPoll: true });
    expect(chatsStore.get().conversations).toBe(before);
  });

  it('moves the banner to reconnecting and back', async () => {
    listConversations.mockRejectedValueOnce(new ApiError({ kind: 'network', message: 'x' }));
    await loadConversations({ isPoll: true });
    expect(chatsStore.get()).toMatchObject({ connection: 'reconnecting', status: 'error' });

    listConversations.mockResolvedValue([dm]);
    await loadConversations({ isPoll: true });
    expect(chatsStore.get().connection).toBe('restored');
  });

  it('keeps showing old chats when a later poll fails', async () => {
    listConversations.mockResolvedValueOnce([dm]);
    await loadConversations();
    listConversations.mockRejectedValueOnce(new ApiError({ kind: 'timeout', message: 'x' }));
    await loadConversations({ isPoll: true });
    expect(chatsStore.get()).toMatchObject({ status: 'ready', conversations: [dm] });
  });

  it('adds a new conversation at the top', () => {
    addConversation(dm);
    expect(chatsStore.get().conversations[0]).toBe(dm);
  });

  it('clears everything when the user signs out', () => {
    addConversation(dm);
    sessionStore.set({ status: 'signedOut' });
    expect(chatsStore.get().conversations).toEqual([]);
  });
});
