import { ApiError, friendlyMessage, messageFromBody } from './ApiError';

describe('messageFromBody', () => {
  it('reads a string message', () => {
    expect(messageFromBody({ message: 'Invalid password' }, 401)).toBe('Invalid password');
  });

  it('joins validation message arrays', () => {
    expect(messageFromBody({ message: ['a is required', 'b too long'] }, 400)).toBe(
      'a is required, b too long',
    );
  });

  it('falls back to the status for empty or odd bodies', () => {
    expect(messageFromBody(null, 500)).toBe('Request failed (500)');
    expect(messageFromBody('oops', 502)).toBe('Request failed (502)');
  });
});

describe('friendlyMessage', () => {
  it('keeps 4xx server messages', () => {
    const error = new ApiError({ kind: 'http', status: 401, message: 'Invalid password' });
    expect(friendlyMessage(error)).toBe('Invalid password');
  });

  it('uses plain words for timeouts, network errors and 5xx', () => {
    expect(friendlyMessage(new ApiError({ kind: 'timeout', message: 'x' }))).toMatch(/too long/);
    expect(friendlyMessage(new ApiError({ kind: 'network', message: 'x' }))).toMatch(/reach/);
    expect(friendlyMessage(new ApiError({ kind: 'http', status: 500, message: 'x' }))).toMatch(
      /problem/,
    );
  });

  it('handles errors that are not ApiError', () => {
    expect(friendlyMessage(new Error('boom'))).toMatch(/went wrong/);
  });
});
