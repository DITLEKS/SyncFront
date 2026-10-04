import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { queryKeys } from '@/api/queryKeys';
import { trackDocumentOpen } from '@/api/resources/dashboard';

/**
 * Отметить открытие документа один раз на заход на страницу. Ошибка не мешает работе
 * с документом: страдает только блок «Недавние документы».
 */
export function useTrackDocumentOpen(projectId: string, documentId: string, enabled: boolean) {
  const queryClient = useQueryClient();
  const trackedFor = useRef<string | null>(null);

  useEffect(() => {
    const key = `${projectId}/${documentId}`;
    if (!enabled || trackedFor.current === key) return;
    trackedFor.current = key;
    trackDocumentOpen(projectId, documentId)
      .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.recent }))
      .catch(() => undefined);
  }, [projectId, documentId, enabled, queryClient]);
}
