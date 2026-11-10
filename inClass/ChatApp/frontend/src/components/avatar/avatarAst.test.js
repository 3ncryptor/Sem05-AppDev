import { parse } from 'react-native-svg';
import { avatarAst, clearAvatarAstCache } from './avatarAst';

jest.mock('react-native-svg', () => ({ parse: jest.fn((xml) => ({ xml })) }));

beforeEach(() => {
  clearAvatarAstCache();
  parse.mockClear();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describe('avatarAst', () => {
  it('parses each (style, name) only once', () => {
    const first = avatarAst('aarav', 'lorelei');
    const again = avatarAst('aarav', 'lorelei');
    expect(again).toBe(first);
    expect(parse).toHaveBeenCalledTimes(1);
  });

  it('parses again for another style or name', () => {
    avatarAst('aarav', 'lorelei');
    avatarAst('aarav', 'notionists');
    avatarAst('diya', 'lorelei');
    expect(parse).toHaveBeenCalledTimes(3);
  });

  it('hands the cleaned SVG to the parser', () => {
    avatarAst('kabir', 'open-peeps');
    const xml = parse.mock.calls[0][0];
    expect(xml).toMatch(/^<svg/);
    expect(xml).not.toMatch(/<mask|<metadata/);
  });

  it('returns null and warns when parsing fails, without retrying every render', () => {
    parse.mockImplementationOnce(() => {
      throw new Error('bad xml');
    });
    expect(avatarAst('meera', 'lorelei')).toBeNull();
    expect(avatarAst('meera', 'lorelei')).toBeNull();
    expect(parse).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalled();
  });
});
