import { joinUrl, lanUrlFromHostUri, normalizeServerUrl } from './serverUrl';

describe('lanUrlFromHostUri', () => {
  it('swaps the Metro port for the backend port', () => {
    expect(lanUrlFromHostUri('192.168.1.5:8081')).toBe('http://192.168.1.5:3000');
  });

  it('works for localhost (simulator) and a custom port', () => {
    expect(lanUrlFromHostUri('localhost:8081', 4000)).toBe('http://localhost:4000');
  });

  it('ignores a path after the host', () => {
    expect(lanUrlFromHostUri('10.0.0.2:8081/--/home')).toBe('http://10.0.0.2:3000');
  });

  it('returns null for missing or tunnel hosts', () => {
    expect(lanUrlFromHostUri(undefined)).toBeNull();
    expect(lanUrlFromHostUri('')).toBeNull();
    expect(lanUrlFromHostUri('abc-anonymous-8081.exp.direct')).toBeNull();
  });
});

describe('normalizeServerUrl', () => {
  it('adds the scheme and default port', () => {
    expect(normalizeServerUrl('10.7.1.51')).toEqual({ url: 'http://10.7.1.51:3000' });
  });

  it('keeps an explicit scheme and port and drops trailing slashes', () => {
    expect(normalizeServerUrl(' https://Chat.Example.com:8443/ ')).toEqual({
      url: 'https://chat.example.com:8443',
    });
  });

  it('keeps a path prefix', () => {
    expect(normalizeServerUrl('http://10.0.0.1:3000/api/')).toEqual({
      url: 'http://10.0.0.1:3000/api',
    });
  });

  it('rejects empty input, junk and bad ports', () => {
    expect(normalizeServerUrl('')).toHaveProperty('error');
    expect(normalizeServerUrl(undefined)).toHaveProperty('error');
    expect(normalizeServerUrl('not a url!')).toHaveProperty('error');
    expect(normalizeServerUrl('ftp://10.0.0.1')).toHaveProperty('error');
    expect(normalizeServerUrl('10.0.0.1:0')).toHaveProperty('error');
    expect(normalizeServerUrl('10.0.0.1:70000')).toHaveProperty('error');
  });
});

describe('joinUrl', () => {
  it('puts exactly one slash between base and path', () => {
    expect(joinUrl('http://a:3000/', '/user')).toBe('http://a:3000/user');
    expect(joinUrl('http://a:3000', 'user')).toBe('http://a:3000/user');
  });
});
