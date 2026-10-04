import { describe, expect, it } from 'vitest';

import {
  DOCUMENT_STATUSES,
  analysisActionLabel,
  documentPolicy,
  isDocumentStatus,
  statusMeta,
} from './status';

describe('statusMeta', () => {
  it('описывает каждый публичный статус', () => {
    for (const status of DOCUMENT_STATUSES) {
      expect(statusMeta[status].label).toBeTruthy();
    }
  });

  it('isDocumentStatus отбрасывает неизвестные значения', () => {
    expect(isDocumentStatus('ready')).toBe(true);
    expect(isDocumentStatus('error')).toBe(false);
    expect(isDocumentStatus(null)).toBe(false);
  });
});

describe('documentPolicy (зеркало DocumentLifecycle)', () => {
  it('источники заблокированы в in_progress и awaiting_approval', () => {
    expect(documentPolicy.canEditSources('draft')).toBe(true);
    expect(documentPolicy.canEditSources('ready')).toBe(true);
    expect(documentPolicy.canEditSources('in_progress')).toBe(false);
    expect(documentPolicy.canEditSources('awaiting_approval')).toBe(false);
  });

  it('повторный анализ из ready требует подтверждения', () => {
    expect(documentPolicy.analysisNeedsConfirmation('ready')).toBe(true);
    expect(documentPolicy.analysisNeedsConfirmation('draft')).toBe(false);
    expect(analysisActionLabel('ready')).toBe('Проверить актуальность');
    expect(analysisActionLabel('draft')).toBe('Анализировать');
  });
});
