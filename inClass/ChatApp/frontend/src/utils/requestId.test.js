import { createRequestId } from './requestId';

describe('createRequestId', () => {
  it('matches the pattern the backend accepts', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(createRequestId()).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
    }
  });

  it('is unlikely to repeat', () => {
    const ids = new Set(Array.from({ length: 200 }, createRequestId));
    expect(ids.size).toBeGreaterThan(195);
  });
});
