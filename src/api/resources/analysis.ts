import { client, ok } from '../client';
import type { AnalysisJobResponse, BulkAnalysisJobsResponse } from '../types';

export interface StartAnalysisInput {
  projectId: string;
  documentId: string;
  /** UUID v4, генерируется на клик: повторный запрос с тем же ключом вернёт ту же задачу. */
  idempotencyKey: string;
  /** Обязателен для документа в ready, иначе 409 с confirmation_required. */
  force?: boolean;
}

export async function startAnalysis({
  projectId,
  documentId,
  idempotencyKey,
  force = false,
}: StartAnalysisInput): Promise<AnalysisJobResponse> {
  return ok(
    await client.POST('/api/v1/projects/{project_id}/documents/{document_id}/analysis-jobs', {
      params: {
        path: { project_id: projectId, document_id: documentId },
        header: { 'Idempotency-Key': idempotencyKey },
      },
      body: { force },
    }),
  );
}

export async function getAnalysisJob(
  projectId: string,
  documentId: string,
  jobId: string,
): Promise<AnalysisJobResponse> {
  return ok(
    await client.GET(
      '/api/v1/projects/{project_id}/documents/{document_id}/analysis-jobs/{job_id}',
      {
        params: { path: { project_id: projectId, document_id: documentId, job_id: jobId } },
      },
    ),
  );
}

export async function startBulkAnalysis(
  projectId: string,
  body: { document_ids?: string[] | null; force: boolean },
): Promise<BulkAnalysisJobsResponse> {
  return ok(
    await client.POST('/api/v1/projects/{project_id}/documents/analysis-jobs/bulk', {
      params: { path: { project_id: projectId } },
      body,
    }),
  );
}
