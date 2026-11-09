/**
 * useLogin: state and actions for the login screen (buildPlan.md 8, Login).
 * validate -> GET /user/profile with the typed credentials -> on 200 show
 * the check mark briefly, then save the session (the route guard moves the
 * app on). Errors land under the field they belong to.
 */
import { useState } from 'react';
import { lanBaseUrl } from '../api/baseUrl';
import { getProfile } from '../api/users';
import { LOGIN_SUCCESS_HOLD_MS } from '../constants/config';
import { completeSignIn, sessionStore } from '../store/sessionStore';
import { haptics } from '../utils/haptics';
import { log } from '../utils/logger';
import { classifyLoginError, hasErrors, validateLogin } from '../utils/loginForm';
import { normalizeServerUrl } from '../utils/serverUrl';

const NO_ERRORS = { name: '', password: '', server: '', form: '' };

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useLogin() {
  const saved = sessionStore.get();
  const [serverMode, setServerMode] = useState(saved.serverMode);
  const [customUrl, setCustomUrl] = useState(saved.customUrl);
  const [name, setName] = useState(saved.name);
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState(NO_ERRORS);
  const [status, setStatus] = useState('idle');

  /** The URL that will be used, or null with a reason in `serverError`. */
  function targetUrl() {
    if (serverMode === 'lan') {
      const url = lanBaseUrl();
      return url
        ? { url }
        : { error: "Can't find this Mac's address. Choose class server and type it in." };
    }
    return normalizeServerUrl(customUrl);
  }

  async function submit() {
    if (status !== 'idle') return;
    const target = targetUrl();
    const fieldErrors = validateLogin({ name, password });
    const next = { ...NO_ERRORS, ...fieldErrors, server: target.error ?? '' };
    setErrors(NO_ERRORS);
    if (hasErrors(fieldErrors) || target.error) {
      // Set after clearing so a repeated message still shakes the field.
      setTimeout(() => setErrors(next), 0);
      return;
    }

    const baseUrl = target.url;
    setStatus('loading');
    log.app(`login: trying ${name} @ ${baseUrl}`);
    try {
      const user = await getProfile({ connection: { baseUrl, name, password } });
      setStatus('success');
      haptics.success();
      await wait(LOGIN_SUCCESS_HOLD_MS);
      await completeSignIn({ serverMode, customUrl, baseUrl, name, password, user });
    } catch (error) {
      const { field, message } = classifyLoginError(error, baseUrl);
      setStatus('idle');
      setErrors({ ...NO_ERRORS, [field]: message });
      if (field === 'form') haptics.error();
    }
  }

  /** Changing the server clears an old "can't reach" message. */
  function chooseServer(mode) {
    setServerMode(mode);
    setErrors((current) => ({ ...current, server: '' }));
  }

  function editCustomUrl(url) {
    setCustomUrl(url);
    setErrors((current) => ({ ...current, server: '' }));
  }

  return {
    serverMode,
    chooseServer,
    customUrl,
    editCustomUrl,
    name,
    setName,
    password,
    setPassword,
    errors,
    status,
    submit,
  };
}
