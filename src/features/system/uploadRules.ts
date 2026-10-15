import type { UploadRules } from '@/domain/upload/fileValidation';

import { useCapabilities } from './CapabilitiesProvider';

interface ServerUploadCapabilities {
  document_extensions: readonly string[];
  unsupported_extensions: readonly string[];
  max_size_bytes: number;
  max_size_mb: number;
}

/**
 * Безопасные правила на случай, если /system/capabilities временно недоступен.
 * Сервер в любом случае повторно проверяет формат и размер файла.
 */
export const FALLBACK_UPLOAD_RULES: UploadRules = {
  extensions: ['.docx', '.md', '.markdown', '.txt'],
  unsupportedExtensions: ['.doc'],
  maxSizeBytes: 50 * 1024 * 1024,
  maxSizeMb: 50,
};

export function buildUploadRules(upload?: ServerUploadCapabilities): UploadRules {
  if (
    !upload ||
    upload.document_extensions.length === 0 ||
    !Number.isFinite(upload.max_size_bytes) ||
    upload.max_size_bytes <= 0 ||
    !Number.isFinite(upload.max_size_mb) ||
    upload.max_size_mb <= 0
  ) {
    return FALLBACK_UPLOAD_RULES;
  }

  return {
    extensions: upload.document_extensions,
    unsupportedExtensions: upload.unsupported_extensions,
    maxSizeBytes: upload.max_size_bytes,
    maxSizeMb: upload.max_size_mb,
  };
}

/**
 * Правила загрузки из capabilities. Пока ответ загружается или при ошибке запроса
 * возвращаются консервативные значения, поэтому выбор файлов не блокируется навсегда.
 */
export function useUploadRules(): UploadRules {
  const { capabilities } = useCapabilities();
  return buildUploadRules(capabilities?.upload);
}
