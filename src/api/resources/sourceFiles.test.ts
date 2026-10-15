import { afterEach, describe, expect, it, vi } from 'vitest';

import { authSession } from '../authSession';

import { getSourceFile } from './sourceFiles';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mockFileResponse(response: Response) {
  vi.spyOn(authSession, 'ensureFreshAccessToken').mockResolvedValue('access-token');
  const fetcher = vi.fn<(request: Request) => Promise<Response>>().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

describe('getSourceFile', () => {
  it('получает файл через API с Bearer и берёт UTF-8 имя из ответа', async () => {
    const filename = 'Решение.docx';
    const fetcher = mockFileResponse(
      new Response('original bytes', {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        },
      }),
    );

    const result = await getSourceFile('p1', 's1', 'fallback');

    expect(result.filename).toBe(filename);
    expect(await result.blob.text()).toBe('original bytes');
    expect(fetcher).toHaveBeenCalledTimes(1);
    const request = fetcher.mock.calls[0]?.[0];
    expect(request?.url).toMatch(/\/api\/v1\/projects\/p1\/sources\/s1\/file$/);
    expect(request?.headers.get('Authorization')).toBe('Bearer access-token');
    expect(request?.url).not.toContain('seaweedfs');
  });

  it('использует запасное имя, если заголовка нет', async () => {
    mockFileResponse(new Response('file'));
    const result = await getSourceFile('p1', 's1', 'notes.md');
    expect(result.filename).toBe('notes.md');
  });

  it('не сохраняет ошибку сервера как файл', async () => {
    mockFileResponse(
      new Response(JSON.stringify({ detail: 'Источник не найден' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    await expect(getSourceFile('p1', 's1', 'notes.md')).rejects.toMatchObject({ status: 404 });
  });
});
