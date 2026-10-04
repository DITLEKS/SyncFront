import { client, ok } from '../client';
import type {
  EditorAggregateResponse,
  PatchSuggestionsResponse,
  ResetResponse,
  ReviewSaveRequest,
  ReviewSaveResponse,
  SuggestionResponse,
} from '../types';

/** Максимум правок на страницу у /editor и /suggestions. */
export const SUGGESTIONS_PAGE_LIMIT = 200;

const path = (projectId: string, documentId: string) => ({
  path: { project_id: projectId, document_id: documentId },
});

async function getEditorPage(
  projectId: string,
  documentId: string,
): Promise<EditorAggregateResponse> {
  return ok(
    await client.GET('/api/v1/projects/{project_id}/documents/{document_id}/editor', {
      params: {
        ...path(projectId, documentId),
        query: { suggestions_limit: SUGGESTIONS_PAGE_LIMIT },
      },
    }),
  );
}

async function listSuggestionsPage(
  projectId: string,
  documentId: string,
  offset: number,
): Promise<{ items: SuggestionResponse[]; total: number }> {
  return ok(
    await client.GET('/api/v1/projects/{project_id}/documents/{document_id}/suggestions', {
      params: { ...path(projectId, documentId), query: { limit: SUGGESTIONS_PAGE_LIMIT, offset } },
    }),
  );
}

/**
 * Агрегат редактора со всеми правками. Буфер решений и разметка текста требуют
 * полного списка, поэтому страницы сверх первой догружаются через /suggestions.
 */
export async function getEditor(
  projectId: string,
  documentId: string,
): Promise<EditorAggregateResponse> {
  const editor = await getEditorPage(projectId, documentId);
  const suggestions = [...editor.suggestions];
  while (suggestions.length < editor.suggestions_total) {
    const page = await listSuggestionsPage(projectId, documentId, suggestions.length);
    if (page.items.length === 0) break;
    suggestions.push(...page.items);
  }
  return { ...editor, suggestions };
}

/** Сохранение решений под оптимистичной блокировкой: при чужом сохранении сервер ответит 412. */
export async function saveReview(
  projectId: string,
  documentId: string,
  body: ReviewSaveRequest,
): Promise<ReviewSaveResponse> {
  return ok(
    await client.PUT('/api/v1/projects/{project_id}/documents/{document_id}/suggestions/review', {
      params: {
        ...path(projectId, documentId),
        header: { 'If-Match': String(body.review_version) },
      },
      body,
    }),
  );
}

/** Вернуть уже сохранённые решения в pending. В ready документ вернётся в awaiting_approval. */
export async function resetSuggestionDecisions(
  projectId: string,
  documentId: string,
  ids: string[],
): Promise<PatchSuggestionsResponse> {
  return ok(
    await client.PATCH('/api/v1/projects/{project_id}/documents/{document_id}/suggestions', {
      params: path(projectId, documentId),
      body: { ids, status: 'pending' },
    }),
  );
}

export async function resetReview(projectId: string, documentId: string): Promise<ResetResponse> {
  return ok(
    await client.POST('/api/v1/projects/{project_id}/documents/{document_id}/editor/reset', {
      params: path(projectId, documentId),
    }),
  );
}

export interface ExportedFile {
  blob: Blob;
  filename: string;
}

/**
 * Скачать документ с принятыми правками. export_format не передаём: сервер
 * отдаёт только исходный формат (R-5).
 */
export async function exportDocument(
  projectId: string,
  documentId: string,
  fallbackName: string,
): Promise<ExportedFile> {
  const result = await client.GET('/api/v1/projects/{project_id}/documents/{document_id}/export', {
    params: path(projectId, documentId),
    parseAs: 'blob',
  });
  const blob = ok<Blob>(result);
  const filename =
    parseContentDispositionFilename(result.response.headers.get('Content-Disposition')) ??
    fallbackName;
  return { blob, filename };
}

/** Имя файла из Content-Disposition: filename* (RFC 5987) приоритетнее filename. */
export function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) return null;
  const extended = /filename\*\s*=\s*([^']*)'[^']*'([^;]+)/i.exec(header);
  if (extended?.[2]) {
    try {
      return decodeURIComponent(extended[2].trim().replace(/^"|"$/g, ''));
    } catch {
      // битое кодирование — пробуем обычный filename
    }
  }
  const plain = /filename\s*=\s*("([^"]*)"|[^;]+)/i.exec(header);
  const value = plain?.[2] ?? plain?.[1];
  return value ? value.trim() : null;
}
