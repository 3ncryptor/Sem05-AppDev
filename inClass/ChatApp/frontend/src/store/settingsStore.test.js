import { Appearance } from 'react-native';
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  restoreSettings,
  settingsStore,
  updateSettings,
} from './settingsStore';

const mockSaved = new Map();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((key) => Promise.resolve(mockSaved.get(key) ?? null)),
  setItemAsync: jest.fn((key, value) => Promise.resolve(void mockSaved.set(key, value))),
}));

beforeEach(() => {
  mockSaved.clear();
  settingsStore.reset();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('normalizeSettings', () => {
  it('uses defaults for missing or broken values', () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(
      normalizeSettings({ avatarStyle: 'robots', appearance: 'neon', showOrb: 'yes', extra: 1 }),
    ).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid values', () => {
    const custom = {
      avatarStyle: 'notionists',
      appearance: 'dark',
      showOrb: false,
      shakeToOpen: false,
    };
    expect(normalizeSettings(custom)).toEqual(custom);
  });
});

describe('settingsStore', () => {
  it('saves updates, applies appearance and restores after a restart', async () => {
    await updateSettings({ avatarStyle: 'open-peeps', appearance: 'dark' });
    expect(settingsStore.get().avatarStyle).toBe('open-peeps');
    expect(Appearance.setColorScheme).toHaveBeenLastCalledWith('dark');

    settingsStore.reset();
    await restoreSettings();
    expect(settingsStore.get()).toMatchObject({ avatarStyle: 'open-peeps', appearance: 'dark' });
  });

  it('maps auto to the system setting', async () => {
    await updateSettings({ appearance: 'auto' });
    expect(Appearance.setColorScheme).toHaveBeenLastCalledWith('unspecified');
  });
});
