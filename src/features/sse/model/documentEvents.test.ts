import { describe, expect, it } from 'vitest';

import { parseDocumentStatusChanged } from './documentEvents';

describe('parseDocumentStatusChanged', () => {
  it('разбирает payload сервера вместе с вложенным полем event', () => {
    const data = JSON.stringify({
      event: 'document_status_changed',
      document_id: 'd1',
      project_id: 'p1',
      status: 'awaiting_approval',
      current_analysis_job_id: 'j1',
    });
    expect(parseDocumentStatusChanged(data)).toEqual({
      documentId: 'd1',
      projectId: 'p1',
      status: 'awaiting_approval',
      currentAnalysisJobId: 'j1',
    });
  });

  it('отбрасывает битый JSON, неизвестный статус и неполные данные', () => {
    expect(parseDocumentStatusChanged('{')).toBeNull();
    expect(
      parseDocumentStatusChanged(
        JSON.stringify({ document_id: 'd1', project_id: 'p1', status: 'archived' }),
      ),
    ).toBeNull();
    expect(parseDocumentStatusChanged(JSON.stringify({ status: 'ready' }))).toBeNull();
  });

  it('допускает отсутствие текущей задачи', () => {
    const data = JSON.stringify({ document_id: 'd1', project_id: 'p1', status: 'draft' });
    expect(parseDocumentStatusChanged(data)?.currentAnalysisJobId).toBeNull();
  });
});
