import {
  createFileSource,
  createNoteSource,
  createUrlSource,
  type SourceTarget,
} from '@/api/resources/sources';
import type { SourceResponse } from '@/api/types';
import type { SourceDraft } from '@/domain/source/sourceDraft';
import { getErrorMessage } from '@/lib/errors';

export function createSourceFromDraft(
  projectId: string,
  target: SourceTarget,
  draft: SourceDraft,
): Promise<SourceResponse> {
  switch (draft.kind) {
    case 'url':
      return createUrlSource(projectId, target, { name: draft.name, url: draft.url });
    case 'note':
      return createNoteSource(projectId, target, { name: draft.name, text: draft.text });
    case 'file':
      return createFileSource(projectId, target, { name: draft.name, file: draft.file });
  }
}

export interface DraftFailure {
  draft: SourceDraft;
  message: string;
}

/**
 * Создаёт источники по очереди: так проще сообщить, какой именно не добавился,
 * и не упереться в rate limit. Ошибка одного источника не останавливает остальные.
 */
export async function createSourcesFromDrafts(
  projectId: string,
  target: SourceTarget,
  drafts: SourceDraft[],
): Promise<{ created: SourceResponse[]; failed: DraftFailure[] }> {
  const created: SourceResponse[] = [];
  const failed: DraftFailure[] = [];
  for (const draft of drafts) {
    try {
      created.push(await createSourceFromDraft(projectId, target, draft));
    } catch (error) {
      failed.push({ draft, message: getErrorMessage(error) });
    }
  }
  return { created, failed };
}
