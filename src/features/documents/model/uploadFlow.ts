import type { SourceTarget } from '@/api/resources/sources';
import type { AnalysisJobResponse, DocumentResponse, SourceResponse } from '@/api/types';
import type { SourceDraft } from '@/domain/source/sourceDraft';
import { getErrorMessage } from '@/lib/errors';

export interface UploadFlowApi {
  upload: (projectId: string, file: File) => Promise<DocumentResponse>;
  createSource: (
    projectId: string,
    target: SourceTarget,
    draft: SourceDraft,
  ) => Promise<SourceResponse>;
  startAnalysis: (projectId: string, documentId: string) => Promise<AnalysisJobResponse>;
}

export interface UploadFlowInput {
  projectId: string;
  file: File;
  /** Источники, которые ещё не созданы на сервере. */
  drafts: SourceDraft[];
  /** Документ уже загружен в прошлой попытке: повторно файл не отправляем. */
  uploaded: DocumentResponse | null;
}

export type UploadFlowResult =
  | { kind: 'upload_failed'; message: string }
  | {
      kind: 'sources_failed';
      document: DocumentResponse;
      failed: { draft: SourceDraft; message: string }[];
    }
  | { kind: 'analysis_failed'; document: DocumentResponse; message: string }
  | { kind: 'started'; document: DocumentResponse; job: AnalysisJobResponse };

/**
 * «Запустить анализ» в диалоге загрузки: файл → специфичные источники → задача анализа.
 * Если источник не добавился, анализ не запускаем: иначе он прошёл бы без части входных
 * данных. Документ при этом уже существует и остаётся черновиком.
 */
export async function runUploadFlow(
  api: UploadFlowApi,
  input: UploadFlowInput,
): Promise<UploadFlowResult> {
  let document = input.uploaded;
  if (!document) {
    try {
      document = await api.upload(input.projectId, input.file);
    } catch (error) {
      return { kind: 'upload_failed', message: getErrorMessage(error) };
    }
  }

  const target: SourceTarget = { scope: 'document', documentId: document.id };
  const failed: { draft: SourceDraft; message: string }[] = [];
  for (const draft of input.drafts) {
    try {
      await api.createSource(input.projectId, target, draft);
    } catch (error) {
      failed.push({ draft, message: getErrorMessage(error) });
    }
  }
  if (failed.length > 0) return { kind: 'sources_failed', document, failed };

  try {
    const job = await api.startAnalysis(input.projectId, document.id);
    // Сбой очереди сервер возвращает не ошибкой, а задачей в статусе failed.
    if (job.status === 'failed') {
      return {
        kind: 'analysis_failed',
        document,
        message: job.error_message ?? 'Не удалось поставить анализ в очередь',
      };
    }
    return { kind: 'started', document, job };
  } catch (error) {
    return { kind: 'analysis_failed', document, message: getErrorMessage(error) };
  }
}
