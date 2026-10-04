import { HttpResponse, http } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { TEST_TOKENS, TEST_USER } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';

import { authSession } from './authSession';
import { getMe } from './resources/auth';

afterEach(() => {
  authSession.clear();
});

describe('auth middleware клиента', () => {
  it('на 401 делает один refresh и повторяет запросы с новым токеном', async () => {
    let refreshCalls = 0;
    server.use(
      http.get('/api/v1/auth/me', ({ request }) => {
        if (request.headers.get('Authorization') === 'Bearer fresh') {
          return HttpResponse.json(TEST_USER);
        }
        return HttpResponse.json({ detail: 'Токен истёк' }, { status: 401 });
      }),
      http.post('/api/v1/auth/refresh', () => {
        refreshCalls += 1;
        return HttpResponse.json({ ...TEST_TOKENS, access_token: 'fresh' });
      }),
    );
    authSession.setTokens({ ...TEST_TOKENS, access_token: 'stale' });

    const [first, second] = await Promise.all([getMe(), getMe()]);

    expect(first.email).toBe(TEST_USER.email);
    expect(second.email).toBe(TEST_USER.email);
    expect(refreshCalls).toBe(1);
    expect(authSession.getAccessToken()).toBe('fresh');
  });

  it('если refresh не удался, пробрасывает 401 и очищает сессию', async () => {
    server.use(
      http.get('/api/v1/auth/me', () =>
        HttpResponse.json({ detail: 'Токен истёк' }, { status: 401 }),
      ),
      http.post('/api/v1/auth/refresh', () =>
        HttpResponse.json({ detail: 'Refresh отозван' }, { status: 401 }),
      ),
    );
    authSession.setTokens({ ...TEST_TOKENS, access_token: 'stale' });

    await expect(getMe()).rejects.toMatchObject({ status: 401 });
    expect(authSession.hasRefreshToken()).toBe(false);
  });

  it('не зацикливается, если и повтор ответил 401', async () => {
    let meCalls = 0;
    server.use(
      http.get('/api/v1/auth/me', () => {
        meCalls += 1;
        return HttpResponse.json({ detail: 'Нет доступа' }, { status: 401 });
      }),
    );
    authSession.setTokens(TEST_TOKENS);

    await expect(getMe()).rejects.toMatchObject({ status: 401 });
    expect(meCalls).toBe(2);
  });
});
