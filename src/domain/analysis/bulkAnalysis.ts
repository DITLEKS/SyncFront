/**
 * Групповой анализ проекта по «Описанию UI»: берутся документы в draft и ready,
 * awaiting_approval не трогаем (правки ещё не рассмотрены), in_progress уже в работе.
 * Без document_ids сервер включил бы и awaiting_approval, поэтому список передаём явно.
 */
import type { DocumentStatus } from '../document/status';

export const BULK_ANALYZABLE: ReadonlySet<DocumentStatus> = new Set(['draft', 'ready']);

export function bulkCandidates<T extends { id: string; status: DocumentStatus }>(
  documents: T[],
): T[] {
  return documents.filter((d) => BULK_ANALYZABLE.has(d.status));
}

export type BulkSkipReason =
  'confirmation_required' | 'analysis_running' | 'invalid_status' | 'not_found';

interface BulkResultItem {
  document_id: string;
  job?: unknown;
  skip_reason?: string | null;
  error?: string | null;
}

export interface BulkSummary {
  started: string[];
  needsConfirmation: string[];
  /** Пропущенные по другим причинам и ошибки запуска: id → человекочитаемая причина. */
  problems: { documentId: string; message: string }[];
}

const SKIP_MESSAGES: Record<Exclude<BulkSkipReason, 'confirmation_required'>, string> = {
  analysis_running: 'анализ уже выполняется',
  invalid_status: 'документ уже в работе',
  not_found: 'документ не найден',
};

export function summarizeBulkResult(results: BulkResultItem[]): BulkSummary {
  const summary: BulkSummary = { started: [], needsConfirmation: [], problems: [] };
  for (const item of results) {
    if (item.job) {
      summary.started.push(item.document_id);
    } else if (item.skip_reason === 'confirmation_required') {
      summary.needsConfirmation.push(item.document_id);
    } else {
      const reason = item.skip_reason as keyof typeof SKIP_MESSAGES | null | undefined;
      summary.problems.push({
        documentId: item.document_id,
        message:
          item.error ?? (reason ? SKIP_MESSAGES[reason] : undefined) ?? 'не удалось запустить',
      });
    }
  }
  return summary;
}
