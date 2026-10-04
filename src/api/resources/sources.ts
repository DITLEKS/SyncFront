import { client, multipartBody, ok } from '../client';
import type { PageParams, Schemas, SourcePage, SourceResponse } from '../types';

export type SourceScope = Schemas['SourceScopeVO'];

/** Где создаётся источник: для всего проекта или только для одного документа. */
export type SourceTarget = { scope: 'project' } | { scope: 'document'; documentId: string };

function targetFields(target: SourceTarget): { scope: SourceScope; document_id: string | null } {
  return target.scope === 'document'
    ? { scope: 'document', document_id: target.documentId }
    : { scope: 'project', document_id: null };
}

export async function createUrlSource(
  projectId: string,
  target: SourceTarget,
  input: { name: string; url: string },
): Promise<SourceResponse> {
  return ok(
    await client.POST('/api/v1/projects/{project_id}/sources', {
      params: { path: { project_id: projectId } },
      body: { ...targetFields(target), type: 'url', name: input.name, url: input.url },
    }),
  );
}

export async function createNoteSource(
  projectId: string,
  target: SourceTarget,
  input: { name: string; text: string },
): Promise<SourceResponse> {
  return ok(
    await client.POST('/api/v1/projects/{project_id}/sources/note', {
      params: { path: { project_id: projectId } },
      body: { ...targetFields(target), name: input.name, text_content: input.text },
    }),
  );
}

export async function createFileSource(
  projectId: string,
  target: SourceTarget,
  input: { name: string; file: File },
): Promise<SourceResponse> {
  return ok(
    await client.POST('/api/v1/projects/{project_id}/sources/file', {
      params: { path: { project_id: projectId } },
      ...multipartBody<
        Schemas['Body_upload_file_source_api_v1_projects__project_id__sources_file_post']
      >({ ...targetFields(target), name: input.name, file: input.file }),
    }),
  );
}

export async function listSources(
  projectId: string,
  params: PageParams & { scope?: SourceScope } = {},
): Promise<SourcePage> {
  return ok(
    await client.GET('/api/v1/projects/{project_id}/sources', {
      params: { path: { project_id: projectId }, query: params },
    }),
  );
}

/** 423, если источник привязан к документу в in_progress или awaiting_approval. */
export async function deleteSource(projectId: string, sourceId: string): Promise<void> {
  ok(
    await client.DELETE('/api/v1/projects/{project_id}/sources/{source_id}', {
      params: { path: { project_id: projectId, source_id: sourceId } },
    }),
  );
}
