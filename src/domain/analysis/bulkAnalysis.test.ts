import { describe, expect, it } from 'vitest';

import { bulkCandidates, summarizeBulkResult } from './bulkAnalysis';

describe('bulkCandidates', () => {
  it('берёт только draft и ready', () => {
    const docs = [
      { id: '1', status: 'draft' as const },
      { id: '2', status: 'in_progress' as const },
      { id: '3', status: 'awaiting_approval' as const },
      { id: '4', status: 'ready' as const },
    ];
    expect(bulkCandidates(docs).map((d) => d.id)).toEqual(['1', '4']);
  });
});

describe('summarizeBulkResult', () => {
  it('раскладывает результаты по группам', () => {
    expect(
      summarizeBulkResult([
        { document_id: 'a', job: { id: 'j' } },
        { document_id: 'b', job: null, skip_reason: 'confirmation_required' },
        { document_id: 'c', job: null, skip_reason: 'analysis_running' },
        { document_id: 'd', job: null, skip_reason: null, error: 'Очередь недоступна' },
      ]),
    ).toEqual({
      started: ['a'],
      needsConfirmation: ['b'],
      problems: [
        { documentId: 'c', message: 'анализ уже выполняется' },
        { documentId: 'd', message: 'Очередь недоступна' },
      ],
    });
  });
});
