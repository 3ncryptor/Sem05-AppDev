'use strict';
// Tiny HTTP client and PASS/FAIL recorder for scripts/smoke.js.

/** @param {string} base e.g. http://127.0.0.1:3100 */
function makeClient(base) {
  async function call(method, path, { token, body, raw, contentType } = {}) {
    const headers = {};
    if (token) headers.authorization = `Bearer ${token}`;
    let payload;
    if (raw !== undefined) {
      payload = raw;
      headers['content-type'] = contentType || 'image/jpeg';
    } else if (body !== undefined) {
      payload = JSON.stringify(body);
      headers['content-type'] = 'application/json';
    }
    const res = await fetch(base + path, { method, headers, body: payload });
    const type = res.headers.get('content-type') || '';
    const text = type.includes('json') ? null : Buffer.from(await res.arrayBuffer());
    const json = text === null ? await res.json() : null;
    return { status: res.status, json, bytes: text, type, data: json && json.data, error: json && json.error };
  }
  return {
    get: (p, o) => call('GET', p, o),
    post: (p, o) => call('POST', p, o),
    put: (p, o) => call('PUT', p, o),
    patch: (p, o) => call('PATCH', p, o),
    del: (p, o) => call('DELETE', p, o),
  };
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function makeRecorder() {
  const results = [];
  async function step(name, fn) {
    try {
      await fn();
      results.push({ name, ok: true });
      process.stdout.write(`PASS  ${name}\n`);
    } catch (err) {
      results.push({ name, ok: false, message: err.message });
      process.stdout.write(`FAIL  ${name}: ${err.message}\n`);
    }
  }
  return { step, results };
}

module.exports = { makeClient, expect, makeRecorder };
