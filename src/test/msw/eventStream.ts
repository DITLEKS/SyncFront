/**
 * Управляемый SSE-поток для тестов: обработчик MSW отдаёт его тело,
 * а тест отправляет события и обрывает соединение.
 */
import { http } from 'msw';

export interface TestEventStream {
  handler: ReturnType<typeof http.get>;
  /** Сколько раз клиент открывал соединение. */
  connections: () => number;
  /** Заголовок Authorization последнего подключения. */
  lastAuthorization: () => string | null;
  send: (event: string, data: unknown) => void;
  /** Закрыть текущее соединение со стороны сервера. */
  drop: () => void;
}

export function createTestEventStream(): TestEventStream {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  let count = 0;
  let authorization: string | null = null;

  const handler = http.get('/api/v1/events/documents', ({ request }) => {
    count += 1;
    authorization = request.headers.get('Authorization');
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        controller = c;
      },
    });
    return new Response(body, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  });

  return {
    handler,
    connections: () => count,
    lastAuthorization: () => authorization,
    send(event, data) {
      controller?.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    },
    drop() {
      controller?.close();
      controller = null;
    },
  };
}
