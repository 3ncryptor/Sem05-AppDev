import { completeSignIn, restoreSession, sessionStore, signOut } from './sessionStore';

// In-memory stand-in for the Keychain. Jest allows factory variables prefixed "mock".
const mockSaved = new Map();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((key) => Promise.resolve(mockSaved.get(key) ?? null)),
  setItemAsync: jest.fn((key, value) => Promise.resolve(void mockSaved.set(key, value))),
  deleteItemAsync: jest.fn((key) => Promise.resolve(void mockSaved.delete(key))),
}));

jest.mock('expo-constants', () => ({ expoConfig: { hostUri: '192.168.1.5:8081' } }));

const user = { id: 'u1', name: 'aarav' };

beforeEach(() => {
  mockSaved.clear();
  sessionStore.reset();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describe('sessionStore', () => {
  it('starts in the restoring state', () => {
    expect(sessionStore.get().status).toBe('restoring');
  });

  it('restores to signedOut with the LAN server when nothing is saved', async () => {
    await restoreSession();
    expect(sessionStore.get()).toMatchObject({
      status: 'signedOut',
      serverMode: 'lan',
      baseUrl: 'http://192.168.1.5:3000',
    });
  });

  it('remembers a sign-in across a restart', async () => {
    await completeSignIn({
      serverMode: 'custom',
      customUrl: '10.7.1.51',
      baseUrl: 'http://10.7.1.51:3000',
      name: 'aarav',
      password: 'demo123',
      user,
    });
    sessionStore.reset();
    await restoreSession();
    expect(sessionStore.get()).toMatchObject({
      status: 'signedIn',
      name: 'aarav',
      password: 'demo123',
      baseUrl: 'http://10.7.1.51:3000',
      user,
    });
  });

  it('sign out forgets the password but keeps server and name', async () => {
    await completeSignIn({
      serverMode: 'lan',
      customUrl: '',
      baseUrl: 'http://192.168.1.5:3000',
      name: 'aarav',
      password: 'demo123',
      user,
    });
    await signOut();
    expect(sessionStore.get()).toMatchObject({ status: 'signedOut', name: 'aarav', password: '' });

    sessionStore.reset();
    await restoreSession();
    expect(sessionStore.get()).toMatchObject({ status: 'signedOut', name: 'aarav', password: '' });
  });

  it('survives unreadable storage', async () => {
    mockSaved.set('huddle.session', '{not json');
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    await restoreSession();
    expect(sessionStore.get().status).toBe('signedOut');
    expect(console.warn).toHaveBeenCalled();
  });
});
