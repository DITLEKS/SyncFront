/**
 * Одно долгоживущее SSE-соединение с бэкендом. Нативный EventSource не умеет
 * заголовки, а сервер требует Authorization: Bearer, поэтому fetch + ReadableStream.
 *
 * Правила: переподключение с задержкой 1, 2, 4… до 30 с; на 401 сначала refresh
 * токена; если поток молчит дольше idleTimeoutMs (сервер шлёт ping каждые 25 с),
 * соединение считается мёртвым и открывается заново.
 */
import { createSseParser, type SseMessage } from '@/lib/sseParser';

export type RealtimeState = 'connecting' | 'open' | 'reconnecting' | 'stopped';

export interface RealtimeConnectionOptions {
  url: string;
  /** Актуальный access-токен (с проактивным обновлением). */
  getAccessToken: () => Promise<string | null>;
  /** Обновить токен после 401; ошибка означает, что сессия закончилась. */
  refreshAccessToken: () => Promise<string>;
  onMessage: (message: SseMessage) => void;
  onStateChange?: (state: RealtimeState) => void;
  fetchImpl?: typeof fetch;
  initialDelayMs?: number;
  maxDelayMs?: number;
  idleTimeoutMs?: number;
}

export interface RealtimeConnection {
  close(): void;
}

export const RECONNECT_INITIAL_MS = 1000;
export const RECONNECT_MAX_MS = 30_000;
export const IDLE_TIMEOUT_MS = 60_000;

export function reconnectDelay(attempt: number, initialMs: number, maxMs: number): number {
  return Math.min(maxMs, initialMs * 2 ** attempt);
}

export function openRealtimeConnection(options: RealtimeConnectionOptions): RealtimeConnection {
  const {
    url,
    getAccessToken,
    refreshAccessToken,
    onMessage,
    onStateChange,
    fetchImpl = (...args) => globalThis.fetch(...args),
    initialDelayMs = RECONNECT_INITIAL_MS,
    maxDelayMs = RECONNECT_MAX_MS,
    idleTimeoutMs = IDLE_TIMEOUT_MS,
  } = options;

  let closed = false;
  let attempt = 0;
  let state: RealtimeState | null = null;
  let controller: AbortController | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  // Abort не везде обрывает уже идущее чтение тела, поэтому reader отменяем явно.
  const abortCurrent = () => {
    controller?.abort();
    void reader?.cancel().catch(() => undefined);
  };

  const setState = (next: RealtimeState) => {
    if (state === next) return;
    state = next;
    onStateChange?.(next);
  };

  const clearIdle = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = null;
  };

  const armIdle = () => {
    clearIdle();
    idleTimer = setTimeout(abortCurrent, idleTimeoutMs);
  };

  const scheduleReconnect = () => {
    if (closed) return;
    clearIdle();
    setState('reconnecting');
    const delay = reconnectDelay(attempt, initialDelayMs, maxDelayMs);
    attempt += 1;
    retryTimer = setTimeout(() => void connect(), delay);
  };

  const stop = () => {
    closed = true;
    clearIdle();
    if (retryTimer) clearTimeout(retryTimer);
    abortCurrent();
    setState('stopped');
  };

  const request = async (token: string | null, signal: AbortSignal) =>
    fetchImpl(url, {
      headers: {
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
      signal,
    });

  const connect = async () => {
    if (closed) return;
    if (state !== 'reconnecting') setState('connecting');
    const current = new AbortController();
    controller = current;
    reader = null;
    // Тот же таймаут страхует и от запроса, который повис до получения заголовков.
    armIdle();

    try {
      let response = await request(await getAccessToken(), current.signal);
      if (response.status === 401) {
        let token: string;
        try {
          token = await refreshAccessToken();
        } catch {
          // Сессия закончилась: выход на /login сделает AuthProvider.
          stop();
          return;
        }
        response = await request(token, current.signal);
      }
      if (!response.ok || !response.body) {
        scheduleReconnect();
        return;
      }

      attempt = 0;
      setState('open');
      armIdle();

      const parser = createSseParser();
      const decoder = new TextDecoder();
      const streamReader = response.body.getReader();
      reader = streamReader;
      for (;;) {
        const { value, done } = await streamReader.read();
        if (done) break;
        armIdle();
        for (const message of parser.feed(decoder.decode(value, { stream: true }))) {
          onMessage(message);
        }
      }
      if (!closed) scheduleReconnect();
    } catch {
      // Сюда попадают обрыв сети и abort по таймауту тишины; при close() ничего не делаем.
      if (!closed) scheduleReconnect();
    }
  };

  void connect();
  return { close: stop };
}
