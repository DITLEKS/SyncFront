/**
 * Сессия пользователя: хранение токенов и обновление access-токена.
 *
 * Компромисс (нет httpOnly cookie на бэкенде): access-токен живёт только в памяти,
 * refresh-токен — в localStorage, чтобы переживать перезагрузку вкладки.
 * Бэкенд ротирует refresh при каждом обновлении и отзывает старый, поэтому
 * refresh выполняется строго в одном экземпляре на всё приложение (single-flight):
 * параллельные запросы ждут общий промис, новая пара сохраняется атомарно.
 */
import { ApiError, type ErrorBody } from '@/lib/errors';
import { safeStorage } from '@/lib/storage';

import { API_PREFIX, apiBaseUrl } from './config';
import type { TokenResponse } from './types';

export const REFRESH_TOKEN_STORAGE_KEY = 'syncscribe.refresh_token';

/** За сколько секунд до истечения access считаем его «почти протухшим». */
const REFRESH_LEEWAY_SECONDS = 60;

export type AuthSessionEvent = 'tokens' | 'cleared';
export type AuthSessionListener = (event: AuthSessionEvent) => void;

export interface AuthSessionOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  storage?: Pick<typeof safeStorage, 'get' | 'set' | 'remove'>;
  now?: () => number;
  /** Планировщик проактивного обновления; в тестах можно отключить. */
  proactiveRefresh?: boolean;
}

export interface AuthSession {
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  hasRefreshToken(): boolean;
  setTokens(tokens: TokenResponse): void;
  clear(): void;
  /** Обновить пару токенов. Повторный вызов во время обновления вернёт тот же промис. */
  refresh(): Promise<string>;
  /** Access-токен, обновлённый заранее, если он истекает в ближайшую минуту. */
  ensureFreshAccessToken(): Promise<string | null>;
  subscribe(listener: AuthSessionListener): () => void;
}

export function createAuthSession(options: AuthSessionOptions = {}): AuthSession {
  const {
    baseUrl = apiBaseUrl,
    fetchImpl = (...args) => globalThis.fetch(...args),
    storage = safeStorage,
    now = () => Date.now(),
    proactiveRefresh = true,
  } = options;

  let accessToken: string | null = null;
  let accessExpiresAt = 0;
  let refreshToken: string | null = storage.get(REFRESH_TOKEN_STORAGE_KEY);
  let inflight: Promise<string> | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<AuthSessionListener>();

  const emit = (event: AuthSessionEvent) => {
    for (const listener of listeners) listener(event);
  };

  const stopTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const scheduleProactiveRefresh = (expiresInSeconds: number) => {
    stopTimer();
    if (!proactiveRefresh) return;
    const delayMs = Math.max(0, (expiresInSeconds - REFRESH_LEEWAY_SECONDS) * 1000);
    timer = setTimeout(() => {
      timer = null;
      void session.refresh().catch(() => {
        // неудачный refresh уже очистил сессию и уведомил подписчиков
      });
    }, delayMs);
  };

  const isAccessStale = () => accessExpiresAt - now() < REFRESH_LEEWAY_SECONDS * 1000;

  const session: AuthSession = {
    getAccessToken: () => accessToken,
    getRefreshToken: () => refreshToken,
    hasRefreshToken: () => refreshToken !== null,

    setTokens(tokens) {
      accessToken = tokens.access_token;
      accessExpiresAt = now() + tokens.expires_in * 1000;
      refreshToken = tokens.refresh_token;
      storage.set(REFRESH_TOKEN_STORAGE_KEY, tokens.refresh_token);
      scheduleProactiveRefresh(tokens.expires_in);
      emit('tokens');
    },

    clear() {
      stopTimer();
      accessToken = null;
      accessExpiresAt = 0;
      refreshToken = null;
      storage.remove(REFRESH_TOKEN_STORAGE_KEY);
      emit('cleared');
    },

    refresh() {
      if (inflight) return inflight;
      const current = refreshToken;
      if (!current) {
        return Promise.reject(new ApiError(401, { detail: 'Нет refresh-токена' }, new Headers()));
      }
      inflight = (async () => {
        try {
          const response = await fetchImpl(`${baseUrl}${API_PREFIX}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ refresh_token: current }),
          });
          if (!response.ok) {
            const body = (await response.json().catch(() => undefined)) as ErrorBody;
            throw new ApiError(response.status, body, response.headers);
          }
          const tokens = (await response.json()) as TokenResponse;
          session.setTokens(tokens);
          return tokens.access_token;
        } catch (error) {
          // Любая ошибка обновления означает, что продолжить сессию нельзя:
          // старый refresh уже отозван, либо сервер его не принял.
          session.clear();
          throw error;
        } finally {
          inflight = null;
        }
      })();
      return inflight;
    },

    async ensureFreshAccessToken() {
      if (accessToken && !isAccessStale()) return accessToken;
      if (!refreshToken) return accessToken;
      try {
        return await session.refresh();
      } catch {
        return null;
      }
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };

  return session;
}

export const authSession: AuthSession = createAuthSession();
