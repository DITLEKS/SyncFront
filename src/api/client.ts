/**
 * Типизированный HTTP-клиент поверх openapi-fetch.
 *
 * Middleware добавляет Authorization ко всем непубличным запросам, заранее
 * обновляет access-токен, а на 401 делает один refresh и повторяет запрос.
 * Ошибки API превращаются в ApiError функцией ok(), чтобы TanStack Query
 * получал исключение, а не объект {data, error}.
 */
import createClient, { type Middleware } from 'openapi-fetch';

import { ApiError, type ErrorBody } from '@/lib/errors';

import { authSession } from './authSession';
import { PUBLIC_PATHS, apiBaseUrl } from './config';
import type { paths } from './types';

const RETRY_HEADER = 'X-Auth-Retry';

/** Копия запроса на случай повтора после refresh: тело оригинала уже прочитано fetch. */
const retryCopies = new WeakMap<Request, Request>();

export const authMiddleware: Middleware = {
  async onRequest({ request, schemaPath }) {
    if (PUBLIC_PATHS.has(schemaPath)) return undefined;
    const token = await authSession.ensureFreshAccessToken();
    if (token) request.headers.set('Authorization', `Bearer ${token}`);
    if (!request.headers.has(RETRY_HEADER)) retryCopies.set(request, request.clone());
    return undefined;
  },

  async onResponse({ request, response, schemaPath }) {
    if (response.status !== 401 || PUBLIC_PATHS.has(schemaPath)) return undefined;
    const copy = retryCopies.get(request);
    if (!copy || request.headers.has(RETRY_HEADER)) return undefined;

    let token: string;
    try {
      token = await authSession.refresh();
    } catch {
      // сессия очищена, 401 уйдёт наверх — AuthProvider отправит на /login
      return undefined;
    }
    copy.headers.set('Authorization', `Bearer ${token}`);
    copy.headers.set(RETRY_HEADER, '1');
    return globalThis.fetch(copy);
  },
};

export const client = createClient<paths>({
  baseUrl: apiBaseUrl,
  // fetch берём лениво: так его можно подменить (MSW в тестах) после создания клиента.
  fetch: (input) => globalThis.fetch(input),
});
client.use(authMiddleware);

interface FetchResult<T> {
  data?: T;
  error?: unknown;
  response: Response;
}

/** Данные успешного ответа либо ApiError. Для 204 возвращает undefined. */
export function ok<T>(result: FetchResult<T>): T {
  const { data, error, response } = result;
  if (error !== undefined) {
    throw new ApiError(response.status, error as ErrorBody, response.headers);
  }
  if (data === undefined && !response.ok) {
    throw new ApiError(response.status, undefined, response.headers);
  }
  return data as T;
}

type MultipartValue = string | Blob | null | undefined;

/**
 * Опции multipart-запроса для openapi-fetch. В OpenAPI бинарное поле описано как string,
 * поэтому тело типизируем по схеме, а File подставляем при сериализации.
 * Content-Type не задаём: браузер сам проставит boundary.
 */
export function multipartBody<T extends Record<string, unknown>>(fields: {
  [K in keyof T]: K extends 'file' ? File : T[K];
}): { body: T; bodySerializer: (body: T) => FormData } {
  return {
    body: fields as unknown as T,
    bodySerializer: (body) => {
      const form = new FormData();
      for (const [key, value] of Object.entries(body) as [string, MultipartValue][]) {
        if (value === null || value === undefined) continue;
        if (value instanceof File) form.append(key, value, value.name);
        else form.append(key, value);
      }
      return form;
    },
  };
}
