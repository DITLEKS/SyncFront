/**
 * Черновик источника истины до отправки на сервер. Используется в диалогах
 * создания проекта и загрузки документа, где источники копятся локально и
 * создаются отдельными запросами после основного ресурса.
 */

export type SourceDraft =
  | { id: string; kind: 'url'; name: string; url: string }
  | { id: string; kind: 'file'; name: string; file: File }
  | { id: string; kind: 'note'; name: string; text: string };

export const NOTE_MAX_LENGTH = 200_000;
export const SOURCE_NAME_MAX_LENGTH = 255;
export const URL_MAX_LENGTH = 2048;

/**
 * Синтаксическая проверка ссылки на клиенте: только http/https.
 * Запрет приватных адресов проверяет сервер (после DNS-резолва) и отвечает 422/400.
 */
export function validateSourceUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Укажите ссылку';
  if (trimmed.length > URL_MAX_LENGTH) return `Ссылка длиннее ${URL_MAX_LENGTH} символов`;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return 'Некорректная ссылка';
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return 'Поддерживаются только ссылки http и https';
  }
  return null;
}

/** Имя по умолчанию: хост и путь для ссылки, имя файла для файла. */
export function defaultSourceName(input: { url?: string; file?: File }): string {
  if (input.file) return input.file.name.slice(0, SOURCE_NAME_MAX_LENGTH);
  if (input.url) {
    try {
      const { hostname, pathname } = new URL(input.url.trim());
      const path = pathname === '/' ? '' : pathname;
      return `${hostname}${path}`.slice(0, SOURCE_NAME_MAX_LENGTH);
    } catch {
      return input.url.trim().slice(0, SOURCE_NAME_MAX_LENGTH);
    }
  }
  return '';
}
