import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from '@/api/resources/projects';
import type { ProjectResponse } from '@/api/types';

export const PROJECTS_PAGE_SIZE = 30;

/** Интервал опроса, пока в проекте идёт анализ; на шаге 3 его заменят SSE-события. */
export const ACTIVE_ANALYSIS_POLL_MS = 5000;

export function useProjectsInfinite() {
  return useInfiniteQuery({
    queryKey: queryKeys.projects.list({ limit: PROJECTS_PAGE_SIZE }),
    queryFn: ({ pageParam }) => listProjects({ limit: PROJECTS_PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last) => {
      const next = last.offset + last.items.length;
      return next < last.total ? next : undefined;
    },
  });
}

/** Страница проекта одним запросом: базовые источники и документы с бейджами источников. */
export function useProjectDetail(projectId: string) {
  return useQuery({
    queryKey: queryKeys.projects.detail(projectId),
    queryFn: () => getProject(projectId, ['documents', 'sources']),
    refetchInterval: (query) =>
      query.state.data?.documents?.some((d) => d.status === 'in_progress')
        ? ACTIVE_ANALYSIS_POLL_MS
        : false,
  });
}

function useInvalidateProjects() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
    ]);
}

export function useCreateProject() {
  const invalidate = useInvalidateProjects();
  return useMutation({
    mutationFn: (input: {
      name: string;
      description: string | null;
      color?: string | null;
      icon?: string | null;
    }) => createProject(input),
    onSuccess: () => invalidate(),
  });
}

export function useRenameProject() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateProjects();
  return useMutation({
    mutationFn: ({ projectId, name }: { projectId: string; name: string }) =>
      updateProject(projectId, { name }),
    onSuccess: (updated) => {
      // Ответ PATCH без include: сохраняем документы и источники из кеша страницы.
      queryClient.setQueryData<ProjectResponse>(queryKeys.projects.detail(updated.id), (old) =>
        old ? { ...old, name: updated.name, description: updated.description } : old,
      );
      void invalidate();
    },
  });
}

export function useUpdateProjectAppearance() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateProjects();
  return useMutation({
    mutationFn: ({
      projectId,
      color,
      icon,
    }: {
      projectId: string;
      color: string;
      icon: string | null;
    }) =>
      // Пустая строка — договорённость API о сбросе иконки к значению по умолчанию.
      updateProject(projectId, { color, icon: icon ?? '' }),
    onSuccess: (updated) => {
      queryClient.setQueryData<ProjectResponse>(queryKeys.projects.detail(updated.id), (old) =>
        old ? { ...old, color: updated.color, icon: updated.icon } : old,
      );
      void invalidate();
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateProjects();
  return useMutation({
    mutationFn: (projectId: string) => deleteProject(projectId),
    onSuccess: (_data, projectId) => {
      queryClient.removeQueries({ queryKey: queryKeys.projects.detail(projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
      void invalidate();
    },
  });
}
