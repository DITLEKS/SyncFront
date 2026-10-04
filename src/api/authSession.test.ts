import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { REFRESH_TOKEN_STORAGE_KEY, createAuthSession } from './authSession';
import type { TokenResponse } from './types';

function tokens(overrides: Partial<TokenResponse> = {}): TokenResponse {
  return {
    access_token: 'access-1',
    refresh_token: 'refresh-1',
    token_type: 'bearer',
    expires_in: 3600,
    refresh_expires_in: 86_400,
    ...overrides,
  };
}

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    get: (key: string) => map.get(key) ?? null,
    set: (key: string, value: string) => void map.set(key, value),
    remove: (key: string) => void map.delete(key),
    map,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('createAuthSession', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('хранит access в памяти, refresh — в storage', () => {
    const storage = memoryStorage();
    const session = createAuthSession({ storage, proactiveRefresh: false });
    session.setTokens(tokens());
    expect(session.getAccessToken()).toBe('access-1');
    expect(storage.map.get(REFRESH_TOKEN_STORAGE_KEY)).toBe('refresh-1');
  });

  it('параллельные refresh делают один запрос (single-flight)', async () => {
    const storage = memoryStorage();
    storage.set(REFRESH_TOKEN_STORAGE_KEY, 'refresh-0');
    const fetchImpl = vi.fn(() =>
      Promise.resolve(
        jsonResponse(tokens({ access_token: 'access-2', refresh_token: 'refresh-2' })),
      ),
    );
    const session = createAuthSession({ storage, fetchImpl, proactiveRefresh: false });

    const results = await Promise.all([session.refresh(), session.refresh(), session.refresh()]);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(results).toEqual(['access-2', 'access-2', 'access-2']);
    expect(session.getRefreshToken()).toBe('refresh-2');
    expect(storage.map.get(REFRESH_TOKEN_STORAGE_KEY)).toBe('refresh-2');
  });

  it('после завершения refresh следующий вызов делает новый запрос', async () => {
    const storage = memoryStorage();
    storage.set(REFRESH_TOKEN_STORAGE_KEY, 'refresh-0');
    const fetchImpl = vi.fn(() => Promise.resolve(jsonResponse(tokens())));
    const session = createAuthSession({ storage, fetchImpl, proactiveRefresh: false });
    await session.refresh();
    await session.refresh();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('неудачный refresh очищает сессию и уведомляет подписчиков', async () => {
    const storage = memoryStorage();
    storage.set(REFRESH_TOKEN_STORAGE_KEY, 'refresh-old');
    const fetchImpl = vi.fn(() => Promise.resolve(jsonResponse({ detail: 'Токен отозван' }, 401)));
    const session = createAuthSession({ storage, fetchImpl, proactiveRefresh: false });
    const listener = vi.fn();
    session.subscribe(listener);

    await expect(session.refresh()).rejects.toMatchObject({ status: 401 });
    expect(session.hasRefreshToken()).toBe(false);
    expect(storage.map.has(REFRESH_TOKEN_STORAGE_KEY)).toBe(false);
    expect(listener).toHaveBeenCalledWith('cleared');
  });

  it('ensureFreshAccessToken обновляет токен, если он истекает в ближайшую минуту', async () => {
    const storage = memoryStorage();
    let currentTime = 1_000_000;
    const fetchImpl = vi.fn(() =>
      Promise.resolve(jsonResponse(tokens({ access_token: 'access-fresh' }))),
    );
    const session = createAuthSession({
      storage,
      fetchImpl,
      now: () => currentTime,
      proactiveRefresh: false,
    });
    session.setTokens(tokens({ expires_in: 120 }));

    expect(await session.ensureFreshAccessToken()).toBe('access-1');
    expect(fetchImpl).not.toHaveBeenCalled();

    currentTime += 70_000;
    expect(await session.ensureFreshAccessToken()).toBe('access-fresh');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('проактивно обновляет access за 60 с до истечения', async () => {
    const storage = memoryStorage();
    const fetchImpl = vi.fn(() =>
      Promise.resolve(jsonResponse(tokens({ access_token: 'access-next' }))),
    );
    const session = createAuthSession({ storage, fetchImpl });
    session.setTokens(tokens({ expires_in: 90 }));

    await vi.advanceTimersByTimeAsync(29_000);
    expect(fetchImpl).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(session.getAccessToken()).toBe('access-next');
    session.clear();
  });
});
