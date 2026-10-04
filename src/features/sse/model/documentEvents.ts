import { type DocumentStatus, isDocumentStatus } from '@/domain/document/status';

export const DOCUMENT_STATUS_CHANGED = 'document_status_changed';

/** Событие смены статуса документа. Других данных в нём нет — остальное перезапрашивается. */
export interface DocumentStatusChanged {
  documentId: string;
  projectId: string;
  status: DocumentStatus;
  currentAnalysisJobId: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Разобрать data события; неизвестный формат или статус — null, чтобы не портить кеш. */
export function parseDocumentStatusChanged(data: string): DocumentStatusChanged | null {
  let payload: unknown;
  try {
    payload = JSON.parse(data);
  } catch {
    return null;
  }
  if (!isRecord(payload)) return null;
  const { document_id, project_id, status, current_analysis_job_id } = payload;
  if (typeof document_id !== 'string' || typeof project_id !== 'string') return null;
  if (!isDocumentStatus(status)) return null;
  const jobId = current_analysis_job_id ?? null;
  if (jobId !== null && typeof jobId !== 'string') return null;
  return {
    documentId: document_id,
    projectId: project_id,
    status,
    currentAnalysisJobId: jobId,
  };
}
