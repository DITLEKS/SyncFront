import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { getDocumentFile } from '@/api/resources/documents';

/**
 * Исходный файл для режима «Оригинал». Запрашивается только когда нужен (enabled),
 * файл неизменен — повторный вход в режим не качает его заново.
 */
export function useDocumentFile(projectId: string, documentId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.documents.file(projectId, documentId),
    queryFn: () => getDocumentFile(projectId, documentId),
    enabled,
    staleTime: Infinity,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}
