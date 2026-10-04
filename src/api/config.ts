/**
 * Базовый URL API. В dev пустая строка: запросы идут на тот же origin,
 * а Vite проксирует /api на бэкенд. В prod задаётся через VITE_API_BASE_URL.
 */
const configuredBaseUrl: unknown = import.meta.env.VITE_API_BASE_URL;

export const apiBaseUrl: string =
  typeof configuredBaseUrl === 'string' ? configuredBaseUrl.replace(/\/+$/, '') : '';

export const API_PREFIX = '/api/v1' as const;

/** Пути, которые бэкенд отдаёт без Authorization (см. README SyncBack). */
export const PUBLIC_PATHS: ReadonlySet<string> = new Set([
  `${API_PREFIX}/auth/login`,
  `${API_PREFIX}/auth/register`,
  `${API_PREFIX}/auth/refresh`,
  `${API_PREFIX}/system/capabilities`,
]);
