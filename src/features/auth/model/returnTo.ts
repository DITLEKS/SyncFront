export const RETURN_TO_PARAM = 'returnTo';

/** Безопасный returnTo: только относительные пути внутри приложения, без протокола и //host. */
export function sanitizeReturnTo(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}
