import { HttpResponse, http } from 'msw';

import type { CapabilitiesResponse, TokenResponse, UserResponse } from '@/api/types';

export const TEST_USER: UserResponse = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'user@example.com',
  role: 'user',
  created_at: '2026-10-01T10:00:00Z',
};

export const TEST_TOKENS: TokenResponse = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
  refresh_expires_in: 2_592_000,
};

export const TEST_CAPABILITIES: CapabilitiesResponse = {
  upload: {
    max_size_mb: 50,
    max_size_bytes: 52_428_800,
    document_formats: ['docx', 'markdown', 'txt'],
    document_extensions: ['.docx', '.markdown', '.md', '.txt'],
    unsupported_extensions: ['.doc'],
  },
  analysis: {
    idempotency_header: 'Idempotency-Key',
    parallel_jobs_per_document: 1,
    force_required_for_ready: true,
  },
  review: {
    atomic_save_endpoint:
      'PUT /api/v1/projects/{project_id}/documents/{document_id}/suggestions/review',
    optimistic_locking: true,
    version_header: 'If-Match',
  },
  export: {
    endpoint: 'GET /api/v1/projects/{project_id}/documents/{document_id}/export',
    same_format_only: true,
    requires_status: 'ready',
  },
};

export const VALID_PASSWORD = 'Correct-Horse-9';

export const handlers = [
  http.get('/api/v1/system/capabilities', () => HttpResponse.json(TEST_CAPABILITIES)),

  http.post('/api/v1/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (body.email === TEST_USER.email && body.password === VALID_PASSWORD) {
      return HttpResponse.json(TEST_TOKENS);
    }
    return HttpResponse.json({ detail: 'Неверный email или пароль' }, { status: 401 });
  }),

  http.post('/api/v1/auth/register', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (body.password === 'weakweak') {
      return HttpResponse.json(
        {
          detail: [
            {
              loc: ['body', 'password'],
              msg: 'Пароль должен содержать цифру',
              type: 'value_error',
            },
          ],
        },
        { status: 422 },
      );
    }
    return HttpResponse.json({ ...TEST_USER, email: body.email }, { status: 201 });
  }),

  http.post('/api/v1/auth/refresh', async ({ request }) => {
    const body = (await request.json()) as { refresh_token: string };
    if (body.refresh_token === TEST_TOKENS.refresh_token) {
      return HttpResponse.json({ ...TEST_TOKENS, refresh_token: 'refresh-token-2' });
    }
    return HttpResponse.json({ detail: 'Refresh-токен недействителен' }, { status: 401 });
  }),

  http.post('/api/v1/auth/logout', () => new HttpResponse(null, { status: 204 })),

  http.get('/api/v1/auth/me', ({ request }) => {
    const auth = request.headers.get('Authorization');
    if (auth !== `Bearer ${TEST_TOKENS.access_token}`) {
      return HttpResponse.json({ detail: 'Не авторизован' }, { status: 401 });
    }
    return HttpResponse.json(TEST_USER);
  }),
];
