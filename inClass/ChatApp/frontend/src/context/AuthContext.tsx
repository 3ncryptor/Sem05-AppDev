import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthCredentials, ConnectionMode, UserResponseDto } from '../types/api';
import { ApiClientConfig, chatApi } from '../api/endpoints';

const SESSION_STORAGE_KEY = '@chatapp_auth_session_v2';
export const DEFAULT_LAB_SERVER_URL = 'http://10.7.1.51:3000';
export const LOCAL_DOCKER_SERVER_URL = 'http://localhost:3000';
export const MAC_LAN_SERVER_URL = 'http://10.7.18.178:3000';
export const CLOUDFLARE_TUNNEL_URL = 'https://excellent-shelf-controlled-std.trycloudflare.com';

/**
 * On physical iOS/Android phones, `localhost` or `127.0.0.1` points to the phone itself
 * and throws `java.net.ConnectException: Failed to connect to localhost/127.0.0.1:3000`.
 * Automatically rewrite `localhost` URLs on native devices to the active Cloudflare HTTPS Tunnel!
 */
export function sanitizeServerUrlForDevice(rawUrl?: string | null): string {
  const trimmed = (rawUrl ?? '').trim();
  if (!trimmed) {
    return Platform.OS === 'web' ? LOCAL_DOCKER_SERVER_URL : CLOUDFLARE_TUNNEL_URL;
  }
  if (
    Platform.OS !== 'web' &&
    (trimmed.includes('localhost') ||
      trimmed.includes('127.0.0.1') ||
      trimmed.includes('10.6.0.106'))
  ) {
    return CLOUDFLARE_TUNNEL_URL;
  }
  return trimmed;
}

interface PersistedSession {
  credentials: AuthCredentials | null;
  currentUser: UserResponseDto | null;
  baseUrl: string;
  mode: ConnectionMode;
}

interface AuthContextValue {
  isHydrated: boolean;
  isAuthenticating: boolean;
  credentials: AuthCredentials | null;
  currentUser: UserResponseDto | null;
  baseUrl: string;
  mode: ConnectionMode;
  apiConfig: ApiClientConfig | null;
  login: (
    creds: AuthCredentials,
    options?: { baseUrl?: string; mode?: ConnectionMode },
  ) => Promise<UserResponseDto>;
  logout: () => Promise<void>;
  setServerConfig: (baseUrl: string, mode: ConnectionMode) => Promise<void>;
  refreshMyProfile: () => Promise<UserResponseDto | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [credentials, setCredentials] = useState<AuthCredentials | null>(null);
  const [currentUser, setCurrentUser] = useState<UserResponseDto | null>(null);
  const [baseUrl, setBaseUrl] = useState<string>(CLOUDFLARE_TUNNEL_URL);
  const [mode, setMode] = useState<ConnectionMode>('live');

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
        if (raw) {
          const parsed: PersistedSession = JSON.parse(raw);
          if (parsed.baseUrl) setBaseUrl(sanitizeServerUrlForDevice(parsed.baseUrl));
          if (parsed.mode) setMode(parsed.mode);
          if (parsed.credentials && parsed.currentUser) {
            setCredentials(parsed.credentials);
            setCurrentUser(parsed.currentUser);
          }
        }
      } catch {
        // Ignore storage read errors
      } finally {
        setIsHydrated(true);
      }
    })();
  }, []);

  const persistSession = useCallback(async (next: PersistedSession) => {
    try {
      await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore write error
    }
  }, []);

  const login = useCallback(
    async (
      creds: AuthCredentials,
      options?: { baseUrl?: string; mode?: ConnectionMode },
    ): Promise<UserResponseDto> => {
      setIsAuthenticating(true);
      const targetUrl = sanitizeServerUrlForDevice(options?.baseUrl ?? baseUrl);
      const targetMode = options?.mode ?? mode;
      const cleanCreds: AuthCredentials = {
        username: creds.username.trim(),
        password: creds.password.trim(),
      };

      try {
        const profile = await chatApi.getProfile({
          mode: targetMode,
          baseUrl: targetUrl,
          credentials: cleanCreds,
        });

        setCredentials(cleanCreds);
        setCurrentUser(profile);
        setBaseUrl(targetUrl);
        setMode(targetMode);

        await persistSession({
          credentials: cleanCreds,
          currentUser: profile,
          baseUrl: targetUrl,
          mode: targetMode,
        });

        return profile;
      } finally {
        setIsAuthenticating(false);
      }
    },
    [baseUrl, mode, persistSession],
  );

  const logout = useCallback(async () => {
    setCredentials(null);
    setCurrentUser(null);
    await persistSession({
      credentials: null,
      currentUser: null,
      baseUrl,
      mode,
    });
  }, [baseUrl, mode, persistSession]);

  const setServerConfig = useCallback(
    async (nextUrl: string, nextMode: ConnectionMode) => {
      const cleanUrl = sanitizeServerUrlForDevice(nextUrl);
      setBaseUrl(cleanUrl);
      setMode(nextMode);
      await persistSession({
        credentials,
        currentUser,
        baseUrl: cleanUrl,
        mode: nextMode,
      });
    },
    [credentials, currentUser, persistSession],
  );

  const refreshMyProfile = useCallback(async () => {
    if (!credentials) return null;
    const profile = await chatApi.getProfile({
      mode,
      baseUrl,
      credentials,
    });
    setCurrentUser(profile);
    await persistSession({
      credentials,
      currentUser: profile,
      baseUrl,
      mode,
    });
    return profile;
  }, [baseUrl, credentials, mode, persistSession]);

  const apiConfig = useMemo<ApiClientConfig | null>(() => {
    if (!credentials) return null;
    return {
      mode,
      baseUrl,
      credentials,
    };
  }, [baseUrl, credentials, mode]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isHydrated,
      isAuthenticating,
      credentials,
      currentUser,
      baseUrl,
      mode,
      apiConfig,
      login,
      logout,
      setServerConfig,
      refreshMyProfile,
    }),
    [
      apiConfig,
      baseUrl,
      credentials,
      currentUser,
      isAuthenticating,
      isHydrated,
      login,
      logout,
      mode,
      refreshMyProfile,
      setServerConfig,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return ctx;
}

