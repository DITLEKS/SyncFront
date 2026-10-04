import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys, type MyDocumentsParams } from '@/api/queryKeys';
import { deleteDocument, getDocument, listMyDocuments } from '@/api/resources/documents';
import { getProject, listProjects } from '@/api/resources/projects';

/** Пока в таблице есть документы на анализе, опрашиваем список; на шаге 3 его заменит SSE. */
const ACTIVE_ANALYSIS_POLL_MS = 5000;

export function useMyDocuments(params: MyDocumentsParams) {
  return useQuery({
    queryKey: queryKeys.documents.my(params),
    queryFn: () => listMyDocuments(params),
    placeholderData: keepPreviousData,
    refetchInterval: (query) =>
      query.state.data?.items.some((d) => d.status === 'in_progress')
        ? ACTIVE_ANALYSIS_POLL_MS
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

/** Статус документа после запуска анализа в диалоге загрузки. */
export function useDocumentProgress(projectId: string, documentId: string | null) {
  return useQuery({
    queryKey: queryKeys.documents.detail(projectId, documentId ?? ''),
    queryFn: () => getDocument(projectId, documentId ?? ''),
    enabled: Boolean(documentId),
    refetchInterval: (query) => (query.state.data?.status === 'in_progress' ? 3000 : false),
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
