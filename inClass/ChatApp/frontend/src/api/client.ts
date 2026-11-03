import { AuthCredentials } from '../types/api';

export class ApiError extends Error {
  status: number;
  details?: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Constructs the RAW Plaintext Basic Auth header required by the backend AuthGuard.
 *
 * CRITICAL (see decisions.md D1 & D2):
 * backend/src/auth/auth.guard.ts parses:
 *   const credentials = authHeader.slice(6).trim();
 *   const colonIndex = credentials.indexOf(':');
 * Standard Base64 encoding MUST NOT be used.
 */
export function buildPlaintextBasicAuthHeader(creds: AuthCredentials): string {
  return `Basic ${creds.username.trim()}:${creds.password.trim()}`;
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  path: string;
  query?: Record<string, string | undefined>;
  body?: Record<string, any>;
  credentials: AuthCredentials;
  baseUrl: string;
  timeoutMs?: number;
}

/**
 * Executes an HTTP request against the NestJS backend with timeout and error normalization.
 */
export async function httpRequest<T>({
  method = 'GET',
  path,
  query,
  body,
  credentials,
  baseUrl,
  timeoutMs = 5000,
}: RequestOptions): Promise<T> {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  let url = `${cleanBase}${cleanPath}`;
  if (query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    const qs = params.toString();
    if (qs) {
      url += `?${qs}`;
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      Authorization: buildPlaintextBasicAuthHeader(credentials),
      Accept: 'application/json',
    };

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await response.text();
    let parsed: any = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }

    if (!response.ok) {
      const serverMsg =
        parsed?.message
          ? Array.isArray(parsed.message)
            ? parsed.message.join(', ')
            : String(parsed.message)
          : `HTTP ${response.status}: ${response.statusText}`;
      throw new ApiError(serverMsg, response.status, parsed);
    }

    return parsed as T;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    if (err?.name === 'AbortError') {
      throw new ApiError(
        `Connection timed out after ${timeoutMs}ms reaching ${cleanBase}. Are you on the lab network, or would you like to use Offline Mock Mode?`,
        0,
      );
    }
    throw new ApiError(
      `Cannot reach server at ${cleanBase} (${err?.message || 'Network Error'}). Switch to Offline Mock Mode if outside the lab network.`,
      0,
    );
  } finally {
    clearTimeout(timer);
  }
}

