import { ApiError } from '../api/ApiError';
import { classifyLoginError, hasErrors, validateLogin } from './loginForm';

describe('validateLogin', () => {
  it('accepts a filled form', () => {
    const errors = validateLogin({ name: 'aarav', password: 'demo123' });
    expect(errors).toEqual({ name: '', password: '' });
    expect(hasErrors(errors)).toBe(false);
  });

  it('flags a missing name and password', () => {
    const errors = validateLogin({ name: '', password: '' });
    expect(errors.name).toMatch(/username/i);
    expect(errors.password).toMatch(/password/i);
    expect(hasErrors(errors)).toBe(true);
  });
});

describe('classifyLoginError', () => {
  const url = 'http://10.0.0.5:3000';

  it('puts a wrong password under the password field with the server text', () => {
    const error = new ApiError({ kind: 'http', status: 401, message: 'Invalid password' });
    expect(classifyLoginError(error, url)).toEqual({
      field: 'password',
      message: 'Invalid password',
    });
  });

  it('puts unreachable servers under the server picker', () => {
    for (const kind of ['network', 'timeout']) {
      expect(classifyLoginError(new ApiError({ kind, message: 'x' }), url)).toEqual({
        field: 'server',
        message: `Can't reach ${url}`,
      });
    }
  });

  it('shows anything else on the form', () => {
    const error = new ApiError({ kind: 'http', status: 500, message: 'boom' });
    expect(classifyLoginError(error, url).field).toBe('form');
    expect(classifyLoginError(new Error('x'), url).field).toBe('form');
  });
});
