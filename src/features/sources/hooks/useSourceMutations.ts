import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { deleteSource, type SourceTarget } from '@/api/resources/sources';
import type { SourceDraft } from '@/domain/source/sourceDraft';

import { createSourceFromDraft } from '../model/createFromDraft';

function useInvalidateProjectSources() {
  const queryClient = useQueryClient();
  return (projectId: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.sources.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all }),
    ]);
}

export function useCreateSource(projectId: string, target: SourceTarget) {
  const invalidate = useInvalidateProjectSources();
  return useMutation({
    mutationFn: (draft: SourceDraft) => createSourceFromDraft(projectId, target, draft),
    onSuccess: () => invalidate(projectId),
  });
}

export function useDeleteSource(projectId: string) {
  const invalidate = useInvalidateProjectSources();
  return useMutation({
    mutationFn: (sourceId: string) => deleteSource(projectId, sourceId),
    onSettled: () => invalidate(projectId),
  });
}
