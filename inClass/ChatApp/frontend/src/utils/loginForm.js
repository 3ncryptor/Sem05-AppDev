/**
 * Pure login-form rules, kept out of the hook so they can be tested:
 * what to say about the inputs before sending, and where to show a
 * failed login (under the password, under the server, or the whole form).
 */
import { ApiError, friendlyMessage } from '../api/ApiError';
import { usernameError } from '../api/authHeader';

/**
 * @param {{ name: string, password: string }} form
 * @returns {{ name: string, password: string }} empty strings mean "fine"
 */
export function validateLogin({ name, password }) {
  return {
    name: usernameError(name) ?? '',
    password: password ? '' : 'Enter a password.',
  };
}

/**
 * @param {{ name: string, password: string }} errors from validateLogin
 */
export function hasErrors(errors) {
  return Boolean(errors.name || errors.password);
}

/**
 * Decides where a failed login is shown.
 * @param {unknown} error
 * @param {string} baseUrl
 * @returns {{ field: 'password' | 'server' | 'form', message: string }}
 */
export function classifyLoginError(error, baseUrl) {
  if (error instanceof ApiError && error.kind === 'http' && error.status === 401) {
    return { field: 'password', message: error.message };
  }
  if (error instanceof ApiError && (error.kind === 'network' || error.kind === 'timeout')) {
    return { field: 'server', message: `Can't reach ${baseUrl}` };
  }
  return { field: 'form', message: friendlyMessage(error) };
}
