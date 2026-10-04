import type { UploadRules } from '@/domain/upload/fileValidation';

import { useCapabilities } from './CapabilitiesProvider';

/** Правила загрузки из capabilities; null, пока ответ не пришёл. */
export function useUploadRules(): UploadRules | null {
  const { capabilities } = useCapabilities();
  if (!capabilities) return null;
  const { upload } = capabilities;
  return {
    extensions: upload.document_extensions,
    unsupportedExtensions: upload.unsupported_extensions,
    maxSizeBytes: upload.max_size_bytes,
    maxSizeMb: upload.max_size_mb,
  };
}
