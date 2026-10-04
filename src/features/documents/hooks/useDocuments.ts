import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys, type MyDocumentsParams } from '@/api/queryKeys';
import { deleteDocument, getDocument, listMyDocuments } from '@/api/resources/documents';
import { getProject, listProjects } from '@/api/resources/projects';
import { REALTIME_FALLBACK_POLL_MS, useRealtimeConnected } from '@/features/sse';

export function useMyDocuments(params: MyDocumentsParams) {
  const realtime = useRealtimeConnected();
  return useQuery({
    queryKey: queryKeys.documents.my(params),
    queryFn: () => listMyDocuments(params),
    placeholderData: keepPreviousData,
    // Статусы приходят по SSE; опрос — только пока соединения нет.
    refetchInterval: (query) =>
      !realtime && query.state.data?.items.some((d) => d.status === 'in_progress')
        ? REALTIME_FALLBACK_POLL_MS
        : false,
  });
}

/** Общее число документов пользователя без фильтров — для счётчика в шапке и пустых состояний. */
export function useMyDocumentsTotal() {
  return useQuery({
    queryKey: queryKeys.documents.my({ limit: 1 }),
    queryFn: () => listMyDocuments({ limit: 1 }),
    select: (page) => page.total,
  });
}

export function useProjectOptions(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.projects.list({ limit: 200 }),
    queryFn: () => listProjects({ limit: 200 }),
    enabled,
  });
}

export function useBaseSources(projectId: string | null) {
  return useQuery({
    queryKey: queryKeys.projects.baseSources(projectId ?? ''),
    queryFn: () => getProject(projectId ?? '', ['sources']),
    enabled: Boolean(projectId),
    select: (project) => project.sources ?? [],
  });
}

/** Документ с живым статусом: SSE патчит кеш, без соединения — запасной опрос. */
export function useDocumentDetail(projectId: string, documentId: string | null) {
  const realtime = useRealtimeConnected();
  return useQuery({
    queryKey: queryKeys.documents.detail(projectId, documentId ?? ''),
    queryFn: () => getDocument(projectId, documentId ?? ''),
    enabled: Boolean(documentId),
    refetchInterval: (query) =>
      !realtime && query.state.data?.status === 'in_progress' ? REALTIME_FALLBACK_POLL_MS : false,
  });
}

export function useInvalidateDocuments() {
  const queryClient = useQueryClient();
  return (projectId: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
    ]);
}

export function useDeleteDocument() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: ({ projectId, documentId }: { projectId: string; documentId: string }) =>
      deleteDocument(projectId, documentId),
    onSuccess: (_data, { projectId }) => invalidate(projectId),
  });
}
