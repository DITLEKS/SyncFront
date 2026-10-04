import type { QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import type { DocumentResponse } from '@/api/types';

import type { DocumentStatusChanged } from './documentEvents';

/**
 * Применить смену статуса к кешу. Деталь документа патчится сразу, чтобы экран
 * не мигал старым статусом; всё, что зависит от статуса (списки, счётчики правок,
 * причина ошибки, дашборд), перезапрашивается.
 */
export function applyDocumentStatusChanged(queryClient: QueryClient, event: DocumentStatusChanged) {
  queryClient.setQueryData<DocumentResponse>(
    queryKeys.documents.detail(event.projectId, event.documentId),
    (old) =>
      old
        ? { ...old, status: event.status, current_analysis_job_id: event.currentAnalysisJobId }
        : old,
  );
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.documents.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(event.projectId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.analysisJobs.byDocument(event.projectId, event.documentId),
    }),
  ]);
}

/** После обрыва события могли потеряться: перечитываем всё, что зависит от статусов. */
export function resyncAfterReconnect(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.documents.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.analysisJobs.all }),
  ]);
}
