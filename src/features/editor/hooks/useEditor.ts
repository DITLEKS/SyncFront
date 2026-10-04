import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import {
  exportDocument,
  getEditor,
  resetReview,
  resetSuggestionDecisions,
  saveReview,
} from '@/api/resources/editor';
import type { EditorAggregateResponse, ReviewSaveRequest, ReviewSaveResponse } from '@/api/types';
import { isDocumentStatus } from '@/domain/document/status';
import { isApiError } from '@/lib/errors';

export function useEditorData(projectId: string, documentId: string) {
  return useQuery({
    queryKey: queryKeys.documents.editor(projectId, documentId),
    queryFn: () => getEditor(projectId, documentId),
  });
}

/** Решения меняют статус и счётчики документа везде: в списках, проекте и на дашборде. */
function useInvalidateReview(projectId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
    ]);
}

export function useSaveReview(projectId: string, documentId: string) {
  const invalidate = useInvalidateReview(projectId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ReviewSaveRequest) => saveReview(projectId, documentId, body),
    // Буфер очищается сразу после ответа: без патча кеша решения мигнули бы обратно в pending до перезапроса.
    onSuccess: (result, body) =>
      queryClient.setQueryData<EditorAggregateResponse>(
        queryKeys.documents.editor(projectId, documentId),
        (old) => (old ? applyReviewResult(old, body, result) : old),
      ),
    onSettled: invalidate,
  });
}

export function applyReviewResult(
  editor: EditorAggregateResponse,
  body: ReviewSaveRequest,
  result: ReviewSaveResponse,
): EditorAggregateResponse {
  const decided = new Map((body.decisions ?? []).map((d) => [d.suggestion_id, d.decision]));
  return {
    ...editor,
    document: {
      ...editor.document,
      review_version: result.review_version,
      status: isDocumentStatus(result.document_status)
        ? result.document_status
        : editor.document.status,
    },
    suggestions: editor.suggestions.map((s) => {
      const decision = decided.get(s.id);
      return decision ? { ...s, status: decision } : s;
    }),
    counters: {
      ...editor.counters,
      pending: result.pending_count,
      accepted: editor.counters.accepted + result.accepted_count,
      rejected: editor.counters.rejected + result.rejected_count,
    },
  };
}

export function useResetDecisions(projectId: string, documentId: string) {
  const invalidate = useInvalidateReview(projectId);
  return useMutation({
    mutationFn: (ids: string[]) => resetSuggestionDecisions(projectId, documentId, ids),
    onSettled: invalidate,
  });
}

export function useResetReview(projectId: string, documentId: string) {
  const invalidate = useInvalidateReview(projectId);
  return useMutation({
    mutationFn: () => resetReview(projectId, documentId),
    onSettled: invalidate,
  });
}

export function useExportDocument(projectId: string, documentId: string) {
  return useMutation({
    mutationFn: (fallbackName: string) => exportDocument(projectId, documentId, fallbackName),
    onSuccess: ({ blob, filename }) => downloadBlob(blob, filename),
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Отзываем после клика в следующей задаче: иначе часть браузеров не успевает начать загрузку.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Состояние сервера разошлось с тем, что видит пользователь: 412 — чужое сохранение
 * (review_version), 409 — правки уже решены, документ сменил статус или начался новый анализ.
 */
export function isReviewConflict(error: unknown): boolean {
  return isApiError(error) && (error.status === 412 || error.status === 409);
}
