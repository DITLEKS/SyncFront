import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SseMessage } from '@/lib/sseParser';

import { openRealtimeConnection, type RealtimeState, reconnectDelay } from './connection';

const encoder = new TextEncoder();

interface FakeStream {
  response: Response;
  push: (text: string) => void;
  end: () => void;
}

function fakeStream(): FakeStream {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });
  return {
    response: new Response(body, { headers: { 'Content-Type': 'text/event-stream' } }),
    push: (text) => controller.enqueue(encoder.encode(text)),
    end: () => controller.close(),
  };
}

/** fetch, который отдаёт заранее заготовленные ответы и уважает AbortSignal. */
function scriptedFetch(responses: (() => Response | Promise<Response>)[]) {
  const calls: { headers: Record<string, string> }[] = [];
  const fetchImpl = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ headers: { ...(init?.headers as Record<string, string>) } });
    const next = responses.shift();
    if (!next) return new Promise<Response>(() => undefined);
    const response = await next();
    init?.signal?.addEventListener('abort', () => {
      void response.body?.cancel().catch(() => undefined);
    });
    return response;
  });
  return { fetchImpl: fetchImpl as unknown as typeof fetch, calls };
}

function setup(responses: (() => Response | Promise<Response>)[], refresh = vi.fn()) {
  const { fetchImpl, calls } = scriptedFetch(responses);
  const messages: SseMessage[] = [];
  const states: RealtimeState[] = [];
  const connection = openRealtimeConnection({
    url: '/api/v1/events/documents',
    getAccessToken: () => Promise.resolve('token-1'),
    refreshAccessToken: refresh,
    onMessage: (m) => messages.push(m),
    onStateChange: (s) => states.push(s),
    fetchImpl,
  });
  return { connection, calls, messages, states, fetchImpl };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('reconnectDelay', () => {
  it('удваивает задержку и упирается в потолок', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map((n) => reconnectDelay(n, 1000, 30_000))).toEqual([
      1000, 2000, 4000, 8000, 16_000, 30_000, 30_000,
    ]);
  });
});

describe('openRealtimeConnection', () => {
  it('открывает поток с Bearer-токеном и разбирает события, разорванные между чанками', async () => {
    const stream = fakeStream();
    const { calls, messages, states, connection } = setup([() => stream.response]);
    await vi.advanceTimersByTimeAsync(0);

    expect(calls[0]?.headers.Authorization).toBe('Bearer token-1');
    expect(states).toEqual(['connecting', 'open']);

    stream.push('event: ping\ndata: {}\n\nevent: document_status_changed\ndata: {"a"');
    stream.push(':1}\n\n');
    await vi.advanceTimersByTimeAsync(0);

    expect(messages.map((m) => m.event)).toEqual(['ping', 'document_status_changed']);
    expect(messages[1]?.data).toBe('{"a":1}');
    connection.close();
  });

  it('переподключается с растущей задержкой и сбрасывает её после успешного открытия', async () => {
    const stream = fakeStream();
    const { fetchImpl, states, connection } = setup([
      () => Promise.reject(new TypeError('network')),
      () => new Response(null, { status: 502 }),
      () => stream.response,
    ]);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(999);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(states.at(-1)).toBe('open');

    // После открытия счётчик попыток сброшен: обрыв снова даёт задержку 1 с.
    stream.end();
    await vi.advanceTimersByTimeAsync(0);
    expect(states.at(-1)).toBe('reconnecting');
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    connection.close();
  });

  it('на 401 обновляет токен и сразу повторяет запрос с новым', async () => {
    const stream = fakeStream();
    const refresh = vi.fn(() => Promise.resolve('token-2'));
    const { calls, states, connection } = setup(
      [() => new Response(null, { status: 401 }), () => stream.response],
      refresh,
    );
    await vi.advanceTimersByTimeAsync(0);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(calls.map((c) => c.headers.Authorization)).toEqual(['Bearer token-1', 'Bearer token-2']);
    expect(states.at(-1)).toBe('open');
    connection.close();
  });

  it('если refresh не удался, останавливается без бесконечных попыток', async () => {
    const refresh = vi.fn(() => Promise.reject(new Error('expired')));
    const { fetchImpl, states } = setup([() => new Response(null, { status: 401 })], refresh);
    await vi.advanceTimersByTimeAsync(60_000);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(states.at(-1)).toBe('stopped');
  });

  it('переподключается, если поток молчит дольше 60 с, и не трогает живое соединение', async () => {
    const first = fakeStream();
    const second = fakeStream();
    const { fetchImpl, connection } = setup([() => first.response, () => second.response]);
    await vi.advanceTimersByTimeAsync(0);

    // Пинги каждые 25 с держат соединение живым.
    await vi.advanceTimersByTimeAsync(25_000);
    first.push('event: ping\ndata: {}\n\n');
    await vi.advanceTimersByTimeAsync(50_000);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(10_000);
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    connection.close();
  });

  it('close() прерывает поток и больше не переподключается', async () => {
    const stream = fakeStream();
    const { fetchImpl, states, connection } = setup([() => stream.response]);
    await vi.advanceTimersByTimeAsync(0);
    connection.close();
    await vi.advanceTimersByTimeAsync(120_000);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(states.at(-1)).toBe('stopped');
  });
});

describe('openRealtimeConnection: зависший запрос', () => {
  it('обрывает запрос без ответа по таймауту тишины и пробует снова', async () => {
    const stream = fakeStream();
    let first = true;
    const fetchImpl = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
      if (!first) return Promise.resolve(stream.response);
      first = false;
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('', 'AbortError')));
      });
    });
    const connection = openRealtimeConnection({
      url: '/x',
      getAccessToken: () => Promise.resolve(null),
      refreshAccessToken: () => Promise.reject(new Error('no')),
      onMessage: () => undefined,
      fetchImpl: fetchImpl,
    });
    await vi.advanceTimersByTimeAsync(60_000);
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    connection.close();
  });
});
