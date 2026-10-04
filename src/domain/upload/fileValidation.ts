/**
 * Клиентская проверка файла перед загрузкой. Правила берутся из /system/capabilities;
 * сервер всё равно проверяет сам (413/415/422), клиент лишь экономит пользователю время.
 */

export interface UploadRules {
  /** Допустимые расширения с точкой, в нижнем регистре: [".docx", ".md", …]. */
  extensions: readonly string[];
  /** Явно неподдерживаемые расширения — для точного сообщения (например, .doc). */
  unsupportedExtensions: readonly string[];
  maxSizeBytes: number;
  maxSizeMb: number;
}

export type FileValidationResult =
  { ok: true } | { ok: false; reason: 'empty' | 'too_large' | 'unsupported'; message: string };

export function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot <= 0 ? '' : fileName.slice(dot).toLowerCase();
}

export function formatExtensions(extensions: readonly string[]): string {
  return extensions.join(', ');
}

export function validateUploadFile(
  file: { name: string; size: number },
  rules: UploadRules,
): FileValidationResult {
  const extension = fileExtension(file.name);
  const allowed = rules.extensions.map((e) => e.toLowerCase());

  if (!allowed.includes(extension)) {
    const explicit = rules.unsupportedExtensions.map((e) => e.toLowerCase()).includes(extension);
    const prefix = explicit
      ? `Формат ${extension} не поддерживается.`
      : `Файл ${extension || 'без расширения'} не поддерживается.`;
    return {
      ok: false,
      reason: 'unsupported',
      message: `${prefix} Допустимые форматы: ${formatExtensions(allowed)}.`,
    };
  }
  if (file.size === 0) {
    return { ok: false, reason: 'empty', message: 'Файл пустой.' };
  }
  if (file.size > rules.maxSizeBytes) {
    return {
      ok: false,
      reason: 'too_large',
      message: `Файл больше ${rules.maxSizeMb} МБ.`,
    };
  }
  return { ok: true };
}

/** Значение атрибута accept для input[type=file]. */
export function acceptAttribute(extensions: readonly string[]): string {
  return extensions.join(',');
}
