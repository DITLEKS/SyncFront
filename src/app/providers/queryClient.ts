import { QueryClient } from '@tanstack/react-query';

import { isApiError } from '@/lib/errors';

/** Повторяем только сетевые ошибки и 5xx; клиентские коды (401, 404, 409…) — нет. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  if (isApiError(error)) return error.status >= 500;
  return true;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        staleTime: 30_000,
        refetchOnWindowFocus: true,
      },
      mutations: { retry: false },
    },
  });
}
