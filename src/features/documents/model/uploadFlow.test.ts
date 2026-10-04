import { describe, expect, it, vi } from 'vitest';

import type { AnalysisJobResponse, DocumentResponse } from '@/api/types';
import type { SourceDraft } from '@/domain/source/sourceDraft';
import { ApiError } from '@/lib/errors';

import { runUploadFlow, type UploadFlowApi } from './uploadFlow';

const doc = { id: 'd1', name: 'guide.md' } as DocumentResponse;
const job = { id: 'j1', status: 'pending' } as AnalysisJobResponse;
const file = new File(['# hi'], 'guide.md');
const draft: SourceDraft = { id: 's', kind: 'url', name: 'wiki', url: 'https://wiki.example.com' };

function api(overrides: Partial<UploadFlowApi> = {}): UploadFlowApi {
  return {
    upload: vi.fn().mockResolvedValue(doc),
    createSource: vi.fn().mockResolvedValue({ id: 'src' }),
    startAnalysis: vi.fn().mockResolvedValue(job),
    ...overrides,
  };
}

describe('runUploadFlow', () => {
  it('загружает файл, создаёт источники с document_id и запускает анализ', async () => {
    const deps = api();
    const result = await runUploadFlow(deps, {
      projectId: 'p',
      file,
      drafts: [draft],
      uploaded: null,
    });
    expect(result).toEqual({ kind: 'started', document: doc, job });
    expect(deps.createSource).toHaveBeenCalledWith(
      'p',
      { scope: 'document', documentId: 'd1' },
      draft,
    );
  });

  it('ошибка загрузки — документ не создан', async () => {
    const deps = api({
      upload: vi
        .fn()
        .mockRejectedValue(
          new ApiError(415, { detail: 'Формат .doc не поддерживается' }, new Headers()),
        ),
    });
    const result = await runUploadFlow(deps, {
      projectId: 'p',
      file,
      drafts: [draft],
      uploaded: null,
    });
    expect(result).toEqual({ kind: 'upload_failed', message: 'Формат .doc не поддерживается' });
    expect(deps.createSource).not.toHaveBeenCalled();
  });

  it('при сбое источника анализ не запускается', async () => {
    const deps = api({
      createSource: vi
        .fn()
        .mockRejectedValue(new ApiError(422, { detail: 'Адрес недоступен' }, new Headers())),
    });
    const result = await runUploadFlow(deps, {
      projectId: 'p',
      file,
      drafts: [draft],
      uploaded: null,
    });
    expect(result).toMatchObject({
      kind: 'sources_failed',
      failed: [{ message: 'Адрес недоступен' }],
    });
    expect(deps.startAnalysis).not.toHaveBeenCalled();
  });

  it('повтор не загружает файл заново', async () => {
    const deps = api();
    await runUploadFlow(deps, { projectId: 'p', file, drafts: [], uploaded: doc });
    expect(deps.upload).not.toHaveBeenCalled();
    expect(deps.startAnalysis).toHaveBeenCalledWith('p', 'd1');
  });

  it('задача в статусе failed (очередь недоступна) — черновик с причиной', async () => {
    const deps = api({
      startAnalysis: vi.fn().mockResolvedValue({
        ...job,
        status: 'failed',
        error_message: 'Очередь недоступна',
      }),
    });
    const result = await runUploadFlow(deps, { projectId: 'p', file, drafts: [], uploaded: null });
    expect(result).toEqual({
      kind: 'analysis_failed',
      document: doc,
      message: 'Очередь недоступна',
    });
  });
});
