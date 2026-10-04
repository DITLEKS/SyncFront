import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { queryKeys } from '@/api/queryKeys';
import type { DocumentResponse } from '@/api/types';

import { applyDocumentStatusChanged } from './applyDocumentEvent';

const doc: DocumentResponse = {
  id: 'd1',
  project_id: 'p1',
  name: 'guide.md',
  format: 'markdown',
  size_bytes: 10,
  uploaded_at: '2026-09-10T09:00:00Z',
  status: 'in_progress',
  current_analysis_job_id: 'j1',
  review_version: 0,
  analysis: null,
};

describe('applyDocumentStatusChanged', () => {
  it('патчит деталь документа и помечает зависимые запросы устаревшими', async () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.documents.detail('p1', 'd1'), doc);
    client.setQueryData(queryKeys.documents.my({}), { items: [] });
    client.setQueryData(queryKeys.projects.detail('p1'), { id: 'p1' });
    client.setQueryData(queryKeys.projects.detail('p2'), { id: 'p2' });
    client.setQueryData(queryKeys.dashboard.summary, {});
    client.setQueryData(queryKeys.analysisJobs.detail('p1', 'd1', 'j1'), {});

    await applyDocumentStatusChanged(client, {
      documentId: 'd1',
      projectId: 'p1',
      status: 'awaiting_approval',
      currentAnalysisJobId: 'j1',
    });

    expect(
      client.getQueryData<DocumentResponse>(queryKeys.documents.detail('p1', 'd1'))?.status,
    ).toBe('awaiting_approval');
    const invalidated = (key: readonly unknown[]) => client.getQueryState(key)?.isInvalidated;
    expect(invalidated(queryKeys.documents.my({}))).toBe(true);
    expect(invalidated(queryKeys.projects.detail('p1'))).toBe(true);
    expect(invalidated(queryKeys.projects.detail('p2'))).toBe(false);
    expect(invalidated(queryKeys.dashboard.summary)).toBe(true);
    expect(invalidated(queryKeys.analysisJobs.detail('p1', 'd1', 'j1'))).toBe(true);
  });

  it('не создаёт деталь документа, которой не было в кеше', async () => {
    const client = new QueryClient();
    await applyDocumentStatusChanged(client, {
      documentId: 'd9',
      projectId: 'p1',
      status: 'ready',
      currentAnalysisJobId: null,
    });
    expect(client.getQueryData(queryKeys.documents.detail('p1', 'd9'))).toBeUndefined();
  });
});
