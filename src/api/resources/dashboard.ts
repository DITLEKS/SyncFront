import { client, ok } from '../client';
import type { AttentionDocumentItem, DashboardResponse, RecentDocumentItem } from '../types';

export async function getDashboard(): Promise<DashboardResponse> {
  return ok(await client.GET('/api/v1/dashboard'));
}

/** До 4 документов в awaiting_approval, отсортированных по числу непринятых правок. */
export async function getAttentionDocuments(): Promise<AttentionDocumentItem[]> {
  return ok(await client.GET('/api/v1/documents/attention'));
}

/** До 5 последних открытых документов. */
export async function getRecentDocuments(): Promise<RecentDocumentItem[]> {
  return ok(await client.GET('/api/v1/documents/recent'));
}

/** Отметить открытие документа: от этого зависит блок «Недавние документы». */
export async function trackDocumentOpen(projectId: string, documentId: string): Promise<void> {
  ok(
    await client.POST('/api/v1/projects/{project_id}/documents/{document_id}/open', {
      params: { path: { project_id: projectId, document_id: documentId } },
    }),
  );
}
